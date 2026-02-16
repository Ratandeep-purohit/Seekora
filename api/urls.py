from django.urls import path
from .views import SearchAPIView, AutocompleteAPIView, api_root

urlpatterns = [
    path('', api_root, name='api-root'),
    path('search/', SearchAPIView.as_view(), name='api-search'),
    path('autocomplete/', AutocompleteAPIView.as_view(), name='api-autocomplete'),
]
