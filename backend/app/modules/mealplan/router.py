from datetime import date as Date
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.db import reader, transaction
from app.core.errors import ApiError
from app.shared.dates import validate_range, week_days

router = APIRouter()

DishName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class DayIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: Date
    dish: DishName | None = None
    note: Note | None = None


class WeekIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    days: list[DayIn]


def _lines(text: str) -> list[str]:
    return [x.strip() for x in (text or "").splitlines() if x.strip()]


def _day(row, day: Date) -> dict:
    if row is None:
        return {"date": day.isoformat(), "dish": None, "note": None}
    return {
        "date": day.isoformat(),
        "dish": {"id": row["dish_id"], "name": row["name"], "favorite": bool(row["favorite"]),
                 "ingredients": _lines(row["ingredients"])},
        "note": row["note"],
    }


def _rows(db, start: Date, end: Date) -> dict[str, object]:
    rows = db.execute(
        "SELECT m.date, m.dish_id, m.note, d.name, d.ingredients, d.favorite FROM meal_days m JOIN dishes d ON d.id = m.dish_id"
        " WHERE m.date >= ? AND m.date <= ? ORDER BY m.date",
        (start.isoformat(), end.isoformat()),
    )
    return {r["date"]: r for r in rows}


@router.get("/ping")
def ping():
    return {"module": "mealplan"}


@router.get("/weeks/{year}/{week}")
def get_week(year: int, week: int):
    days = week_days(year, week)
    with reader() as db:
        rows = _rows(db, days[0], days[-1])
    return {"year": year, "week": week, "days": [_day(rows.get(d.isoformat()), d) for d in days]}


@router.put("/weeks/{year}/{week}")
def put_week(year: int, week: int, body: WeekIn):
    days = week_days(year, week)
    allowed = {d for d in days}
    seen: set[Date] = set()
    for item in body.days:
        if item.date not in allowed:
            raise ApiError(422, "date_outside_week", item.date.isoformat())
        if item.date in seen:
            raise ApiError(422, "duplicate_date", item.date.isoformat())
        seen.add(item.date)
    with transaction() as db:
        db.execute(
            "DELETE FROM meal_days WHERE date >= ? AND date <= ?",
            (days[0].isoformat(), days[-1].isoformat()),
        )
        for item in body.days:
            if not item.dish:
                continue
            key = item.dish.casefold()
            row = db.execute("SELECT id, last_used FROM dishes WHERE name_key = ?", (key,)).fetchone()
            day = item.date.isoformat()
            if row is None:
                dish_id = db.execute(
                    "INSERT INTO dishes (name, name_key, last_used) VALUES (?,?,?)",
                    (item.dish, key, day),
                ).lastrowid
            else:
                dish_id = row["id"]
                if row["last_used"] is None or row["last_used"] < day:
                    db.execute("UPDATE dishes SET last_used = ? WHERE id = ?", (day, dish_id))
            db.execute(
                "INSERT INTO meal_days (date, dish_id, note) VALUES (?,?,?)",
                (day, dish_id, item.note or None),
            )
        rows = _rows(db, days[0], days[-1])
    return {"year": year, "week": week, "days": [_day(rows.get(d.isoformat()), d) for d in days]}


@router.get("/days")
def get_days(start: Date = Query(alias="from"), end: Date = Query(alias="to")):
    validate_range(start, end)
    with reader() as db:
        rows = _rows(db, start, end)
    return [_day(r, Date.fromisoformat(k)) for k, r in sorted(rows.items())]


class DishPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    favorite: bool | None = None
    ingredients: Annotated[list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]], Field(max_length=40)] | None = None


def _dish(r) -> dict:
    return {"id": r["id"], "name": r["name"], "last_used": r["last_used"],
            "favorite": bool(r["favorite"]), "ingredients": _lines(r["ingredients"])}


@router.get("/dishes")
def get_dishes(search: str = "", favorites: bool = False):
    needle = search.strip().casefold()
    with reader() as db:
        rows = db.execute(
            "SELECT * FROM dishes ORDER BY favorite DESC, (last_used IS NULL), last_used DESC, name"
        ).fetchall()
    hits = [r for r in rows if needle in r["name"].casefold() and (r["favorite"] or not favorites)]
    return [_dish(r) for r in hits[:20 if not favorites else 60]]


@router.put("/dishes/{dish_id}")
def patch_dish(dish_id: int, body: DishPatch):
    with transaction() as db:
        row = db.execute("SELECT * FROM dishes WHERE id = ?", (dish_id,)).fetchone()
        if row is None:
            raise ApiError(404, "dish_not_found")
        favorite = int(body.favorite) if body.favorite is not None else row["favorite"]
        ingredients = "\n".join(body.ingredients) if body.ingredients is not None else row["ingredients"]
        db.execute("UPDATE dishes SET favorite = ?, ingredients = ? WHERE id = ?", (favorite, ingredients, dish_id))
        return _dish(db.execute("SELECT * FROM dishes WHERE id = ?", (dish_id,)).fetchone())
