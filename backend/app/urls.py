from django.urls import path
from .views import EventDetailView, EventListView, EventSearchView,EventAIView

urlpatterns = [
    path("", EventListView.as_view(), name="event_list"),                 # GET /api/events
    path("<uuid:event_id>/", EventDetailView.as_view(), name="event_detail"),  # GET /api/events/<uuid>/
    path("search/", EventSearchView.as_view(), name="event_search"), # GET events/search
    path("aisearch/", EventAIView.as_view(), name="event_search") # GET events/search
]
