import requests  # type: ignore
import re
from urllib.parse import quote_plus

query = 'life before formation of earth'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

# Try different Bing pattern
url = f'https://www.bing.com/images/search?q={quote_plus(query)}&FORM=HDRSC2'
r = requests.get(url, headers=headers, timeout=10)

# Find all patterns
patterns = [
    r'murl&quot;:&quot;(https?://[^&]+)&quot;',
    r'"murl"\s*:\s*"(https?://[^"]+)"',
    r'imgurl=(https?://[^&"]+)',
    r'src="(https?://[^"]+\.(?:jpg|jpeg|png|webp))"',
]
for p in patterns:
    matches = re.findall(p, r.text)
    print(f'Pattern {str(p)[:30]}... -> {len(matches)} matches')  # type: ignore
    for m in matches[:2]:  # type: ignore
        print(f'  {m[:100]}')
    print()
