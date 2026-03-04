import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import logging
import datetime
from email.utils import parsedate_to_datetime
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class NewsPipeline:
    """
    Fetches real-time news from Google News RSS
    Behaves like a 'Live News' vertical
    """
    def search(self, query):
        articles = []
        try:
            # Google News RSS Search
            rss_url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
            response = requests.get(rss_url, timeout=5)
            
            if response.status_code == 200:
                # Use lxml if available, otherwise fallback
                try:
                    soup = BeautifulSoup(response.content, features='xml')
                except:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                items = soup.find_all(['item', 'ITEM'])
                
                for item in items[:20]: # Increased to 20
                    title = item.find(['title', 'TITLE'])
                    title = title.text if title else "No Title"
                    
                    link = item.find(['link', 'LINK'])
                    link = link.text if link else ""
                    
                    pub_date = item.find(['pubDate', 'pubdate', 'PUBDATE'])
                    pub_date = pub_date.text if pub_date else ""
                    
                    source = item.find(['source', 'SOURCE'])
                    source = source.text if source else "Google News"
                    
                    description = item.find(['description', 'DESCRIPTION'])
                    description = description.text if description else ""
                    
                    # Parse Description for Image and Snippet
                    soup_desc = BeautifulSoup(description, 'html.parser')
                    
                    # Extract Image (if present in Google News RSS)
                    img_tag = soup_desc.find('img')
                    thumb_url = img_tag['src'] if img_tag else None
                    
                    # Clean Text
                    clean_desc = soup_desc.get_text()
                    
                    # Simple relative time calculation
                    try:
                        dt = parsedate_to_datetime(pub_date)
                        now = datetime.datetime.now(dt.tzinfo)
                        diff = now - dt
                        if diff.days == 0:
                            if diff.seconds < 3600:
                                time_str = f"{diff.seconds // 60}m ago"
                            else:
                                time_str = f"{diff.seconds // 3600}h ago"
                        else:
                            time_str = f"{diff.days}d ago"
                    except:
                        time_str = pub_date[:16]

                    if link:
                        articles.append({
                            'title': title,
                            'url': link,
                            'source': source,
                            'time': time_str,
                            'snippet': clean_desc[:150] + "..." if len(clean_desc) > 20 else "",
                            'thumbnail': thumb_url,
                            'type': 'news'
                        })
                        
        except Exception as e:
            logger.error(f"News Pipeline Error: {e}")
            
        return articles

class VideoPipeline:
    """
    Fetches video results simulating a Video Search Engine
    Strategy: 
    1. Try DuckDuckGo Video Search (Fast, clean)
    2. Fallback to YouTube Search HTML (Reliable)
    """
    def search(self, query):
        videos = []
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        try:
            # 1. Primary: DuckDuckGo HTML Video Search
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query + ' site:youtube.com')}"
            response = requests.get(search_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for link in soup.find_all('a', class_='result__a', href=True):
                    href = link['href']
                    title = link.get_text()
                    
                    if 'youtube.com/watch' in href:
                        try:
                            video_id = href.split('v=')[-1].split('&')[0]
                            thumb_url = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                            
                            videos.append({
                                'title': title,
                                'url': href,
                                'thumbnail': thumb_url,
                                'provider': 'YouTube',
                                'type': 'video',
                                'parent_url': 'www.youtube.com'
                            })
                        except:
                            continue
                            
        except Exception as e:
            logger.error(f"DDG Video Error: {e}")

        # 2. Fallback: Direct YouTube Search
        if len(videos) == 0:
            try:
                yt_url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
                response = requests.get(yt_url, headers=headers, timeout=5)
                
                if response.status_code == 200:
                    import re
                    video_ids = re.findall(r"\"videoId\":\"([a-zA-Z0-9_-]{11})\"", response.text)
                    
                    seen = set()
                    unique_ids = []
                    for vid in video_ids:
                        if vid not in seen:
                            seen.add(vid)
                            unique_ids.append(vid)
                    
                    for vid in unique_ids:
                        videos.append({
                            'title': f"{query} - Video",
                            'url': f"https://www.youtube.com/watch?v={vid}",
                            'thumbnail': f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
                            'provider': 'YouTube',
                            'type': 'video',
                            'parent_url': 'www.youtube.com'
                        })
                        
            except Exception as e:
                logger.error(f"YouTube Direct Error: {e}")
            
        logger.info(f"🎥 Found {len(videos)} videos")
        return videos[:50]

class ImagePipeline:
    """
    Vertical Image Search Engine
    Uses Google Custom Search API with PAGINATION for maximum results
    Makes multiple API calls (start=1, start=11, start=21) to get 30 images
    Post-processes to remove irrelevant images (logos, icons) and re-ranks by query relevance
    """
    
    # Junk title patterns - images with these in their title are usually logos/icons
    JUNK_PATTERNS = [
        'logo', 'icon', 'favicon', 'banner', 'advertisement', 'ad banner',
        'placeholder', 'spacer', 'loading', 'spinner', 'arrow', 'button',
        'avatar default', 'thumbnail placeholder', 'stock photo watermark',
    ]
    
    def search(self, query):
        from django.conf import settings
        all_images = []
        
        api_key = getattr(settings, 'GOOGLE_API_KEY', None)
        cx = getattr(settings, 'GOOGLE_CX', None)
        
        if not api_key or not cx:
            logger.warning("Google API Key or CX not configured for Image Search.")
            return self._fallback_search(query)

        query_words = set(query.lower().split())

        def fetch_page(start):
            try:
                search_url = "https://www.googleapis.com/customsearch/v1"
                params = {
                    'key': api_key,
                    'cx': cx,
                    'q': query,
                    'searchType': 'image',
                    'num': 10,
                    'start': start,
                    'imgType': 'photo',    # CRITICAL: excludes logos, clipart, icons
                    'imgSize': 'medium',   # medium = good quality but more results than 'large'
                    'safe': 'active',
                }
                
                response = requests.get(search_url, params=params, timeout=8)
                
                if response.status_code == 200:
                    data = response.json()
                    page_images = []
                    if 'items' in data:
                        for item in data['items']:
                            title = item.get('title', '')
                            url = item['link']
                            
                            # FILTER 1: Skip URLs that are clearly not actual photos
                            url_lower = url.lower()
                            if any(skip in url_lower for skip in ['/logo', '/icon', '/favicon', '/sprite', '/widget', '/badge']):
                                continue
                            
                            # FILTER 2: Skip images with junk-like titles
                            title_lower = title.lower()
                            if any(junk in title_lower for junk in self.JUNK_PATTERNS):
                                # But don't skip if the query itself is about logos
                                if 'logo' not in query.lower():
                                    continue
                            
                            # FILTER 3: Skip very small images (likely icons)
                            width = item.get('image', {}).get('width', 0)
                            height = item.get('image', {}).get('height', 0)
                            if width > 0 and height > 0 and (width < 100 or height < 100):
                                continue
                            
                            # Calculate relevance score based on how many query words appear in title
                            relevance = 0
                            for word in query_words:
                                if word in title_lower:
                                    relevance += 1
                            # Bonus for exact phrase match
                            if query.lower() in title_lower:
                                relevance += 5
                            
                            page_images.append({
                                'url': url,
                                'thumbnail': item.get('image', {}).get('thumbnailLink'),
                                'title': title,
                                'context': item.get('image', {}).get('contextLink', ''),
                                'width': width,
                                'height': height,
                                'type': 'image',
                                'source': 'google',
                                '_relevance': relevance,
                            })
                    return page_images
                else:
                    logger.error(f"Google Image API Error (start={start}): {response.status_code} - {response.text[:200]}")
                    return []
            except Exception as e:
                logger.error(f"Image Pipeline page {start} failed: {e}")
                return []

        # Parallel fetch 5 pages (start=1, 11, 21, 31, 41) = up to 50 images
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(fetch_page, 1),
                executor.submit(fetch_page, 11),
                executor.submit(fetch_page, 21),
                executor.submit(fetch_page, 31),
                executor.submit(fetch_page, 41),
            ]
            for future in futures:
                try:
                    page_results = future.result(timeout=10)
                    all_images.extend(page_results)
                except Exception as e:
                    logger.error(f"Image page future failed: {e}")

        # Deduplicate
        seen = set()
        unique_images = []
        for img in all_images:
            if img['url'] not in seen:
                seen.add(img['url'])
                unique_images.append(img)

        # RE-RANK: Sort by relevance (most relevant titles first)
        unique_images.sort(key=lambda x: x.get('_relevance', 0), reverse=True)
        
        # Remove internal _relevance field before returning
        for img in unique_images:
            img.pop('_relevance', None)

        logger.info(f"🖼️ Google Image API found {len(unique_images)} total unique items (after filtering)")
        
        # If Google returned very few, add fallback
        if len(unique_images) < 10:
            fallback = self._fallback_search(query)
            for fb in fallback:
                if fb['url'] not in seen:
                    unique_images.append(fb)
                    seen.add(fb['url'])
        
        return unique_images

    def _fallback_search(self, query):
        """Fallback: Search DuckDuckGo for images"""
        images = []
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        try:
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query + ' images')}"
            response = requests.get(search_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                for link in soup.find_all('a', class_='result__a', href=True):
                    href = link['href']
                    title = link.get_text()
                    if any(ext in href.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']):
                        images.append({
                            'url': href,
                            'thumbnail': href,
                            'title': title,
                            'context': '',
                            'type': 'image',
                            'source': 'duckduckgo'
                        })
        except Exception as e:
            logger.error(f"DDG Image fallback failed: {e}")
        
        return images[:20]
