from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict, StringConstraints

from app.core.db import reader, transaction
from app.core.errors import ApiError

router = APIRouter()
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


Repeat = Literal["", "daily", "weekly"]


class ItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    member_id: int | None = None
    due: date | None = None
    repeat: Repeat = ""


class ItemPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    done: bool | None = None
    member_id: int | None = None
    set_member: bool = False  # true: member_id is applied even when it is null
    due: date | None = None
    repeat: Repeat | None = None


def out(row) -> dict:
    return {"id": row["id"], "title": row["title"], "done": bool(row["done"]), "member_id": row["member_id"],
            "due": row["due"], "repeat": row["repeat"]}


def _check_member(db, member_id: int | None) -> None:
    if member_id is not None and db.execute("SELECT 1 FROM members WHERE id = ?", (member_id,)).fetchone() is None:
        raise ApiError(422, "unknown_member", member_id)


def _spawn_next(db, item_id: int) -> None:
    """A repeating task that is done comes back as a new open one on its next day."""
    row = db.execute("SELECT * FROM todos WHERE id = ?", (item_id,)).fetchone()
    if not row or not row["repeat"]:
        return
    base = date.fromisoformat(row["due"]) if row["due"] else date.today()
    nxt = base + timedelta(days=1 if row["repeat"] == "daily" else 7)
    db.execute(
        "INSERT INTO todos (title, member_id, due, repeat, created_at) VALUES (?,?,?,?,?)",
        (row["title"], row["member_id"], nxt.isoformat(), row["repeat"], datetime.now(UTC).isoformat(timespec="seconds")),
    )
    db.execute("UPDATE todos SET repeat = '' WHERE id = ?", (item_id,))


@router.get("/ping")
def ping():
    return {"module": "todo"}


@router.get("/items")
def list_items():
    with reader() as db:
        rows = db.execute("SELECT * FROM todos ORDER BY done, (due IS NULL), due, id").fetchall()
    return [out(r) for r in rows]


@router.post("/items", status_code=201)
def add_item(body: ItemIn):
    with transaction() as db:
        _check_member(db, body.member_id)
        cur = db.execute(
            "INSERT INTO todos (title, member_id, due, repeat, created_at) VALUES (?,?,?,?,?)",
            (body.title, body.member_id, body.due.isoformat() if body.due else None, body.repeat,
             datetime.now(UTC).isoformat(timespec="seconds")),
        )
        return out(db.execute("SELECT * FROM todos WHERE id = ?", (cur.lastrowid,)).fetchone())


@router.put("/items/{item_id}")
def update_item(item_id: int, body: ItemPatch):
    with transaction() as db:
        row = db.execute("SELECT * FROM todos WHERE id = ?", (item_id,)).fetchone()
        if row is None:
            raise ApiError(404, "todo_not_found")
        title = body.title if body.title is not None else row["title"]
        done = int(body.done) if body.done is not None else row["done"]
        member = body.member_id if (body.set_member or "member_id" in body.model_fields_set) else row["member_id"]
        due = (body.due.isoformat() if body.due else None) if "due" in body.model_fields_set else row["due"]
        repeat = body.repeat if body.repeat is not None else row["repeat"]
        _check_member(db, member)
        db.execute("UPDATE todos SET title=?, done=?, member_id=?, due=?, repeat=? WHERE id=?",
                   (title, done, member, due, repeat, item_id))
        if done and not row["done"]:
            _spawn_next(db, item_id)
        return out(db.execute("SELECT * FROM todos WHERE id = ?", (item_id,)).fetchone())


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM todos WHERE id = ?", (item_id,)).fetchone() is None:
            raise ApiError(404, "todo_not_found")
        db.execute("DELETE FROM todos WHERE id = ?", (item_id,))
    return Response(status_code=204)


@router.post("/clear-done", status_code=204)
def clear_done():
    with transaction() as db:
        db.execute("DELETE FROM todos WHERE done = 1")
    return Response(status_code=204)


class Tick(BaseModel):
    model_config = ConfigDict(extra="forbid")
    done: bool


@router.post("/items/{item_id}/tick")
def tick_item(item_id: int, body: Tick):
    """Ticking a task on and off needs no code (decision 46). Adding, renaming and deleting still do."""
    with transaction() as db:
        if db.execute("SELECT 1 FROM todos WHERE id = ?", (item_id,)).fetchone() is None:
            raise ApiError(404, "todo_not_found")
        was = db.execute("SELECT done FROM todos WHERE id = ?", (item_id,)).fetchone()["done"]
        db.execute("UPDATE todos SET done = ? WHERE id = ?", (int(body.done), item_id))
        if body.done and not was:
            _spawn_next(db, item_id)
        return out(db.execute("SELECT * FROM todos WHERE id = ?", (item_id,)).fetchone())
