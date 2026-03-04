from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from core.models import WebPage, SearchIndex
from django.db.models import Sum, Q, Count
from django.db import models
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'search': reverse('api-search', request=request, format=format),
        'autocomplete': reverse('api-autocomplete', request=request, format=format),
        'status': 'Online',
        'version': '3.0.0-Google-Edition'
    })

from crawler.crawler_engine import SeekoraCrawler
from crawler.query_processor import query_processor
import time
import requests
import logging

logger = logging.getLogger(__name__)

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
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))

        # 1. First search local MySQL index
        local_results_count = WebPage.objects.filter(
            index_entries__word__in=processed_tokens
        ).distinct().count()
        
        crawl_stats = None
        discovery_results = []
        # 2. If results < 10 → trigger LIVE CRAWLING (ONLY ON PAGE 1)
        if page == 1 and local_results_count < 10:
            print(f"🌐 Triggering live crawl (local results: {local_results_count})")
            crawler = SeekoraCrawler()
            crawl_stats, discovery_results = crawler.live_federated_search(query)
            
        # 3. Refetch with newly crawled data
        base_qs = WebPage.objects.filter(
            index_entries__word__in=processed_tokens
        ).distinct()

        original_query = query
        
        if search_type == 'images':
            response_data = self._search_images(base_qs, processed_tokens, page, limit, original_query)
        elif search_type == 'news':
            response_data = self._search_news(base_qs, processed_tokens, page, limit, original_query)
        elif search_type == 'videos':
            response_data = self._search_videos(base_qs, processed_tokens, page, limit, original_query)
        else:
            response_data = self._search_all(base_qs, processed_tokens, page, limit, discovery_results, original_query)
        
        # Add metadata
        query_time = time.time() - start_time
        response_data['meta'] = {
            'query_time': round(query_time, 3),
            'result_count': response_data.get('count', 0),
            'page': page,
            'limit': limit,
            'original_query': original_query,
            'processed_query': ' '.join(processed_tokens),
            'crawl_stats': crawl_stats,
            'spelling': query_analysis.get('corrections', {}),
        }
        
        return Response(response_data)

    def _get_google_web_results(self, query, start=1, num=10):
        """Fetch web results from Google Custom Search API"""
        from django.conf import settings
        
        api_key = getattr(settings, 'GOOGLE_API_KEY', None)
        cx = getattr(settings, 'GOOGLE_CX', None)
        
        if not api_key or not cx:
            return [], 0
        
        try:
            search_url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': api_key,
                'cx': cx,
                'q': query,
                'start': start,
                'num': min(num, 10),  # Google API max is 10 per request
            }
            
            response = requests.get(search_url, params=params, timeout=8)
            
            if response.status_code == 200:
                data = response.json()
                total = int(data.get('searchInformation', {}).get('totalResults', 0))
                results = []
                
                for item in data.get('items', []):
                    # Extract thumbnail
                    thumb = None
                    pagemap = item.get('pagemap', {})
                    if 'cse_thumbnail' in pagemap:
                        thumb = pagemap['cse_thumbnail'][0].get('src')
                    elif 'cse_image' in pagemap:
                        thumb = pagemap['cse_image'][0].get('src')
                    
                    # Extract favicon
                    favicon = None
                    if 'metatags' in pagemap and pagemap['metatags']:
                        favicon = pagemap['metatags'][0].get('og:image')
                    
                    results.append({
                        'title': item.get('title', ''),
                        'url': item.get('link', ''),
                        'displayUrl': item.get('displayLink', ''),
                        'snippet': item.get('snippet', ''),
                        'thumbnail': thumb,
                        'favicon': favicon,
                        'source': 'google',
                    })
                
                return results, total
            else:
                logger.error(f"Google Web Search Error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Google Web Search failed: {e}")
        
        return [], 0

    def _get_knowledge_panel(self, query):
        """Try to get knowledge panel data from Google"""
        from django.conf import settings
        
        api_key = getattr(settings, 'GOOGLE_API_KEY', None)
        cx = getattr(settings, 'GOOGLE_CX', None)
        
        if not api_key or not cx:
            return None
        
        try:
            search_url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': api_key,
                'cx': cx,
                'q': query,
                'num': 1,
            }
            
            response = requests.get(search_url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for spelling suggestion
                spelling = data.get('spelling', {})
                
                # Try to extract knowledge-like info from first result
                items = data.get('items', [])
                if items:
                    first = items[0]
                    pagemap = first.get('pagemap', {})
                    
                    # Look for rich snippet data
                    metatags = pagemap.get('metatags', [{}])[0] if pagemap.get('metatags') else {}
                    
                    panel = {
                        'title': metatags.get('og:title') or first.get('title', ''),
                        'description': metatags.get('og:description') or first.get('snippet', ''),
                        'image': metatags.get('og:image'),
                        'url': first.get('link', ''),
                        'source': first.get('displayLink', ''),
                    }
                    
                    # Only return if we have meaningful data
                    if panel['description'] and len(panel['description']) > 50:
                        return panel
                        
        except Exception as e:
            logger.error(f"Knowledge panel failed: {e}")
        
        return None

    def _search_all(self, qs, words, page, limit, discovery_results=[], original_query=""):
        from crawler.pipelines import NewsPipeline, VideoPipeline, ImagePipeline
        from concurrent.futures import ThreadPoolExecutor
        
        news_results = []
        video_results = []
        global_images = []
        google_results = []
        google_total = 0
        knowledge_panel = None
        people_also_ask = []

        pipe_query = original_query or ' '.join(words)
        google_start = (page - 1) * limit + 1
        
        # Parallel execution for all data sources
        with ThreadPoolExecutor(max_workers=6) as executor:
            # Always fetch Google web results
            future_google = executor.submit(self._get_google_web_results, pipe_query, google_start, limit)
            
            if page == 1:
                future_news = executor.submit(NewsPipeline().search, pipe_query)
                future_videos = executor.submit(VideoPipeline().search, pipe_query)
                future_images = executor.submit(ImagePipeline().search, pipe_query)
                future_knowledge = executor.submit(self._get_knowledge_panel, pipe_query)
                future_paa = executor.submit(self._get_people_also_ask, pipe_query)
            
            # Collect Google results
            try:
                google_results, google_total = future_google.result(timeout=10)
            except Exception:
                print("Google web search timeout")
            
            if page == 1:
                try:
                    news_results = future_news.result(timeout=4) or []
                except:
                    print("News timeout")
                    
                try:
                    video_results = future_videos.result(timeout=4) or []
                except:
                    print("Video timeout")

                try:
                    platinum_images = future_images.result(timeout=12) or []
                    for p_img in platinum_images[:20]:
                        global_images.append({
                            'url': p_img['url'],
                            'alt_text': p_img.get('title', ''),
                            'thumbnail': p_img.get('thumbnail') or p_img['url'],
                        })
                except:
                    print("Image timeout")

                try:
                    knowledge_panel = future_knowledge.result(timeout=5)
                except:
                    print("Knowledge panel timeout")
                    
                try:
                    people_also_ask = future_paa.result(timeout=5) or []
                except:
                    print("PAA timeout")

        # Fallback to Discovery Thumbnails if Platinum failed
        if page == 1 and not global_images:
            for res in discovery_results:
                if res.get('thumbnail'):
                    global_images.append({
                        'url': res['thumbnail'],
                        'alt_text': res.get('title', ''),
                    })

        # Merge Google results with local results
        # Google results take priority
        data = google_results.copy()
        
        # If Google returned few results, supplement with local
        if len(data) < limit:
            from django.utils import timezone
            import datetime
            now = timezone.now()
            yesterday = now - datetime.timedelta(days=1)

            annotated_qs = (
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
                .order_by('-relevance')
            )

            paginator = Paginator(annotated_qs, limit)
            try:
                results_page = paginator.page(page)
            except (PageNotAnInteger, EmptyPage):
                results_page = []

            google_urls = {r['url'] for r in data}
            if results_page:
                for page_obj in results_page:
                    if page_obj.url not in google_urls:
                        page_imgs = list(page_obj.images.values('url', 'alt_text')[:1])
                        if page == 1 and len(global_images) < 20:
                            global_images.extend(page_imgs)
                        data.append(self._serialize_page(page_obj, page_imgs))
        
        total_count = max(google_total, len(data))
        
        return {
            'results': data[:limit],
            'count': total_count,
            'next': page * limit < total_count,
            'previous': page > 1,
            'news': news_results[:8],
            'videos': video_results[:5],
            'images': global_images[:20],
            'knowledge_panel': knowledge_panel,
            'people_also_ask': people_also_ask,
        }

    def _get_people_also_ask(self, query):
        """Generate 'People Also Ask' style suggestions"""
        suggestions = [
            f"What is {query}?",
            f"How does {query} work?",
            f"Why is {query} important?",
            f"{query} vs alternatives",
        ]
        return suggestions

    def _search_images(self, qs, words, page, limit, original_query=""):
        """Dedicated Image Search Vertical"""
        from crawler.pipelines import ImagePipeline
        pipe_query = original_query or ' '.join(words)
        
        # 1. Primary: Platinum results from Google Search API
        platinum_images = ImagePipeline().search(pipe_query)
        
        # 2. Local: Crawled images from DB
        local_images = []
        local_qs = (
            qs.filter(images__isnull=False)
            .annotate(relevance=Sum('index_entries__weight', filter=Q(index_entries__word__in=words)))
            .order_by('-relevance')
        )
        
        p_limit = 10
        local_paginator = Paginator(local_qs, p_limit)
        try:
            p_chunk = local_paginator.page(1)
            for p in p_chunk:
                for img in p.images.all()[:3]:
                    local_images.append({
                        'url': img.url,
                        'alt_text': img.alt_text or p.title,
                        'thumbnail': img.url,
                        'parent_url': p.url,
                        'parent_title': p.title,
                    })
        except:
            pass

        # Merge (Platinum Priority)
        final_images = []
        seen = set()
        
        for p_img in platinum_images:
            if p_img['url'] not in seen:
                final_images.append({
                    'url': p_img['url'],
                    'alt_text': p_img.get('title', ''),
                    'thumbnail': p_img.get('thumbnail') or p_img['url'],
                    'parent_url': p_img.get('context', ''),
                    'parent_title': p_img.get('title', ''),
                    'width': 0,
                    'height': 0,
                })
                seen.add(p_img['url'])

        for l_img in local_images:
            if l_img['url'] not in seen:
                final_images.append(l_img)
                seen.add(l_img['url'])

        # Manual Pagination
        total = len(final_images)
        start = (page - 1) * limit
        end = start + limit
        
        sliced_results = final_images[start:end] if start < total else []
        
        return {
            'results': [],
            'images': sliced_results,
            'news': [],
            'videos': [],
            'count': total,
            'next': end < total
        }

    def _search_news(self, qs, words, page, limit, original_query=""):
        """Dedicated News Tab Search"""
        from crawler.pipelines import NewsPipeline
        pipe_query = original_query or ' '.join(words)
        live_news = NewsPipeline().search(pipe_query)
        
        total = len(live_news)
        start = (page - 1) * limit
        end = start + limit
        sliced_news = live_news[start:end] if start < total else []
        
        return {
            'results': [], 
            'news': sliced_news, 
            'images': [],
            'videos': [],
            'count': total
        }

    def _search_videos(self, qs, words, page, limit, original_query=""):
        """Dedicated Video Tab Search"""
        from crawler.pipelines import VideoPipeline
        pipe_query = original_query or ' '.join(words)
        live_videos = VideoPipeline().search(pipe_query)
        
        total = len(live_videos)
        start = (page - 1) * limit
        end = start + limit
        sliced_videos = live_videos[start:end] if start < total else []
        
        return {
            'results': [], 
            'videos': sliced_videos, 
            'news': [],
            'images': [],
            'count': total
        }

    def _serialize_page(self, page, images):
        return {
            'id': str(page.id),
            'title': page.title,
            'url': page.url,
            'displayUrl': page.domain,
            'snippet': (page.description or page.content[:200]) + "...",
            'relevance': getattr(page, 'relevance', 0),
            'images': images,
            'videos': list(page.videos.values('url', 'title', 'provider')[:2]),
            'source': 'local',
        }

class AutocompleteAPIView(APIView):
    def get(self, request):
        query = request.query_params.get('q', '').lower()
        if not query:
            return Response([])

        suggestions = (
            SearchIndex.objects.filter(word__istartswith=query)
            .values_list('word', flat=True)
            .distinct()[:8]
        )
        
        return Response(suggestions)
