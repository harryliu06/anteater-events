from django.urls import path
from app.views import EventDetailView,EventListView

urlpatterns = [
    path("", EventListView.as_view(), name="event_list"),              # GET /events/
    path("<str:event_id>/", EventDetailView.as_view(), name="event_detail"),  # GET /events/<id>/
]
