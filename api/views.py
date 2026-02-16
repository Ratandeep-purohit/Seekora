from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from core.models import WebPage, SearchIndex
from django.db.models import Sum, Q
from django.db import models

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'search': reverse('api-search', request=request, format=format),
        'autocomplete': reverse('api-autocomplete', request=request, format=format),
        'status': 'Online',
        'version': '2.0.0-Enterprise'
    })

from crawler.crawler_engine import SeekoraCrawler
from crawler.query_processor import query_processor
import time

class SearchAPIView(APIView):
    def get(self, request):
        start_time = time.time()
        
        query = request.query_params.get('q', '').strip()
        search_type = request.query_params.get('type', 'all')
        
        if not query:
            return Response({
                'results': [],
                'featured_media': {'images': [], 'videos': []},
                'meta': {'query_time': 0, 'result_count': 0}
            })

        # Process query with NLP
        query_analysis = query_processor.process(query)
        processed_tokens = query_analysis['stemmed_tokens']
        
        # Log query processing
        if query_analysis['corrections']:
            print(f"🔧 Spell corrections: {query_analysis['corrections']}")
        if query_analysis['removed_stopwords']:
            print(f"🗑️ Removed stopwords: {query_analysis['removed_stopwords']}")
        
        # 1. First search local MySQL index
        local_results_count = WebPage.objects.filter(
            index_entries__word__in=processed_tokens
        ).distinct().count()
        
        crawl_stats = None
        # 2. If results < 10 → trigger LIVE CRAWLING
        if local_results_count < 10:
            print(f"🌐 Triggering live crawl (local results: {local_results_count})")
            crawler = SeekoraCrawler()
            crawl_stats = crawler.live_federated_search(query)
            
        # 3. Refetch with newly crawled data
        base_qs = WebPage.objects.filter(
            index_entries__word__in=processed_tokens
        ).distinct()

        if search_type == 'images':
            response_data = self._search_images(base_qs, processed_tokens)
        elif search_type == 'videos':
            response_data = self._search_videos(base_qs, processed_tokens)
        elif search_type == 'news':
            response_data = self._search_news(base_qs, processed_tokens)
        else:
            response_data = self._search_all(base_qs, processed_tokens)
        
        # Add metadata
        query_time = time.time() - start_time
        response_data['meta'] = {
            'query_time': round(query_time, 3),
            'result_count': len(response_data.get('results', [])) + 
                           len(response_data.get('images', [])) + 
                           len(response_data.get('videos', [])),
            'original_query': query,
            'processed_query': ' '.join(processed_tokens),
            'crawl_stats': crawl_stats
        }
        
        return Response(response_data)

    def _search_all(self, qs, words):
        # Multi-Pipeline Parallel Execution
        from crawler.pipelines import NewsPipeline, VideoPipeline
        from concurrent.futures import ThreadPoolExecutor
        
        # 1. Start parallel tasks
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_news = executor.submit(NewsPipeline().search, ' '.join(words))
            future_videos = executor.submit(VideoPipeline().search, ' '.join(words))
            
            # 2. Local Search (Main Thread)
            # Weighted Ranking: Title (10x), Meta (5x), Content (1x)
            # Plus Freshness Boost: (Weight * 1.2) if indexed in last 24 hours
            from django.utils import timezone
            import datetime
            now = timezone.now()
            yesterday = now - datetime.timedelta(days=1)

            results = (
                qs.annotate(
                    base_relevance=Sum('index_entries__weight', filter=Q(index_entries__word__in=words))
                )
                .annotate(
                    relevance=models.Case(
                        models.When(last_indexed__gte=yesterday, then=models.F('base_relevance') * 1.2),
                        default=models.F('base_relevance'),
                        output_field=models.FloatField(),
                    )
                )
                .order_by('-relevance')[:40]
            )
            
            data = []
            global_images = []
            for page in results:
                page_imgs = list(page.images.values('url', 'alt_text')[:3])
                global_images.extend(page_imgs[:2])
                data.append(self._serialize_page(page, page_imgs))
        
        # 3. Collect Results
        news_results = future_news.result()
        video_results = future_videos.result()

        # Return dictionary with full multi-vertical results
        return {
            'results': data,
            'news': news_results[:5],     # Top 5 news
            'videos': video_results[:5],  # Top 5 videos (Live Fetch)
            'images': global_images[:10]  # Featured images (from local index to keep speed)
        }

    def _search_images(self, qs, words):
        # 1. Fetch relevant pages with images
        results = (
            qs.filter(images__isnull=False)
            .annotate(relevance=Sum('index_entries__weight', filter=Q(index_entries__word__in=words)))
            .order_by('-relevance')[:50]
        )
        
        # 2. Score individual images
        scored_images = []
        seen_urls = set()
        query_terms = [w.lower() for w in words]
        
        for page in results:
            # Base page relevance (Only applies to META images)
            page_score = getattr(page, 'relevance', 0) or 0
            
            for img in page.images.all():
                if img.url in seen_urls: continue
                seen_urls.add(img.url)
                
                alt_lower = (img.alt_text or "").lower()
                url_lower = img.url.lower()
                
                # JUNK FILTER: Explicitly skip common junk assets
                if any(x in url_lower for x in ['logo', 'icon', 'button', 'sprite', 'avatar', 'user', 'lock', 'search', 'menu']):
                    continue
                    
                # Strict Scoring Logic
                img_score = 0
                
                # 1. Source Importance
                # OG/Twitter images are trusted to represent the page topic
                if 'og:image' in (img.alt_text or "") or 'twitter:image' in (img.alt_text or ""):
                    img_score = page_score * 0.8  # Default trust
                
                # 2. Content Relevance (The Real Check)
                # Check for query terms in Alt Text
                alt_matches = sum(1 for term in query_terms if term in alt_lower.split())
                if alt_matches > 0:
                    img_score += (alt_matches * 150)  # MASSIVE BOOST for confirmed relevance
                
                # Check for query terms in Filename
                url_matches = sum(1 for term in query_terms if term in url_lower)
                if url_matches > 0:
                    img_score += 50
                    
                # 3. Penalty for "Indiana" vs "India" confusion
                # If query is "India" but alt says "Indiana", penalize
                if 'india' in query_terms and 'indiana' in alt_lower:
                    img_score -= 500
                
                # FILTER: Only keep if it has significant relevance
                # Threshold: Must match at least one term OR be a trusted OG image on a relevant page
                if img_score > 20: 
                    scored_images.append({
                        'data': {
                            'url': img.url,
                            'alt_text': img.alt_text,
                            'parent_url': page.url,
                            'parent_title': page.title
                        },
                        'score': img_score
                    })
        
        # 3. Sort by score and take top results
        scored_images.sort(key=lambda x: x['score'], reverse=True)
        final_images = [item['data'] for item in scored_images[:100]]
        
        return {'results': [], 'images': final_images}

    def _search_news(self, qs, words):
        """Dedicated News Tab Search"""
        from crawler.pipelines import NewsPipeline
        # Fetch MORE news for the tab
        live_news = NewsPipeline().search(' '.join(words))
        return {'results': [], 'news': live_news}

    def _search_videos(self, qs, words):
        """Dedicated Video Tab Search"""
        from crawler.pipelines import VideoPipeline
        # Fetch MORE videos for the tab
        live_videos = VideoPipeline().search(' '.join(words))
        return {'results': [], 'videos': live_videos}

    def _serialize_page(self, page, images):
        return {
            'id': str(page.id),
            'title': page.title,
            'url': page.url,
            'displayUrl': f"{page.domain} › {page.url.split('/')[-1]}",
            'snippet': (page.description or page.content[:200]) + "...",
            'relevance': getattr(page, 'relevance', 0),
            'images': images,
            'videos': list(page.videos.values('url', 'title', 'provider')[:2])
        }

class AutocompleteAPIView(APIView):
    def get(self, request):
        query = request.query_params.get('q', '').lower()
        if not query:
            return Response([])

        # Suggest words from the index that start with the query
        suggestions = (
            SearchIndex.objects.filter(word__istartswith=query)
            .values_list('word', flat=True)
            .distinct()[:8]
        )
        
        return Response(suggestions)
