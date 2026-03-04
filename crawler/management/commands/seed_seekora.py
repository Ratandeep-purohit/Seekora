from django.core.management.base import BaseCommand
from crawler.crawler_engine import SeekoraCrawler

class Command(BaseCommand):
    help = 'Seed the database with a few major tech sites'

    def handle(self, *args, **options):
        urls = [
            # Tech Giants & AI
            'https://en.wikipedia.org/wiki/Tesla,_Inc.',
            'https://openai.com/',
            'https://www.microsoft.com/en-us/ai',
            'https://www.nvidia.com/en-us/',
            'https://www.apple.com/',
            
            # Programming & Dev
            'https://stackoverflow.com/',
            'https://github.com/about',
            'https://react.dev/',
            'https://docs.python.org/3/',
            'https://developer.mozilla.org/en-US/',
            
            # Tech News
            'https://techcrunch.com/',
            'https://www.theverge.com/',
            'https://news.ycombinator.com/',
            'https://wired.com/',
            'https://arstechnica.com/',
            
            # General Knowledge / Science
            'https://www.nasa.gov/',
            'https://www.nature.com/',
            'https://www.nationalgeographic.com/'
        ]
        
        crawler = SeekoraCrawler()
        self.stdout.write(f"Seeding {len(urls)} diverse websites...")
        
        for url in urls:
            try:
                self.stdout.write(f"🕷️ Crawling: {url}")
                crawler.crawl_url(url)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Failed {url}: {e}"))
        
        self.stdout.write(self.style.SUCCESS("Database seeded with top tech entities."))
