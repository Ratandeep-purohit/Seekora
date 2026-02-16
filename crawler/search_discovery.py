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
        Returns list of unique URLs
        """
        all_urls = []
        
        # Try multiple sources in order
        sources = [
            self._discover_duckduckgo,
            self._discover_wikipedia,
            self._discover_github,
        ]
        
        for source_func in sources:
            try:
                urls = source_func(query)
                all_urls.extend(urls)
                logger.info(f"✅ {source_func.__name__}: Found {len(urls)} URLs")
                
                # If we have enough URLs, stop
                if len(all_urls) >= max_results:
                    break
            except Exception as e:
                logger.warning(f"⚠️ {source_func.__name__} failed: {e}")
                continue
        
        # Remove duplicates while preserving order
        seen = set()
        unique_urls = []
        for url in all_urls:
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)
        
        logger.info(f"🔍 Total unique URLs discovered: {len(unique_urls)}")
        return unique_urls[:max_results]
    
    def _discover_duckduckgo(self, query):
        """Discover URLs from DuckDuckGo HTML - Enhanced for better diversity"""
        urls = []
        
        try:
            # DuckDuckGo HTML interface
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            response = requests.get(search_url, headers=self.headers, timeout=self.timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Method 1: Find result links (primary)
                for link in soup.find_all('a', class_='result__a', href=True):
                    url = link['href']
                    if url.startswith('http') and 'duckduckgo.com' not in url:
                        # Skip if it's just a redirect
                        if '/l/?' not in url:
                            urls.append(url)
                
                # Method 2: Find all result snippets and extract URLs
                if len(urls) < 5:
                    for result in soup.find_all('div', class_='result__body'):
                        link = result.find('a', class_='result__url', href=True)
                        if link:
                            url = link.get('href', '')
                            if url.startswith('http') and 'duckduckgo.com' not in url:
                                urls.append(url)
                
                # Method 3: Extract from any link that looks like a result
                if len(urls) < 5:
                    for link in soup.find_all('a', href=True):
                        url = link['href']
                        # Filter for actual web results
                        if (url.startswith('http') and 
                            'duckduckgo.com' not in url and
                            '/l/?' not in url and
                            'javascript:' not in url):
                            urls.append(url)
                
                # Remove duplicates while preserving order
                seen = set()
                unique_urls = []
                for url in urls:
                    if url not in seen:
                        seen.add(url)
                        unique_urls.append(url)
                urls = unique_urls
        
        except Exception as e:
            logger.error(f"DuckDuckGo discovery failed: {e}")
        
        logger.info(f"🦆 DuckDuckGo found {len(urls)} URLs")
        return urls[:20]  # Return top 20
    
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
