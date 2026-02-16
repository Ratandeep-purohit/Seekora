"""
Django management command to seed the database with initial high-quality content
This ensures the search engine has data to work with from day 1
"""
from django.core.management.base import BaseCommand
from crawler.crawler_engine import SeekoraCrawler
import time

class Command(BaseCommand):
    help = 'Seeds the database with initial high-quality content from authoritative sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--topics',
            type=str,
            default='python,javascript,machine learning,web development,data science',
            help='Comma-separated list of topics to seed'
        )
        parser.add_argument(
            '--urls-per-topic',
            type=int,
            default=10,
            help='Number of URLs to crawl per topic'
        )

    def handle(self, *args, **options):
        topics = options['topics'].split(',')
        urls_per_topic = options['urls_per_topic']
        
        self.stdout.write(self.style.SUCCESS(f'\n🌱 Starting database seeding...'))
        self.stdout.write(f'Topics: {", ".join(topics)}')
        self.stdout.write(f'URLs per topic: {urls_per_topic}\n')
        
        crawler = SeekoraCrawler()
        total_crawled = 0
        total_failed = 0
        
        for topic in topics:
            topic = topic.strip()
            self.stdout.write(self.style.WARNING(f'\n📚 Seeding topic: {topic}'))
            
            try:
                # Discover URLs for this topic
                urls = crawler.discover_urls(topic)
                self.stdout.write(f'   Discovered {len(urls)} URLs')
                
                # Crawl each URL
                for i, url in enumerate(urls[:urls_per_topic], 1):
                    self.stdout.write(f'   [{i}/{urls_per_topic}] Crawling: {url[:60]}...')
                    
                    result = crawler.crawl_url(url)
                    if result:
                        total_crawled += 1
                        self.stdout.write(self.style.SUCCESS(f'      ✅ Success'))
                    else:
                        total_failed += 1
                        self.stdout.write(self.style.ERROR(f'      ❌ Failed'))
                    
                    # Small delay to be polite
                    time.sleep(0.5)
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   Error seeding {topic}: {str(e)}'))
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'\n\n✅ Seeding Complete!'))
        self.stdout.write(f'   Total crawled: {total_crawled}')
        self.stdout.write(f'   Total failed: {total_failed}')
        self.stdout.write(f'   Success rate: {(total_crawled/(total_crawled+total_failed)*100):.1f}%\n')
        
        self.stdout.write(self.style.SUCCESS('🎉 Your search engine is now ready to use!'))
        self.stdout.write('   Try searching for: python, javascript, machine learning, etc.\n')
