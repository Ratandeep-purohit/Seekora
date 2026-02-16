from django.core.management.base import BaseCommand
from crawler.crawler_engine import SeekoraCrawler

class Command(BaseCommand):
    help = 'Crawl a specific URL and index its content'

    def add_arguments(self, parser):
        parser.add_argument('url', type=str, help='The URL to crawl')

    def handle(self, *args, **options):
        url = options['url']
        self.stdout.write(f"Starting crawl for: {url}")
        
        crawler = SeekoraCrawler()
        result = crawler.crawl_url(url)
        
        if result:
            page, links = result
            self.stdout.write(self.style.SUCCESS(f"Successfully indexed: {page.title}"))
            self.stdout.write(f"Found {len(links)} links on the page.")
        else:
            self.stdout.write(self.style.ERROR("Crawl failed."))
