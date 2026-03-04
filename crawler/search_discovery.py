"""
Multi-Source URL Discovery Engine
Uses multiple search engines to discover relevant URLs
"""
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, urlparse
import logging
import time

logger = logging.getLogger(__name__)

class SearchDiscovery:
    """
    Production-grade URL discovery using multiple sources
    Falls back to alternative sources if primary fails
    """
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        self.timeout = 10
    
    def discover_urls(self, query, max_results=20):
        """
        Discover URLs from multiple sources
        Returns list of strings (Backwards Compatible)
        """
        results = self.discover_advanced(query, max_results)
        return [r['url'] for r in results]

    def discover_advanced(self, query, max_results=20):
        """
        Discover rich results from multiple sources
        Returns list of dicts: {'url', 'thumbnail', 'title', 'snippet', 'source'}
        """
        all_results = []
        
        # Try multiple sources in order
        sources = [
            self._discover_google,           # Platinum (Official API)
            self._discover_duckduckgo,       # Primary (High Quality)
            self._discover_duckduckgo_lite,  # Fallback (High Reliability)
        ]
        
        for source_func in sources:
            try:
                if len(all_results) >= max_results:
                    break
                    
                items = source_func(query)
                # Normalize all to current format if they are strings
                formatted_items = []
                for item in items:
                    if isinstance(item, str):
                        formatted_items.append({'url': item, 'source': source_func.__name__})
                    else:
                        formatted_items.append(item)
                        
                all_results.extend(formatted_items)
                logger.info(f"✅ {source_func.__name__}: Found {len(formatted_items)} items")
                
            except Exception as e:
                logger.warning(f"⚠️ {source_func.__name__} failed: {e}")
                continue
        
        # Deduplicate while preserving order
        seen = set()
        unique_results = []
        for res in all_results:
            if res['url'] not in seen:
                seen.add(res['url'])
                unique_results.append(res)
        
        logger.info(f"🔍 Total unique results discovered: {len(unique_results)}")
        return unique_results[:max_results]
    
    def _discover_google(self, query):
        """Official Google Custom Search API Discovery"""
        from django.conf import settings
        results = []
        
        api_key = getattr(settings, 'GOOGLE_API_KEY', None)
        cx = getattr(settings, 'GOOGLE_CX', None)
        
        if not api_key or not cx:
            logger.warning("Google API Key or CX not configured. Skipping.")
            return []
            
        try:
            search_url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': api_key,
                'cx': cx,
                'q': query,
                'num': 10
            }
            
            response = requests.get(search_url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if 'items' in data:
                    for item in data['items']:
                        # Extract thumbnail from pagemap if available
                        thumb = None
                        pagemap = item.get('pagemap', {})
                        if 'cse_thumbnail' in pagemap:
                            thumb = pagemap['cse_thumbnail'][0].get('src')
                        elif 'cse_image' in pagemap:
                            thumb = pagemap['cse_image'][0].get('src')
                            
                        results.append({
                            'url': item['link'],
                            'title': item.get('title'),
                            'snippet': item.get('snippet'),
                            'thumbnail': thumb,
                            'source': 'google'
                        })
                logger.info(f"🚀 Google API found {len(results)} items")
            else:
                logger.error(f"Google API Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"Google Discovery failed: {e}")
            
        return results
    
    def _discover_duckduckgo(self, query):
        """Discover URLs from DuckDuckGo HTML - Enhanced for better diversity"""
        urls = []
        
        try:
            # DuckDuckGo HTML interface
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            response = requests.get(search_url, headers=self.headers, timeout=5)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Method 1: Find result links (primary)
                for link in soup.find_all('a', class_='result__a', href=True):
                    url = link['href']
                    if url.startswith('http') and 'duckduckgo.com' not in url:
                        # Skip if it's just a redirect
                        if '/l/?' not in url:
                            urls.append(url)
                            
            if not urls:
                logger.warning("DDG HTML returned 0 results, likely rate-limited")
                
        except Exception as e:
            logger.error(f"DuckDuckGo discovery failed: {e}")
            
        return urls[:15]

    def _discover_duckduckgo_lite(self, query):
        """Discover URLs from DuckDuckGo Lite (Much more robust against blocking)"""
        urls = []
        try:
            search_url = "https://lite.duckduckgo.com/lite/"
            data = {'q': query}
            # Lite version uses a Form POST usually, or simple GET works too
            # Actually standard Lite is POST for initial query usually, but handles GET
            response = requests.post(search_url, data=data, headers=self.headers, timeout=5)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # In Lite, results are in table rows. Links are class 'result-link'
                for link in soup.find_all('a', class_='result-link', href=True):
                    url = link['href']
                    if url.startswith('http'):
                        urls.append(url)
                        
        except Exception as e:
            logger.error(f"DDG Lite discovery failed: {e}")
            
        logger.info(f"🦆 DDG Lite found {len(urls)} URLs")
        return urls[:15]
    
    def _discover_wikipedia(self, query):
        """Discover URLs from Wikipedia search"""
        urls = []
        
        try:
            # Wikipedia search API
            search_url = f"https://en.wikipedia.org/w/api.php"
            params = {
                'action': 'opensearch',
                'search': query,
                'limit': 5,
                'format': 'json'
            }
            
            response = requests.get(search_url, params=params, headers=self.headers, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                # data[3] contains URLs
                if len(data) > 3:
                    urls = data[3]
        
        except Exception as e:
            logger.error(f"Wikipedia discovery failed: {e}")
        
        return urls
    
    def _discover_github(self, query):
        """Discover URLs from GitHub search (for tech queries)"""
        urls = []
        
        try:
            # GitHub search (no API key needed for basic search)
            search_url = f"https://github.com/search?q={quote_plus(query)}&type=repositories"
            response = requests.get(search_url, headers=self.headers, timeout=self.timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find repository links
                for link in soup.find_all('a', class_='v-align-middle', href=True):
                    url = 'https://github.com' + link['href']
                    if '/search?' not in url:
                        urls.append(url)
        
        except Exception as e:
            logger.error(f"GitHub discovery failed: {e}")
        
        return urls[:5]
    
    def _discover_common_sites(self, query):
        """
        Generate URLs for common authoritative sites
        This ensures we always have some results
        """
        urls = []
        
        # Common authoritative sites by topic
        tech_sites = [
            f"https://stackoverflow.com/search?q={quote_plus(query)}",
            f"https://docs.python.org/3/search.html?q={quote_plus(query)}",
            f"https://developer.mozilla.org/en-US/search?q={quote_plus(query)}",
        ]
        
        general_sites = [
            f"https://en.wikipedia.org/wiki/{quote_plus(query.replace(' ', '_'))}",
        ]
        
        # Detect if query is tech-related
        tech_keywords = ['python', 'javascript', 'java', 'code', 'programming', 'api', 'framework']
        is_tech = any(kw in query.lower() for kw in tech_keywords)
        
        if is_tech:
            urls.extend(tech_sites)
        
        urls.extend(general_sites)
        
        return urls[:5]

# Singleton instance
search_discovery = SearchDiscovery()
