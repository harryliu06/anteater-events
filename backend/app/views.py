from __future__ import annotations
import logging
import os
from datetime import datetime, date, time, timezone
from typing import Any, Dict, List, Optional, Tuple
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from app.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

EVENTS_TABLE = "events"


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_or_none(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _parse_iso8601(dt_str: str) -> datetime:
    if dt_str.endswith("Z"):
        dt_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(dt_str).astimezone(timezone.utc)


def _parse_day_bounds(day_str: str) -> Tuple[str, str]:
    d = date.fromisoformat(day_str)
    start = datetime.combine(d, time.min).replace(tzinfo=timezone.utc)
    end = datetime.combine(d, time.max).replace(tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


def _to_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    return [s.strip() for s in str(val).split(",") if s.strip()]


def _validate_event_payload(payload: Dict[str, Any]) -> Optional[str]:
    required = [
        "title",
        "description",
        "start_time",
        "end_time",
        "latitude",
        "longitude",
        "categories",
    ]
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
        lat = float(payload["latitude"])
        lon = float(payload["longitude"])
    except Exception:
        return "latitude and longitude must be numbers."

    if not (-90.0 <= lat <= 90.0):
        return "latitude must be between -90 and 90."
    if not (-180.0 <= lon <= 180.0):
        return "longitude must be between -180 and 180."

    cats = _to_list(payload.get("categories"))
    if not cats:
        return "categories must be a non-empty list or comma-separated string."

    return None


def _normalize_event_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(payload)
    start_dt = _parse_iso8601(str(payload["start_time"]))
    end_dt = _parse_iso8601(str(payload["end_time"]))
    normalized["start_time"] = _iso_or_none(start_dt)
    normalized["end_time"] = _iso_or_none(end_dt)

    if "day" in payload and payload["day"]:
        try:
            date.fromisoformat(str(payload["day"]))
            normalized["day"] = str(payload["day"])
        except Exception:
            normalized["day"] = start_dt.date().isoformat()
    else:
        normalized["day"] = start_dt.date().isoformat()

    normalized["categories"] = _to_list(payload.get("categories"))
    normalized.setdefault("status", "active")
    normalized.setdefault("expiration", normalized["end_time"])
    if "location_name" in payload and payload["location_name"] is None:
        del normalized["location_name"]

    if "id" in normalized and not normalized["id"]:
        del normalized["id"]

    return normalized

class EventListView(View):
    supabase = get_supabase_client()

    def get(self, request: HttpRequest) -> JsonResponse:
        # example url query: http://127.0.0.1:8000/events/?day=2025-11-05&categories=music&categories=fun
        logger.info(request.GET)
        categories_param = request.GET.getlist("categories")
        day_param = request.GET.get("day")
        logger.info(f"Fetching events with categories={categories_param} and day={day_param}")
        
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
        return JsonResponse({"payload":resp.data}, status=200)

    """
    TO-DO
    POST requests
    """
    def post(self):
        pass

class EventDetailView(View):
    supabase = get_supabase_client()
    def get(self, request: HttpRequest, event_id: str) -> JsonResponse:
        logger.info("Fetching event with id={event_id}")
        try:
            resp = (
                self.supabase.table(EVENTS_TABLE)
                .select("*")
                .eq("id", event_id)
                .limit(1)
                .execute()
            )
            rows: List[Dict[str, Any]] = resp.data or []
            if not rows:
                return JsonResponse({"error": "Event not found"}, status=404)
            return JsonResponse(rows[0], status=200)
        except Exception as e:
            logger.exception("Failed to fetch event detail")
            return JsonResponse({"error": str(e)}, status=500)
