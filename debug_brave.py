import requests
from bs4 import BeautifulSoup

headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get('https://search.brave.com/search?q=samsung&source=web', headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

snippets = soup.select('.snippet')
for i, s in enumerate(snippets[:4]):
    with open('brave_dump.html', 'a', encoding='utf-8') as f:
        f.write(f"====== SNIPPET {i} ======\n")
        f.write(s.prettify())
        f.write("\n")
