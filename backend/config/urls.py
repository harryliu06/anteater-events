from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("events/", include("app.urls")),
    path("health/", include("app.health_url"))
]

