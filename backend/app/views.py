from django.views import View
from django.http import JsonResponse
from config.firebase_client import db
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) 

class EventListView(View):
    def get(self, request):
        logger.info(request)
        print(request)
        categories_param = request.GET.get("categories")  
        day = request.GET.get("day")  

        query = db.collection("events")

        if categories_param:
            categories = [c.strip() for c in categories_param.split(",")]
            query = query.where("categories", "array-contains-any", categories)

        if day:
            query = query.where("day", "==", day)

        events = [doc.to_dict() for doc in query.stream()]
        return JsonResponse({"events": events}, safe=False)



class EventDetailView(View):
    def get(self, request, event_id):
        doc = db.collection("events").document(event_id).get()
        if not doc.exists:
            return JsonResponse({"error": "Event not found"}, status=404)
        return JsonResponse(doc.to_dict())
