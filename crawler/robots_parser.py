"""
Robots.txt Parser with Caching
Ensures legal compliance by respecting robots.txt directives
"""
import requests
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class RobotsCache:
    """In-memory cache for robots.txt with TTL"""
    def __init__(self, ttl_hours=24):
        self._cache = {}
        self.ttl = timedelta(hours=ttl_hours)
    
    def get(self, domain):
        if domain in self._cache:
            parser, timestamp = self._cache[domain]
            if datetime.now() - timestamp < self.ttl:
                return parser
            else:
                del self._cache[domain]
        return None
    
    def set(self, domain, parser):
        self._cache[domain] = (parser, datetime.now())
    
    def clear_expired(self):
        """Cleanup expired entries"""
        now = datetime.now()
        expired = [d for d, (_, ts) in self._cache.items() if now - ts >= self.ttl]
        for domain in expired:
            del self._cache[domain]

class RobotsTxtHandler:
    """
    Production-grade robots.txt handler
    - Caches robots.txt per domain
    - Handles missing/malformed robots.txt gracefully
    - Respects crawl-delay directives
    """
    def __init__(self, user_agent='SeekoraBot/2.0 (+https://seekora.ai/bot)'):
        self.user_agent = user_agent
        self.cache = RobotsCache()
        self.timeout = 5  # seconds
    
    def can_fetch(self, url):
        """
        Check if URL is allowed to be crawled
        Returns: (allowed: bool, crawl_delay: float)
        """
        try:
            parsed = urlparse(url)
            domain = f"{parsed.scheme}://{parsed.netloc}"
            
            # Get or fetch robots.txt
            parser = self.cache.get(domain)
            if parser is None:
                parser = self._fetch_robots(domain)
                self.cache.set(domain, parser)
            
            # Check if allowed
            allowed = parser.can_fetch(self.user_agent, url)
            
            # Get crawl delay (if specified)
            crawl_delay = parser.crawl_delay(self.user_agent) or 1.0
            
            return allowed, crawl_delay
        
        except Exception as e:
            logger.warning(f"Robots.txt check failed for {url}: {e}")
            # On error, be conservative: allow but with delay
            return True, 2.0
    
    def _fetch_robots(self, domain):
        """Fetch and parse robots.txt for a domain"""
        parser = RobotFileParser()
        robots_url = urljoin(domain, '/robots.txt')
        
        try:
            response = requests.get(
                robots_url,
                headers={'User-Agent': self.user_agent},
                timeout=self.timeout,
                allow_redirects=True
            )
            
            if response.status_code == 200:
                parser.parse(response.text.splitlines())
                logger.info(f"✅ Loaded robots.txt from {domain}")
            else:
                # No robots.txt or error → allow all
                parser.parse([])
                logger.info(f"⚠️ No robots.txt at {domain}, allowing all")
        
        except Exception as e:
            logger.error(f"❌ Failed to fetch robots.txt from {domain}: {e}")
            # On error, allow all (be permissive)
            parser.parse([])
        
        return parser
    
    def get_crawl_delay(self, url):
        """Get recommended crawl delay for a URL's domain"""
        _, delay = self.can_fetch(url)
        return delay
