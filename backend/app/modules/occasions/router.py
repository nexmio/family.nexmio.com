"""Birthdays and other yearly days, and countdowns to a day."""

import calendar
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.core.db import reader, transaction
from app.core.errors import ApiError
from app.shared.dates import today

router = APIRouter()
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class OccasionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    month: Annotated[int, Field(ge=1, le=12)]
    day: Annotated[int, Field(ge=1, le=31)]
    year: Annotated[int, Field(ge=1900, le=2200)] | None = None
    member_id: int | None = None

    @model_validator(mode="after")
    def real_day(self):
        if self.day > calendar.monthrange(2024, self.month)[1]:  # 2024 is a leap year: 29 Feb is allowed
            raise ValueError("no such day")
        return self


class CountdownIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    date: date


def next_date(month: int, day: int, start: date) -> date:
    """The next time this day comes (29 Feb waits for the next leap year)."""
    year = start.year
    for _ in range(9):
        if day <= calendar.monthrange(year, month)[1]:
            candidate = date(year, month, day)
            if candidate >= start:
                return candidate
        year += 1
    raise ValueError("unreachable")


def _occasion(r, now: date) -> dict:
    nxt = next_date(r["month"], r["day"], now)
    return {
        "id": r["id"], "title": r["title"], "month": r["month"], "day": r["day"], "year": r["year"],
        "member_id": r["member_id"], "next": nxt.isoformat(), "days_until": (nxt - now).days,
        "turns": nxt.year - r["year"] if r["year"] else None,
    }


@router.get("/ping")
def ping():
    return {"module": "occasions"}


@router.get("/occasions")
def list_occasions(within: int | None = None):
    """All yearly days, the nearest first. `within` keeps only those at most that many days away."""
    now = today()
    with reader() as db:
        rows = [_occasion(r, now) for r in db.execute("SELECT * FROM occasions")]
    rows.sort(key=lambda o: (o["days_until"], o["title"]))
    return [o for o in rows if within is None or o["days_until"] <= within]


def _check_member(db, member_id):
    if member_id is not None and db.execute("SELECT 1 FROM members WHERE id = ?", (member_id,)).fetchone() is None:
        raise ApiError(422, "unknown_member", member_id)


@router.post("/occasions", status_code=201)
def add_occasion(body: OccasionIn):
    with transaction() as db:
        _check_member(db, body.member_id)
        cur = db.execute(
            "INSERT INTO occasions (title, month, day, year, member_id) VALUES (?,?,?,?,?)",
            (body.title, body.month, body.day, body.year, body.member_id),
        )
        return _occasion(db.execute("SELECT * FROM occasions WHERE id = ?", (cur.lastrowid,)).fetchone(), today())


@router.put("/occasions/{occasion_id}")
def update_occasion(occasion_id: int, body: OccasionIn):
    with transaction() as db:
        if db.execute("SELECT 1 FROM occasions WHERE id = ?", (occasion_id,)).fetchone() is None:
            raise ApiError(404, "occasion_not_found")
        _check_member(db, body.member_id)
        db.execute(
            "UPDATE occasions SET title=?, month=?, day=?, year=?, member_id=? WHERE id=?",
            (body.title, body.month, body.day, body.year, body.member_id, occasion_id),
        )
        return _occasion(db.execute("SELECT * FROM occasions WHERE id = ?", (occasion_id,)).fetchone(), today())


@router.delete("/occasions/{occasion_id}", status_code=204)
def delete_occasion(occasion_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM occasions WHERE id = ?", (occasion_id,)).fetchone() is None:
            raise ApiError(404, "occasion_not_found")
        db.execute("DELETE FROM occasions WHERE id = ?", (occasion_id,))
    return Response(status_code=204)


def _countdown(r, now: date) -> dict:
    return {"id": r["id"], "title": r["title"], "date": r["date"], "days_left": (date.fromisoformat(r["date"]) - now).days}


@router.get("/countdowns")
def list_countdowns():
    """Countdowns that have not passed, the nearest first."""
    now = today()
    with reader() as db:
        rows = [_countdown(r, now) for r in db.execute("SELECT * FROM countdowns")]
    return sorted((c for c in rows if c["days_left"] >= 0), key=lambda c: c["days_left"])


@router.post("/countdowns", status_code=201)
def add_countdown(body: CountdownIn):
    with transaction() as db:
        cur = db.execute("INSERT INTO countdowns (title, date) VALUES (?,?)", (body.title, body.date.isoformat()))
        return _countdown(db.execute("SELECT * FROM countdowns WHERE id = ?", (cur.lastrowid,)).fetchone(), today())


@router.delete("/countdowns/{countdown_id}", status_code=204)
def delete_countdown(countdown_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM countdowns WHERE id = ?", (countdown_id,)).fetchone() is None:
            raise ApiError(404, "countdown_not_found")
        db.execute("DELETE FROM countdowns WHERE id = ?", (countdown_id,))
    return Response(status_code=204)
