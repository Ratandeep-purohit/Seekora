from django.db import models
import uuid

class WebPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(max_length=255, unique=True)
    title = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    content = models.TextField() # Raw or cleaned text
    
    # Meta
    domain = models.CharField(max_length=255)
    last_indexed = models.DateTimeField(auto_now=True)
    page_rank_score = models.FloatField(default=0.0)
    
    # Flags
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title or self.url

class SearchIndex(models.Model):
    """Refined weighted index for relevance ranking"""
    FIELD_CHOICES = (
        ('title', 'Title'),
        ('content', 'Content'),
        ('meta', 'Metadata'),
        ('media_alt', 'Media Alt Text'),
    )
    
    word = models.CharField(max_length=255, db_index=True)
    page = models.ForeignKey(WebPage, on_delete=models.CASCADE, related_name='index_entries')
    field_type = models.CharField(max_length=20, choices=FIELD_CHOICES, default='content')
    frequency = models.IntegerField(default=1)
    weight = models.FloatField(default=1.0) # Calculated relevance weight (Frequency * Field Boost)

    class Meta:
        unique_together = ('word', 'page', 'field_type')
        indexes = [
            models.Index(fields=['word', 'weight']),
        ]

class ImageMedia(models.Model):
    page = models.ForeignKey(WebPage, on_delete=models.CASCADE, related_name='images')
    url = models.URLField(max_length=1000)
    alt_text = models.CharField(max_length=500, blank=True, null=True)
    
    def __str__(self):
        return self.url

class VideoMedia(models.Model):
    page = models.ForeignKey(WebPage, on_delete=models.CASCADE, related_name='videos')
    url = models.URLField(max_length=1000)
    title = models.CharField(max_length=500, blank=True, null=True)
    thumbnail = models.URLField(max_length=1000, blank=True, null=True)
    provider = models.CharField(max_length=100, default='youtube') # youtube, vimeo, raw
    
    def __str__(self):
        return self.title or self.url
