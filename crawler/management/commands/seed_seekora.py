from django.core.management.base import BaseCommand
from crawler.crawler_engine import SeekoraCrawler

class Command(BaseCommand):
    help = 'Seed the database with a few major tech sites'

    def handle(self, *args, **options):
        urls = [
            'https://en.wikipedia.org/wiki/Tesla,_Inc.',
            'https://en.wikipedia.org/wiki/SpaceX',
            'https://en.wikipedia.org/wiki/Nvidia',
            'https://en.wikipedia.org/wiki/Microsoft',
            'https://en.wikipedia.org/wiki/Apple_Inc.',
            'https://en.wikipedia.org/wiki/OpenAI',
            'https://en.wikipedia.org/wiki/Google',
            'https://en.wikipedia.org/wiki/Meta_Platforms',
            'https://en.wikipedia.org/wiki/Amazon_(company)',
            'https://en.wikipedia.org/wiki/Large_language_model'
        ]
        
        crawler = SeekoraCrawler()
        for url in urls:
            self.stdout.write(f"Seeding: {url}")
            crawler.crawl_url(url)
        
        self.stdout.write(self.style.SUCCESS("Database seeded with top tech entities."))
