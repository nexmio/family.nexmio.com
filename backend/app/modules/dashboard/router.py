import json
from datetime import UTC, datetime

from fastapi import APIRouter, Response

from app.core.db import reader, transaction
from app.core.errors import ApiError
from app.modules.dashboard.schemas import PRESETS, DashboardBody, DashboardCreate

router = APIRouter()


def _out(row) -> dict:
    widgets = sorted(json.loads(row["widgets"]), key=lambda w: w["order"])
    return {
        "slug": row["slug"],
        "name": row["name"],
        "device": row["device"],
        "orientation": row["orientation"],
        "is_default": bool(row["is_default"]),
        "title": row["title"],
        "show_title": bool(row["show_title"]),
        "show_clock": bool(row["show_clock"]),
        "night_start": row["night_start"],
        "night_end": row["night_end"],
        "start_view": row["start_view"],
        "touch": bool(row["touch"]),
        "return_after": row["return_after"],
        "idle_photo_after": row["idle_photo_after"],
        "slideshow": json.loads(row["slideshow"]),
        "widgets": widgets,
    }


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def _get(db, slug: str):
    row = db.execute("SELECT * FROM dashboards WHERE slug = ?", (slug,)).fetchone()
    if row is None:
        raise ApiError(404, "dashboard_not_found")
    return row


@router.get("/ping")
def ping():
    return {"module": "dashboard"}


@router.get("/presets")
def presets():
    return PRESETS


@router.get("/dashboards")
def list_dashboards():
    with reader() as db:
        rows = db.execute("SELECT * FROM dashboards ORDER BY is_default DESC, name").fetchall()
    return [
        {**{k: v for k, v in _out(r).items() if k != "widgets"}, "widget_count": len(_out(r)["widgets"])}
        for r in rows
    ]


@router.get("/dashboards/default")
def get_default():
    with reader() as db:
        row = db.execute("SELECT * FROM dashboards WHERE is_default = 1").fetchone()
        if row is None:
            row = db.execute("SELECT * FROM dashboards ORDER BY name LIMIT 1").fetchone()
    if row is None:
        raise ApiError(404, "dashboard_not_found")
    return _out(row)


@router.get("/dashboards/{slug}")
def get_dashboard(slug: str):
    with reader() as db:
        return _out(_get(db, slug))


@router.post("/dashboards", status_code=201)
def create_dashboard(body: DashboardCreate):
    """A new dashboard is always a custom one. Only the default dashboard lives on `/`."""
    with transaction() as db:
        if db.execute("SELECT 1 FROM dashboards WHERE slug = ?", (body.slug,)).fetchone():
            raise ApiError(409, "slug_taken")
        db.execute(
            "INSERT INTO dashboards (slug, name, device, orientation, is_default, widgets, updated_at,"
            " start_view, touch, return_after, idle_photo_after, slideshow, title, show_title, show_clock, night_start, night_end)"
            " VALUES (?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                body.slug, body.name, body.device, body.orientation,
                json.dumps([w.model_dump() for w in body.widgets]), _now(),
                body.start_view, int(body.touch), body.return_after, body.idle_photo_after,
                json.dumps(body.slideshow.model_dump()), body.title or None, int(body.show_title),
                int(body.show_clock), body.night_start, body.night_end,
            ),
        )
        return _out(_get(db, body.slug))


@router.put("/dashboards/{slug}")
def update_dashboard(slug: str, body: DashboardBody):
    with transaction() as db:
        _get(db, slug)
        db.execute(
            "UPDATE dashboards SET name=?, device=?, orientation=?, widgets=?, updated_at=?,"
            " start_view=?, touch=?, return_after=?, idle_photo_after=?, slideshow=?, title=?, show_title=?,"
            " show_clock=?, night_start=?, night_end=?"
            " WHERE slug=?",
            (
                body.name, body.device, body.orientation,
                json.dumps([w.model_dump() for w in body.widgets]), _now(),
                body.start_view, int(body.touch), body.return_after, body.idle_photo_after,
                json.dumps(body.slideshow.model_dump()), body.title or None, int(body.show_title),
                int(body.show_clock), body.night_start, body.night_end, slug,
            ),
        )
        return _out(_get(db, slug))


@router.delete("/dashboards/{slug}", status_code=204)
def delete_dashboard(slug: str):
    with transaction() as db:
        row = _get(db, slug)
        if row["is_default"]:
            raise ApiError(409, "cannot_delete_default")
        db.execute("DELETE FROM dashboards WHERE slug = ?", (slug,))
    return Response(status_code=204)
