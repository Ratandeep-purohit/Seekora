import requests
import aiohttp
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, quote_plus, urlunparse
from core.models import WebPage, SearchIndex, ImageMedia, VideoMedia
import re
from django.utils import timezone
from concurrent.futures import ThreadPoolExecutor
import logging
from .robots_parser import RobotsTxtHandler
from .rate_limiter import AdaptiveRateLimiter

logger = logging.getLogger(__name__)

class SeekoraCrawler:
    def __init__(self):
        self.headers = {
            'User-Agent': 'SeekoraBot/2.0 (+https://seekora.ai/bot; contact@seekora.ai)'
        }
        
        # Production components
        self.robots_handler = RobotsTxtHandler(user_agent='SeekoraBot/2.0')
        self.rate_limiter = AdaptiveRateLimiter(default_delay=1.0)
        
        # Stats tracking
        self.stats = {
            'urls_discovered': 0,
            'urls_crawled': 0,
            'urls_blocked': 0,
            'urls_failed': 0,
        }

    def discover_urls(self, query):
        """
        Multi-source URL discovery with guaranteed results
        Uses multiple search engines + fallback to authoritative sites
        """
        try:
            from .search_discovery import search_discovery
            
            # Try multi-source discovery
            urls = search_discovery.discover_urls(query, max_results=20)
            
            # Fallback: If no URLs found, use common authoritative sites
            if not urls:
                logger.warning(f"⚠️ No URLs from search engines, using fallback sites")
                urls = self._get_fallback_urls(query)
            
            # Normalize all URLs
            normalized_urls = [self._normalize_url(url) for url in urls]
            
            self.stats['urls_discovered'] = len(normalized_urls)
            logger.info(f"🔍 Discovered {len(normalized_urls)} URLs for query: {query}")
            return normalized_urls
            
        except Exception as e:
            logger.error(f"❌ Discovery Error: {str(e)}")
            # Emergency fallback
            return self._get_fallback_urls(query)
    
    def _get_fallback_urls(self, query):
        """
        Emergency fallback: Generate URLs for diverse authoritative sites
        This ensures we ALWAYS have varied, high-quality content
        """
        from urllib.parse import quote_plus
        
        fallback_urls = []
        query_encoded = quote_plus(query)
        query_wiki = query.replace(' ', '_')
        query_slug = query.lower().replace(' ', '-')
        
        # Detect query type for better targeting
        tech_keywords = ['python', 'javascript', 'java', 'code', 'programming', 
                        'api', 'framework', 'library', 'tutorial', 'algorithm',
                        'web', 'development', 'software', 'data', 'machine learning',
                        'ai', 'artificial intelligence', 'react', 'vue', 'angular',
                        'django', 'flask', 'node', 'typescript']
        is_tech = any(kw in query.lower() for kw in tech_keywords)
        
        if is_tech:
            # Tech-focused diverse sources
            fallback_urls = [
                # Official Documentation
                f"https://en.wikipedia.org/wiki/{query_wiki}",
                f"https://docs.python.org/3/search.html?q={query_encoded}",
                f"https://developer.mozilla.org/en-US/search?q={query_encoded}",
                
                # Community & Tutorials
                f"https://stackoverflow.com/search?q={query_encoded}",
                f"https://www.geeksforgeeks.org/{query_slug}/",
                f"https://www.tutorialspoint.com/{query_slug}.htm",
                f"https://www.w3schools.com/{query_slug}/",
                
                # Code Repositories
                f"https://github.com/topics/{query_slug}",
                f"https://github.com/search?q={query_encoded}&type=repositories",
                
                # Learning Platforms
                f"https://realpython.com/search?q={query_encoded}",
                f"https://www.freecodecamp.org/news/search/?query={query_encoded}",
                
                # Reference Sites
                f"https://devdocs.io/search?q={query_encoded}",
                f"https://www.programiz.com/{query_slug}/",
            ]
        else:
            # General knowledge diverse sources
            fallback_urls = [
                # Encyclopedias
                f"https://en.wikipedia.org/wiki/{query_wiki}",
                f"https://simple.wikipedia.org/wiki/{query_wiki}",
                f"https://www.britannica.com/search?query={query_encoded}",
                
                # Educational
                f"https://www.khanacademy.org/search?page_search_query={query_encoded}",
                f"https://www.coursera.org/search?query={query_encoded}",
                
                # News & Articles
                f"https://www.sciencedaily.com/search/?keyword={query_encoded}",
                f"https://www.nationalgeographic.com/search?q={query_encoded}",
                
                # Reference
                f"https://www.merriam-webster.com/dictionary/{query_slug}",
            ]
        
        logger.info(f"🔄 Using {len(fallback_urls)} diverse fallback URLs")
        return fallback_urls

    def _normalize_url(self, url):
        """Normalize URL to prevent duplicates (http vs https, www vs non-www)"""
        try:
            parsed = urlparse(url)
            # Force https if no scheme
            scheme = parsed.scheme or 'https'
            # Remove www prefix for consistency
            netloc = parsed.netloc.replace('www.', '')
            # Remove trailing slash
            path = parsed.path.rstrip('/')
            
            normalized = urlunparse((scheme, netloc, path, parsed.params, parsed.query, ''))
            return normalized
        except:
            return url

    def crawl_url(self, url):
        """
        Production-grade crawler with robots.txt compliance and rate limiting
        """
        try:
            # 1. Check robots.txt
            allowed, crawl_delay = self.robots_handler.can_fetch(url)
            if not allowed:
                logger.warning(f"🚫 Blocked by robots.txt: {url}")
                self.stats['urls_blocked'] += 1
                return None
            
            # 2. Rate limiting (respect crawl-delay from robots.txt)
            self.rate_limiter.wait_if_needed(url, custom_delay=crawl_delay)
            
            # 3. Fetch page
            response = requests.get(url, headers=self.headers, timeout=10, allow_redirects=True)
            
            if response.status_code == 200:
                self.rate_limiter.record_success(url)
                self.stats['urls_crawled'] += 1
                logger.info(f"✅ Crawled: {url}")
                return self._process_page(url, response.text)
            else:
                logger.warning(f"⚠️ HTTP {response.status_code}: {url}")
                self.stats['urls_failed'] += 1
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"⏱️ Timeout: {url}")
            self.rate_limiter.record_error(url)
            self.stats['urls_failed'] += 1
            return None
        except Exception as e:
            logger.error(f"❌ Crawl failed for {url}: {str(e)}")
            self.rate_limiter.record_error(url)
            self.stats['urls_failed'] += 1
            return None

    def _process_page(self, url, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Metadata Extraction
        title = (soup.title.string if soup.title else "") or url
        desc_tag = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
        description = desc_tag['content'] if desc_tag and desc_tag.has_attr('content') else ""
        
        # Content Cleaning
        for s in soup(["script", "style", "nav", "footer", "header"]):
            s.extract()
        text = soup.get_text(separator=' ')
        clean_text = re.sub(r'\s+', ' ', text).strip()
        
        # Persistent Storage
        page, _ = WebPage.objects.update_or_create(
            url=url,
            defaults={
                'title': title[:500],
                'description': description[:500],
                'content': clean_text,
                'domain': urlparse(url).netloc,
                'last_indexed': timezone.now()
            }
        )
        
        # Image Assets (High-Quality Extraction)
        img_objs = []
        seen_imgs = set()
        
        # 1. Extract High-Res Meta Images (Highest Priority)
        meta_images = []
        
        # Open Graph
        og_img = soup.find('meta', property='og:image')
        if og_img and og_img.get('content'):
            meta_images.append({
                'url': og_img['content'],
                'alt': soup.find('meta', property='og:image:alt').get('content') if soup.find('meta', property='og:image:alt') else title,
                'source': 'og:image'
            })
            
        # Twitter Card
        tw_img = soup.find('meta', attrs={'name': 'twitter:image'})
        if tw_img and tw_img.get('content'):
            meta_images.append({
                'url': tw_img['content'],
                'alt': soup.find('meta', attrs={'name': 'twitter:image:alt'}).get('content') if soup.find('meta', attrs={'name': 'twitter:image:alt'}) else title,
                'source': 'twitter:image'
            })
            
        # Add Meta Images first (guaranteed quality)
        for meta in meta_images:
            i_url = urljoin(url, meta['url'])
            if i_url not in seen_imgs:
                img_objs.append(ImageMedia(page=page, url=i_url, alt_text=meta['alt'][:500]))
                seen_imgs.add(i_url)

        # 2. Extract Content Images with Strict Filtering
        ignore_keywords = ['icon', 'logo', 'button', 'btn', 'nav', 'menu', 'sprite', 'pixel', 'blank', 'spacer', 'loader', 'avatar', 'thumb', 'footer', 'header']
        
        for img in soup.find_all('img', src=True):
            src = img['src']
            if not src: continue
            
            i_url = urljoin(url, src)
            if not i_url.startswith('http'): continue
            if i_url in seen_imgs: continue
            
            lower_url = i_url.lower()
            
            # Filter A: File Extension
            if not any(ext in lower_url for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                continue
                
            # Filter B: Keywords
            if any(k in lower_url for k in ignore_keywords):
                continue
                
            # Filter C: Dimensions (if available)
            try:
                width = int(img.get('width', 0))
                height = int(img.get('height', 0))
                
                # Reject if explicitly small
                if (width > 0 and width < 400) or (height > 0 and height < 300):
                    continue
                    
                # Prioritize large images
                is_large = (width >= 800 and height >= 600)
            except ValueError:
                is_large = False
                
            # Filter D: Aspect Ratio (skip extreme panoramas or skyscrapers unless typical)
            # (Hard to check without dimensions, skipping for now)

            # Filter E: Alt Text Relevance
            alt = img.get('alt', '').strip()
            if not alt and not is_large:
                # Skip if no alt text AND not explicitly large (likely decorative)
                continue
                
            # Add to list
            img_objs.append(ImageMedia(page=page, url=i_url, alt_text=alt[:500]))
            seen_imgs.add(i_url)
            
            # Limit per page
            if len(img_objs) >= 15:
                break
                
        ImageMedia.objects.filter(page=page).delete()
        ImageMedia.objects.bulk_create(img_objs, ignore_conflicts=True)

        # Video Assets (Enhanced)
        vid_objs = []
        
        # 1. Extract from iframes (YouTube, Vimeo embeds)
        for iframe in soup.find_all('iframe', src=True):
            src = iframe['src']
            if any(p in src for p in ['youtube.com', 'youtu.be', 'vimeo.com']):
                vid_objs.append(VideoMedia(
                    page=page,
                    url=src,
                    provider=self._detect_video_provider(src),
                    title=iframe.get('title', '')[:500]
                ))
        
        # 2. Extract from <video> tags
        for video_tag in soup.find_all('video'):
            sources = video_tag.find_all('source', src=True)
            if sources:
                vid_url = urljoin(url, sources[0]['src'])
                vid_objs.append(VideoMedia(
                    page=page,
                    url=vid_url,
                    provider='html5',
                    title=video_tag.get('title', '')[:500]
                ))
        
        # 3. Extract YouTube/Vimeo links from <a> tags
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'youtube.com/watch' in href or 'youtu.be/' in href or 'vimeo.com/' in href:
                vid_objs.append(VideoMedia(
                    page=page,
                    url=href,
                    provider=self._detect_video_provider(href),
                    title=link.get_text(strip=True)[:500] or page.title
                ))
        
        VideoMedia.objects.filter(page=page).delete()
        VideoMedia.objects.bulk_create(vid_objs[:15], ignore_conflicts=True)  # Limit to 15 videos

        # Multi-Field Weighted Indexing
        SearchIndex.objects.filter(page=page).delete()
        self._index_section(page, title, 'title', 10.0)
        self._index_section(page, description, 'meta', 5.0)
        self._index_section(page, " ".join([o.alt_text for o in img_objs if o.alt_text]), 'media_alt', 3.0)
        self._index_section(page, clean_text, 'content', 1.0)
        
        return page

    def _index_section(self, page, text, field, boost):
        if not text: return
        words = re.findall(r'\w+', text.lower())
        counts = {}
        for w in words:
            if len(w) > 2: counts[w] = counts.get(w, 0) + 1
        
        tokens = [SearchIndex(page=page, word=w, field_type=field, frequency=c, weight=c*boost) for w, c in counts.items()]
        SearchIndex.objects.bulk_create(tokens, ignore_conflicts=True)
    
    def _detect_video_provider(self, url):
        """Detect video provider from URL"""
        if 'youtube.com' in url or 'youtu.be' in url:
            return 'youtube'
        elif 'vimeo.com' in url:
            return 'vimeo'
        elif 'dailymotion.com' in url:
            return 'dailymotion'
        else:
            return 'embedded'

    def live_federated_search(self, query):
        """
        Triggers discovery and parallel indexing if local results are low
        Returns crawl statistics
        """
        # Reset stats
        self.stats = {
            'urls_discovered': 0,
            'urls_crawled': 0,
            'urls_blocked': 0,
            'urls_failed': 0,
        }
        
        urls = self.discover_urls(query)
        if not urls:
            logger.warning(f"⚠️ No URLs discovered for query: {query}")
            return self.stats
        
        # Use ThreadPool to simulate async within a Django request context (safe & simple)
        with ThreadPoolExecutor(max_workers=10) as executor:
            executor.map(self.crawl_url, urls)
        
        logger.info(f"📊 Crawl Stats: {self.stats}")
        return self.stats

