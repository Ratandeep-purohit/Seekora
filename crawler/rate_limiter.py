"""
Domain-Level Rate Limiter
Ensures polite crawling by enforcing per-domain request delays
"""
import time
import threading
from collections import defaultdict
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

class DomainRateLimiter:
    """
    Thread-safe rate limiter that enforces per-domain delays
    Prevents overwhelming any single server
    """
    def __init__(self, default_delay=1.0):
        self.default_delay = default_delay
        self._last_access = defaultdict(float)
        self._locks = defaultdict(threading.Lock)
        self._global_lock = threading.Lock()
    
    def wait_if_needed(self, url, custom_delay=None):
        """
        Block until it's safe to crawl this URL's domain
        Args:
            url: Target URL
            custom_delay: Override default delay (e.g., from robots.txt)
        """
        domain = self._extract_domain(url)
        delay = custom_delay or self.default_delay
        
        # Get domain-specific lock
        with self._global_lock:
            lock = self._locks[domain]
        
        with lock:
            last_time = self._last_access[domain]
            elapsed = time.time() - last_time
            
            if elapsed < delay:
                wait_time = delay - elapsed
                logger.debug(f"⏳ Rate limiting {domain}: waiting {wait_time:.2f}s")
                time.sleep(wait_time)
            
            self._last_access[domain] = time.time()
    
    def _extract_domain(self, url):
        """Extract domain from URL"""
        parsed = urlparse(url)
        return parsed.netloc
    
    def get_stats(self):
        """Get rate limiter statistics"""
        return {
            'tracked_domains': len(self._last_access),
            'active_locks': len(self._locks)
        }

class AdaptiveRateLimiter(DomainRateLimiter):
    """
    Advanced rate limiter with exponential backoff on errors
    """
    def __init__(self, default_delay=1.0, max_delay=60.0):
        super().__init__(default_delay)
        self.max_delay = max_delay
        self._error_counts = defaultdict(int)
        self._backoff_delays = defaultdict(float)
    
    def record_error(self, url):
        """Record a failed request to trigger backoff"""
        domain = self._extract_domain(url)
        with self._global_lock:
            self._error_counts[domain] += 1
            # Exponential backoff: 2^errors * base_delay, capped at max_delay
            backoff = min(
                self.default_delay * (2 ** self._error_counts[domain]),
                self.max_delay
            )
            self._backoff_delays[domain] = backoff
            logger.warning(f"⚠️ Error on {domain}, backoff delay now {backoff:.1f}s")
    
    def record_success(self, url):
        """Record a successful request to reset backoff"""
        domain = self._extract_domain(url)
        with self._global_lock:
            if domain in self._error_counts:
                self._error_counts[domain] = max(0, self._error_counts[domain] - 1)
                if self._error_counts[domain] == 0:
                    self._backoff_delays.pop(domain, None)
                    logger.info(f"✅ {domain} recovered, backoff cleared")
    
    def wait_if_needed(self, url, custom_delay=None):
        """Wait with adaptive backoff"""
        domain = self._extract_domain(url)
        
        # Use backoff delay if in error state
        effective_delay = self._backoff_delays.get(domain, custom_delay or self.default_delay)
        
        super().wait_if_needed(url, effective_delay)
