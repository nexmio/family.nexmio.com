"""The shopping list. Items can be added from a meal plan (the page sends the ingredients; no table is shared)."""

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.db import reader, transaction
from app.core.errors import ApiError

router = APIRouter()
Group = Literal["produce", "dairy", "meat", "pantry", "frozen", "household", "other"]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class ItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    group: Group = "other"


class ItemPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    group: Group | None = None
    done: bool | None = None


class Tick(BaseModel):
    model_config = ConfigDict(extra="forbid")
    done: bool


class Bulk(BaseModel):
    model_config = ConfigDict(extra="forbid")
    titles: Annotated[list[Title], Field(max_length=200)]


def out(r) -> dict:
    return {"id": r["id"], "title": r["title"], "group": r["grp"], "done": bool(r["done"])}


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


@router.get("/ping")
def ping():
    return {"module": "shopping"}


@router.get("/items")
def list_items():
    with reader() as db:
        rows = db.execute("SELECT * FROM shopping_items ORDER BY done, grp, title_key").fetchall()
    return [out(r) for r in rows]


@router.post("/items", status_code=201)
def add_item(body: ItemIn):
    with transaction() as db:
        cur = db.execute(
            "INSERT INTO shopping_items (title, title_key, grp, created_at) VALUES (?,?,?,?)",
            (body.title, body.title.casefold(), body.group, _now()),
        )
        return out(db.execute("SELECT * FROM shopping_items WHERE id = ?", (cur.lastrowid,)).fetchone())


@router.post("/bulk", status_code=201)
def add_many(body: Bulk):
    """Adds what is not already on the open list (same name, ignoring case)."""
    added = 0
    with transaction() as db:
        have = {r["title_key"] for r in db.execute("SELECT title_key FROM shopping_items WHERE done = 0")}
        for title in body.titles:
            key = title.casefold()
            if key in have:
                continue
            db.execute(
                "INSERT INTO shopping_items (title, title_key, grp, created_at) VALUES (?,?, 'other', ?)",
                (title, key, _now()),
            )
            have.add(key)
            added += 1
    return {"added": added, "skipped": len(body.titles) - added}


@router.put("/items/{item_id}")
def update_item(item_id: int, body: ItemPatch):
    with transaction() as db:
        row = db.execute("SELECT * FROM shopping_items WHERE id = ?", (item_id,)).fetchone()
        if row is None:
            raise ApiError(404, "shopping_item_not_found")
        title = body.title or row["title"]
        db.execute(
            "UPDATE shopping_items SET title=?, title_key=?, grp=?, done=? WHERE id=?",
            (title, title.casefold(), body.group or row["grp"], int(body.done) if body.done is not None else row["done"], item_id),
        )
        return out(db.execute("SELECT * FROM shopping_items WHERE id = ?", (item_id,)).fetchone())


@router.post("/items/{item_id}/tick")
def tick(item_id: int, body: Tick):
    """Ticking items off in the shop needs no code (same rule as the to-do list)."""
    with transaction() as db:
        if db.execute("SELECT 1 FROM shopping_items WHERE id = ?", (item_id,)).fetchone() is None:
            raise ApiError(404, "shopping_item_not_found")
        db.execute("UPDATE shopping_items SET done = ? WHERE id = ?", (int(body.done), item_id))
        return out(db.execute("SELECT * FROM shopping_items WHERE id = ?", (item_id,)).fetchone())


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM shopping_items WHERE id = ?", (item_id,)).fetchone() is None:
            raise ApiError(404, "shopping_item_not_found")
        db.execute("DELETE FROM shopping_items WHERE id = ?", (item_id,))
    return Response(status_code=204)


@router.post("/clear-done", status_code=204)
def clear_done():
    with transaction() as db:
        db.execute("DELETE FROM shopping_items WHERE done = 1")
    return Response(status_code=204)
