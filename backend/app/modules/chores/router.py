"""Chores and stars for the children. Stars are earned by ticking chores and spent on a reward."""

from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.db import reader, transaction
from app.core.errors import ApiError
from app.shared.dates import today

router = APIRouter()
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class ChoreIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    member_id: int
    stars: Annotated[int, Field(ge=1, le=10)] = 1
    part: Literal["morning", "evening", "any"] = "any"
    days: Literal["daily", "weekdays", "weekends"] = "daily"


class Tick(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: date
    done: bool


class Goal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    stars: Annotated[int, Field(ge=1, le=1000)]


def _applies(days: str, day: date) -> bool:
    weekend = day.weekday() >= 5
    return days == "daily" or (days == "weekends") == weekend


def out(r) -> dict:
    return {k: r[k] for k in ("id", "title", "member_id", "stars", "part", "days")}


def _check_member(db, member_id: int) -> None:
    if db.execute("SELECT 1 FROM members WHERE id = ?", (member_id,)).fetchone() is None:
        raise ApiError(422, "unknown_member", member_id)


@router.get("/ping")
def ping():
    return {"module": "chores"}


@router.get("/chores")
def list_chores():
    with reader() as db:
        return [out(r) for r in db.execute("SELECT * FROM chores ORDER BY member_id, part, id")]


@router.post("/chores", status_code=201)
def add_chore(body: ChoreIn):
    with transaction() as db:
        _check_member(db, body.member_id)
        cur = db.execute(
            "INSERT INTO chores (title, member_id, stars, part, days) VALUES (?,?,?,?,?)",
            (body.title, body.member_id, body.stars, body.part, body.days),
        )
        return out(db.execute("SELECT * FROM chores WHERE id = ?", (cur.lastrowid,)).fetchone())


@router.put("/chores/{chore_id}")
def update_chore(chore_id: int, body: ChoreIn):
    with transaction() as db:
        if db.execute("SELECT 1 FROM chores WHERE id = ?", (chore_id,)).fetchone() is None:
            raise ApiError(404, "chore_not_found")
        _check_member(db, body.member_id)
        db.execute(
            "UPDATE chores SET title=?, member_id=?, stars=?, part=?, days=? WHERE id=?",
            (body.title, body.member_id, body.stars, body.part, body.days, chore_id),
        )
        return out(db.execute("SELECT * FROM chores WHERE id = ?", (chore_id,)).fetchone())


@router.delete("/chores/{chore_id}", status_code=204)
def delete_chore(chore_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM chores WHERE id = ?", (chore_id,)).fetchone() is None:
            raise ApiError(404, "chore_not_found")
        db.execute("DELETE FROM chores WHERE id = ?", (chore_id,))
    return Response(status_code=204)


@router.get("/day")
def chores_for_day(date: date | None = None):
    day = date or today()
    with reader() as db:
        chores = db.execute("SELECT * FROM chores ORDER BY member_id, part, id").fetchall()
        done = {r["chore_id"] for r in db.execute("SELECT chore_id FROM chore_log WHERE date = ?", (day.isoformat(),))}
    return [{**out(c), "done": c["id"] in done} for c in chores if _applies(c["days"], day)]


@router.post("/chores/{chore_id}/tick")
def tick_chore(chore_id: int, body: Tick):
    """Children tick their own chores: no code, but only for today or yesterday."""
    now = today()
    if body.date not in (now, now - timedelta(days=1)):
        raise ApiError(422, "date_not_allowed")
    with transaction() as db:
        chore = db.execute("SELECT * FROM chores WHERE id = ?", (chore_id,)).fetchone()
        if chore is None:
            raise ApiError(404, "chore_not_found")
        day = body.date.isoformat()
        have = db.execute("SELECT 1 FROM chore_log WHERE chore_id = ? AND date = ?", (chore_id, day)).fetchone()
        if body.done and not have:
            db.execute(
                "INSERT INTO chore_log (chore_id, member_id, date, stars) VALUES (?,?,?,?)",
                (chore_id, chore["member_id"], day, chore["stars"]),
            )
        elif not body.done and have:
            db.execute("DELETE FROM chore_log WHERE chore_id = ? AND date = ?", (chore_id, day))
    return {"id": chore_id, "date": day, "done": body.done}


def _balance(db, member_id: int) -> int:
    earned = db.execute("SELECT COALESCE(SUM(stars), 0) AS n FROM chore_log WHERE member_id = ?", (member_id,)).fetchone()["n"]
    spent = db.execute("SELECT COALESCE(SUM(amount), 0) AS n FROM star_spent WHERE member_id = ?", (member_id,)).fetchone()["n"]
    return earned - spent


@router.get("/stars")
def stars():
    now = today()
    week_start = (now - timedelta(days=now.weekday())).isoformat()
    result = []
    with reader() as db:
        ids = {r["member_id"] for r in db.execute("SELECT member_id FROM chores")}
        ids |= {r["member_id"] for r in db.execute("SELECT member_id FROM goals")}
        for member_id in sorted(ids):
            goal = db.execute("SELECT title, stars FROM goals WHERE member_id = ?", (member_id,)).fetchone()
            q = "SELECT COALESCE(SUM(stars), 0) AS n FROM chore_log WHERE member_id = ? AND date >= ?"
            result.append({
                "member_id": member_id,
                "balance": _balance(db, member_id),
                "today": db.execute(q, (member_id, now.isoformat())).fetchone()["n"],
                "week": db.execute(q, (member_id, week_start)).fetchone()["n"],
                "goal": dict(goal) if goal else None,
            })
    return result


@router.put("/goals/{member_id}")
def set_goal(member_id: int, body: Goal):
    with transaction() as db:
        _check_member(db, member_id)
        db.execute(
            "INSERT INTO goals (member_id, title, stars) VALUES (?,?,?) "
            "ON CONFLICT(member_id) DO UPDATE SET title = excluded.title, stars = excluded.stars",
            (member_id, body.title, body.stars),
        )
    return {"member_id": member_id, "title": body.title, "stars": body.stars}


@router.delete("/goals/{member_id}", status_code=204)
def clear_goal(member_id: int):
    with transaction() as db:
        db.execute("DELETE FROM goals WHERE member_id = ?", (member_id,))
    return Response(status_code=204)


@router.post("/goals/{member_id}/claim")
def claim_goal(member_id: int):
    """The reward is given: its stars are spent."""
    with transaction() as db:
        goal = db.execute("SELECT title, stars FROM goals WHERE member_id = ?", (member_id,)).fetchone()
        if goal is None:
            raise ApiError(404, "goal_not_found")
        if _balance(db, member_id) < goal["stars"]:
            raise ApiError(409, "not_enough_stars")
        db.execute(
            "INSERT INTO star_spent (member_id, amount, title, created_at) VALUES (?,?,?,?)",
            (member_id, goal["stars"], goal["title"], datetime.now(UTC).isoformat(timespec="seconds")),
        )
        return {"member_id": member_id, "balance": _balance(db, member_id)}
