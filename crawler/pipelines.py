import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import logging
import datetime
from email.utils import parsedate_to_datetime

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
                soup = BeautifulSoup(response.content, features='xml')
                items = soup.find_all('item')
                
                for item in items[:15]:
                    title = item.title.text if item.title else "No Title"
                    link = item.link.text if item.link else ""
                    pub_date = item.pubDate.text if item.pubDate else ""
                    source = item.source.text if item.source else "Google News"
                    description = item.description.text if item.description else ""
                    
                    # Parse Description for Image and Snippet
                    soup_desc = BeautifulSoup(description, 'html.parser')
                    
                    # Extract Image (if present in Google News RSS)
                    img_tag = soup_desc.find('img')
                    thumb_url = img_tag['src'] if img_tag else None
                    
                    # Clean Text
                    # Google News often has "Source - ..." at start, we want the body
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
            # We search specifically for the query + "youtube" to get video links
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query + ' site:youtube.com')}"
            response = requests.get(search_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for link in soup.find_all('a', class_='result__a', href=True):
                    href = link['href']
                    title = link.get_text()
                    
                    if 'youtube.com/watch' in href:
                         # Extract fake thumbnail (standard YT format)
                        try:
                            video_id = href.split('v=')[-1].split('&')[0]
                            # Using high-quality thumbnail
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

        # 2. Fallback: Direct YouTube Search (if DDG returned nothing)
        if len(videos) == 0:
            try:
                # Scrape YouTube Results Page directly (risky but effective as fallback)
                # We use a trick: searching via a piped instance or similar might be easier, 
                # but standard HTML scrape often works for first few results.
                # Actually, simple string matching on the raw response is often more robust than soup for YT due to hydration.
                
                yt_url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
                response = requests.get(yt_url, headers=headers, timeout=5)
                
                if response.status_code == 200:
                    import re
                    # Find video IDs in the raw HTML script data
                    video_ids = re.findall(r"\"videoId\":\"([a-zA-Z0-9_-]{11})\"", response.text)
                    
                    # Deduplicate while preserving order
                    seen = set()
                    unique_ids = []
                    for vid in video_ids:
                        if vid not in seen:
                            seen.add(vid)
                            unique_ids.append(vid)
                    
                    for vid in unique_ids:
                        videos.append({
                            'title': f"{query} - Video", # Fallback title
                            'url': f"https://www.youtube.com/watch?v={vid}",
                            'thumbnail': f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
                            'provider': 'YouTube',
                            'type': 'video',
                            'parent_url': 'www.youtube.com'
                        })
                        
            except Exception as e:
                logger.error(f"YouTube Direct Error: {e}")
            
        logger.info(f"🎥 Found {len(videos)} videos")
        return videos[:50]  # Increased limit to 50+ as requested
