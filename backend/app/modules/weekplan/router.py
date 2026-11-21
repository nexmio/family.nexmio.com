from datetime import date as Date
from datetime import timedelta
from urllib.parse import quote

from fastapi import APIRouter, Query, Request, Response

from app.core import members as members_core
from app.core.db import reader, transaction
from app.core.errors import ApiError
from app.modules.weekplan import ics, importer, service
from app.modules.weekplan.schemas import CATEGORIES, EventIn, ExecuteRequest
from app.shared.dates import validate_range

router = APIRouter()


@router.get("/ping")
def ping():
    return {"module": "weekplan"}


@router.get("/events")
def list_events(
    start: Date = Query(alias="from"),
    end: Date = Query(alias="to"),
    category: str | None = None,
    member: str | None = None,
):
    validate_range(start, end)
    categories = None
    if category:
        categories = [c.strip() for c in category.split(",") if c.strip()]
        unknown = [c for c in categories if c not in CATEGORIES]
        if unknown:
            raise ApiError(422, "unknown_category", unknown)
    members: list[int | None] | None = None
    if member:
        try:
            members = [None if m.strip() == "none" else int(m) for m in member.split(",") if m.strip()]
        except ValueError as exc:
            raise ApiError(422, "invalid_member_filter") from exc
    with reader() as db:
        return service.list_events(db, start, end, categories, members)


@router.get("/events/{event_id}")
def get_event(event_id: int):
    with reader() as db:
        return service.get_event(db, event_id)


@router.post("/events", status_code=201)
def create_event(body: EventIn, allow_duplicate: bool = False):
    with transaction() as db:
        first_id = service.create_series(db, body.model_dump(), allow_duplicate)
        created = service.get_event(db, first_id)
        if created["series_id"]:
            created["series_count"] = db.execute(
                "SELECT COUNT(*) AS n FROM events WHERE series_id = ?", (created["series_id"],)
            ).fetchone()["n"]
        return created


@router.put("/events/{event_id}")
def update_event(event_id: int, body: EventIn, scope: str = "this"):
    if scope not in ("this", "series"):
        raise ApiError(422, "invalid_scope")
    if body.repeat is not None:
        raise ApiError(422, "repeat_only_when_creating")
    with transaction() as db:
        service.update_event(db, event_id, body.model_dump(), whole_series=scope == "series")
        return service.get_event(db, event_id)


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, scope: str = "this"):
    if scope not in ("this", "following", "series"):
        raise ApiError(422, "invalid_scope")
    with transaction() as db:
        service.delete_event(db, event_id, scope)
    return Response(status_code=204)


@router.get("/calendar.ics")
def calendar_feed(member: str | None = None, days_back: int = 30):
    """A calendar feed (.ics) that phone calendars can subscribe to."""
    start = Date.today() - timedelta(days=max(0, min(days_back, 365)))
    end = Date.today() + timedelta(days=365)
    ids: list[int | None] | None = None
    if member:
        try:
            ids = [None if m.strip() == "none" else int(m) for m in member.split(",") if m.strip()]
        except ValueError as exc:
            raise ApiError(422, "invalid_member_filter") from exc
    with reader() as db:
        events = service.list_events(db, start, end, None, ids)
        names = {r["id"]: r["name"] for r in db.execute("SELECT id, name FROM members")}
    return Response(
        ics.build(events, names),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="nexmio-family.ics"', "Cache-Control": "no-cache"},
    )


@router.get("/import/template")
def import_template(lang: str = "en"):
    lang = lang if lang in importer.LANGUAGES else "en"
    filename = quote(f"weekplan-import-template.{lang}.md")
    return Response(
        importer.build_template(lang),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import/preview")
async def import_preview(request: Request):
    raw = await request.body()
    with reader() as db:
        return importer.preview(db, raw)


@router.post("/import/execute")
def import_execute(body: ExecuteRequest):
    created = 0
    skipped = 0
    new_members = 0
    first_date: str | None = None
    with transaction() as db:
        for index, event in enumerate(body.file.events):
            if index in body.skip:
                skipped += 1
                continue
            data = event.model_dump()
            name = data.pop("person")
            member_id = None
            if name:
                row = members_core.find_by_name(db, name)
                if row is None:
                    member_id = members_core.create_member(db, name)
                    new_members += 1
                else:
                    member_id = row["id"]
            data["member_id"] = member_id
            service.insert_event(db, data)
            created += 1
            day = event.date.isoformat()
            first_date = day if first_date is None or day < first_date else first_date
    return {"created": created, "skipped": skipped, "first_date": first_date, "new_members": new_members}
