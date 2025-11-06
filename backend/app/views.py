from __future__ import annotations
import json
from uuid import uuid4
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from django.http import JsonResponse, HttpRequest
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

EVENTS_TABLE = "events"

def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _parse_iso8601(dt_str: str) -> datetime:
    if dt_str.endswith("Z"):
        dt_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(dt_str).astimezone(timezone.utc)

def _to_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        out: List[str] = []
        for v in val:
            s = str(v)
            if "," in s:
                out.extend([p.strip() for p in s.split(",") if p.strip()])
            elif s.strip():
                out.append(s.strip())
        return out
    return [s.strip() for s in str(val).split(",") if s.strip()]

def _validate_event(payload: Dict[str, Any]) -> Optional[str]:
    required = ["title", "description", "start_time", "end_time", "latitude", "longitude", "categories"]
    missing = [k for k in required if k not in payload]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    try:
        start_dt = _parse_iso8601(str(payload["start_time"]))
        end_dt = _parse_iso8601(str(payload["end_time"]))
    except Exception:
        return "Invalid datetime format for start_time or end_time. Use ISO-8601."
    if end_dt <= start_dt:
        return "end_time must be after start_time."
    try:
        lat = float(payload["latitude"]); lon = float(payload["longitude"])
    except Exception:
        return "latitude and longitude must be numbers."
    if not (-90 <= lat <= 90):
        return "latitude must be between -90 and 90."
    if not (-180 <= lon <= 180):
        return "longitude must be between -180 and 180."
    if not _to_list(payload.get("categories")):
        return "categories must be a non-empty list or comma-separated string."
    return None

def _format_timetz(dt: datetime) -> str:
    t = dt.timetz().replace(microsecond=0)
    return t.isoformat()

def _normalize_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    start_dt = _parse_iso8601(str(payload["start_time"]))
    end_dt = _parse_iso8601(str(payload["end_time"]))

    doc = {
        "id": payload.get("id"),
        "title": payload["title"],
        "description": payload.get("description"),
        "day": start_dt.date().isoformat(),
        "start_time": _format_timetz(start_dt),  # timetz
        "end_time": _format_timetz(end_dt),      # timetz
        "latitude": float(payload["latitude"]),
        "longitude": float(payload["longitude"]),
        "categories": _to_list(payload.get("categories")),
    }
    if not doc["id"]:
        del doc["id"]
    return doc


@method_decorator(csrf_exempt, name="dispatch")
class EventListView(View):
    supabase = get_supabase_client()

    def get(self, request: HttpRequest) -> JsonResponse:
        logger.info(request.GET)
        categories_param = request.GET.getlist("categories")
        day_param = request.GET.get("day")
        logger.info(f"Fetching events with categories={categories_param} and day={day_param}")
        if day_param == "" or day_param is None:
            return JsonResponse({"error": "Missing required 'day' query parameter"}, status=400)
        elif len(categories_param) == 0 or categories_param[0] == "":
            return JsonResponse({"error": "Missing required 'categories' query parameter"}, status=400)

        if categories_param[0] != 'all':
            resp = (
                self.supabase.table("events")
                .select("*")
                .eq("day", day_param)
                .overlaps("categories", categories_param)
                .execute()
            )
        else:
            resp = (
                self.supabase.table("events")
                .select("*") 
                .eq("day", day_param)
                .execute()
            )
        return JsonResponse({"events":resp.data}, status=200)


    def post(self, request: HttpRequest) -> JsonResponse:
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        err = _validate_event(payload)
        if err:
            return JsonResponse({"error": err}, status=422)

        doc = _normalize_event(payload)

        if not doc.get("id"):
            doc["id"] = str(uuid4())

        try:
            ins = self.supabase.table(EVENTS_TABLE).insert(doc).execute()
            row = (getattr(ins, "data", None) or [doc])[0]
        except Exception as e:
            logger.exception("Insert failed")
            return JsonResponse({"error": str(e)}, status=500)

        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]},
            "properties": {k: v for k, v in row.items() if k not in ("latitude", "longitude")},
        }
        return JsonResponse({"feature": feature}, status=201)

class EventDetailView(View):
    supabase = get_supabase_client()
    def get(self, request: HttpRequest, event_id: str) -> JsonResponse:
        try:
            resp = (self.supabase.table(EVENTS_TABLE).select("*").eq("id", event_id).limit(1).execute())
            rows = resp.data or []
            if not rows:
                return JsonResponse({"error": "Event not found"}, status=404)
            return JsonResponse(rows[0], status=200)
        except Exception as e:
            logger.exception("Failed to fetch event detail")
            return JsonResponse({"error": str(e)}, status=500)

class EventSearchView(View):
    supabase = get_supabase_client()

    def get(self, request: HttpRequest) -> JsonResponse:
        day_param = request.GET.get("day")
        query_param = request.GET.get("search", "").strip()
        if not query_param:
            return JsonResponse({"error": "Missing required 'search' parameter"}, status=400)
        logger.info(f"Searching events on day={day_param} with query='{query_param}'")
        try:
            resp = (
                self.supabase.table(EVENTS_TABLE)
                .select("*")
                .eq("day", day_param)
                .or_(
                    f"title.ilike.%{query_param}%,description.ilike.%{query_param}%"
                )
                .execute()
            )
            return JsonResponse({"events": resp.data}, status=200)
        except Exception as e:
            logger.exception("Search failed")
            return JsonResponse({"error": str(e)}, status=500)
#http://127.0.0.1:8000/events/search/?day=2025-11-05&search=icssc%20hackathon