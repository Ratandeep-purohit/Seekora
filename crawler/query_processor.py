"""
Query Intelligence Layer
Transforms raw user queries into optimized search terms
"""
import re
from typing import List, Set
import logging

logger = logging.getLogger(__name__)

# Common English stopwords
STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how'
}

# Simple stemming rules (Porter-like)
STEMMING_RULES = [
    (r'ies$', 'y'),      # berries -> berry
    (r'es$', ''),        # boxes -> box
    (r's$', ''),         # cats -> cat
    (r'ing$', ''),       # running -> run
    (r'ed$', ''),        # played -> play
    (r'ly$', ''),        # quickly -> quick
]

class QueryProcessor:
    """
    Production-grade query processor
    - Spell correction (basic)
    - Stopword removal
    - Stemming
    - Query normalization
    """
    def __init__(self, enable_stemming=True, enable_stopwords=True):
        self.enable_stemming = enable_stemming
        self.enable_stopwords = enable_stopwords
        
        # Simple spell correction dictionary (can be expanded)
        self.common_corrections = {
            'pyhton': 'python',
            'javascirpt': 'javascript',
            'machien': 'machine',
            'learing': 'learning',
            'artifical': 'artificial',
            'intelligance': 'intelligence',
            'algoritm': 'algorithm',
            'databse': 'database',
        }
    
    def process(self, query: str) -> dict:
        """
        Process a raw query and return structured analysis
        
        Returns:
            {
                'original': str,
                'normalized': str,
                'tokens': List[str],
                'stemmed_tokens': List[str],
                'corrections': dict,
                'removed_stopwords': List[str]
            }
        """
        original = query
        
        # 1. Normalize
        normalized = self._normalize(query)
        
        # 2. Tokenize
        tokens = self._tokenize(normalized)
        
        # 3. Spell correction
        corrected_tokens, corrections = self._correct_spelling(tokens)
        
        # 4. Remove stopwords
        filtered_tokens, removed = self._remove_stopwords(corrected_tokens)
        
        # 5. Stemming
        stemmed_tokens = self._stem_tokens(filtered_tokens)
        
        return {
            'original': original,
            'normalized': normalized,
            'tokens': corrected_tokens,
            'stemmed_tokens': stemmed_tokens,
            'corrections': corrections,
            'removed_stopwords': removed,
            'final_query': ' '.join(stemmed_tokens)
        }
    
    def _normalize(self, query: str) -> str:
        """Basic normalization"""
        # Lowercase
        query = query.lower()
        # Remove extra whitespace
        query = re.sub(r'\s+', ' ', query).strip()
        # Remove special characters (keep alphanumeric and spaces)
        query = re.sub(r'[^a-z0-9\s]', '', query)
        return query
    
    def _tokenize(self, query: str) -> List[str]:
        """Split into words"""
        return query.split()
    
    def _correct_spelling(self, tokens: List[str]) -> tuple:
        """Basic spell correction"""
        corrected = []
        corrections = {}
        
        for token in tokens:
            if token in self.common_corrections:
                corrected_word = self.common_corrections[token]
                corrected.append(corrected_word)
                corrections[token] = corrected_word
            else:
                corrected.append(token)
        
        return corrected, corrections
    
    def _remove_stopwords(self, tokens: List[str]) -> tuple:
        """Remove common stopwords"""
        if not self.enable_stopwords:
            return tokens, []
        
        filtered = []
        removed = []
        
        for token in tokens:
            if token in STOPWORDS:
                removed.append(token)
            else:
                filtered.append(token)
        
        # Keep at least one token even if all are stopwords
        if not filtered and tokens:
            filtered = tokens[:1]
            removed = removed[1:]
        
        return filtered, removed
    
    def _stem_tokens(self, tokens: List[str]) -> List[str]:
        """Apply simple stemming rules"""
        if not self.enable_stemming:
            return tokens
        
        stemmed = []
        for token in tokens:
            stemmed_word = self._stem_word(token)
            stemmed.append(stemmed_word)
        
        return stemmed
    
    def _stem_word(self, word: str) -> str:
        """Apply stemming rules to a single word"""
        for pattern, replacement in STEMMING_RULES:
            if re.search(pattern, word):
                return re.sub(pattern, replacement, word)
        return word
    
    def get_search_tokens(self, query: str) -> List[str]:
        """
        Quick method to get final search tokens
        (Most common use case)
        """
        result = self.process(query)
        return result['stemmed_tokens']

# Singleton instance
query_processor = QueryProcessor()
