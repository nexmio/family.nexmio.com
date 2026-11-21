import calendar
import json
import sqlite3
import uuid
from datetime import UTC, date, datetime, timedelta

from app.core.errors import ApiError

MAX_OCCURRENCES = 150


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def to_event(row: sqlite3.Row) -> dict:
    out = {key: row[key] for key in row.keys()}  # noqa: SIM118
    out["also_ids"] = json.loads(out.get("also_ids") or "[]")
    return out


def list_events(
    db, start: date, end: date, categories: list[str] | None, members: list[int | None] | None = None
) -> list[dict]:
    """members: ids to include; None inside the list means "the whole family" (no member)."""
    sql = "SELECT * FROM events WHERE date >= ? AND date <= ?"
    params: list = [start.isoformat(), end.isoformat()]
    if categories:
        sql += f" AND category IN ({','.join('?' * len(categories))})"
        params += categories
    if members:
        ids = [m for m in members if m is not None]
        parts = []
        if ids:
            marks = ",".join("?" * len(ids))
            parts.append(f"member_id IN ({marks})")
            parts.append(f"EXISTS (SELECT 1 FROM json_each(events.also_ids) j WHERE j.value IN ({marks}))")
            params += ids + ids
        if None in members:
            parts.append("member_id IS NULL")
        sql += " AND (" + " OR ".join(parts) + ")"
    sql += " ORDER BY date, (start IS NOT NULL), start, id"
    return [to_event(r) for r in db.execute(sql, params)]


def get_event(db, event_id: int) -> dict:
    row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None:
        raise ApiError(404, "event_not_found")
    return to_event(row)


def _key(title: str) -> str:
    return title.strip().casefold()


def find_duplicates(db, title: str, day: date) -> list[dict]:
    rows = db.execute("SELECT * FROM events WHERE date = ?", (day.isoformat(),))
    return [to_event(r) for r in rows if _key(r["title"]) == _key(title)]


def check_members(db, member_id: int | None, also_ids: list[int] | None = None) -> None:
    for m in [member_id, *(also_ids or [])]:
        if m is not None and db.execute("SELECT 1 FROM members WHERE id = ?", (m,)).fetchone() is None:
            raise ApiError(422, "unknown_member", m)


def occurrences(first: date, every: str, until: date) -> list[date]:
    days = [first]
    n = 0
    while True:
        n += 1
        if every == "day":
            nxt = first + timedelta(days=n)
        elif every == "week":
            nxt = first + timedelta(weeks=n)
        elif every == "2weeks":
            nxt = first + timedelta(weeks=2 * n)
        else:
            month = first.month - 1 + n
            year, month = first.year + month // 12, month % 12 + 1
            nxt = date(year, month, min(first.day, calendar.monthrange(year, month)[1]))
        if nxt > until:
            return days
        days.append(nxt)
        if len(days) > MAX_OCCURRENCES:
            raise ApiError(422, "too_many_occurrences", MAX_OCCURRENCES)


def insert_event(db, data: dict, series_id: str | None = None) -> int:
    check_members(db, data.get("member_id"), data.get("also_ids"))
    now = _now()
    cur = db.execute(
        'INSERT INTO events (title, date, start, "end", member_id, also_ids, category, notes, series_id,'
        " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (
            data["title"],
            data["date"].isoformat() if isinstance(data["date"], date) else data["date"],
            data.get("start"),
            data.get("end"),
            data.get("member_id"),
            json.dumps(data.get("also_ids") or []),
            data["category"],
            data.get("notes"),
            series_id,
            now,
            now,
        ),
    )
    return int(cur.lastrowid)


def update_event(db, event_id: int, data: dict, whole_series: bool = False) -> None:
    current = get_event(db, event_id)
    check_members(db, data.get("member_id"), data.get("also_ids"))
    common = (
        data["title"], data.get("start"), data.get("end"), data.get("member_id"),
        json.dumps(data.get("also_ids") or []), data["category"], data.get("notes"), _now(),
    )
    if whole_series and current["series_id"]:
        # every event of the series gets the new details, each keeps its own day
        db.execute(
            'UPDATE events SET title=?, start=?, "end"=?, member_id=?, also_ids=?, category=?, notes=?,'
            " updated_at=? WHERE series_id=?",
            (*common, current["series_id"]),
        )
        return
    db.execute(
        'UPDATE events SET title=?, start=?, "end"=?, member_id=?, also_ids=?, category=?, notes=?,'
        " updated_at=?, date=? WHERE id=?",
        (*common, data["date"].isoformat(), event_id),
    )


def delete_event(db, event_id: int, scope: str = "this") -> int:
    current = get_event(db, event_id)
    if scope != "this" and current["series_id"]:
        if scope == "following":
            cur = db.execute(
                "DELETE FROM events WHERE series_id = ? AND date >= ?", (current["series_id"], current["date"])
            )
        else:
            cur = db.execute("DELETE FROM events WHERE series_id = ?", (current["series_id"],))
        return cur.rowcount
    db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    return 1


def create_series(db, data: dict, allow_duplicate: bool) -> int:
    """Creates one event, or a whole series when the data has a `repeat`. Returns the id of the first."""
    repeat = data.pop("repeat", None)
    first = data["date"]
    days = occurrences(first, repeat["every"], repeat["until"]) if repeat else [first]
    if not allow_duplicate:
        found = [d for day in days for d in find_duplicates(db, data["title"], day)]
        if found:
            raise ApiError(409, "duplicate", {"duplicates": found})
    series = uuid.uuid4().hex if len(days) > 1 else None
    ids = [insert_event(db, {**data, "date": day}, series) for day in days]
    return ids[0]
