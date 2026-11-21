"""The family members (profiles). Core data: events point at a member, members never point back."""

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict, StringConstraints

from app.core.db import reader, transaction
from app.core.errors import ApiError

Color = Literal["coral", "orange", "amber", "lime", "teal", "sky", "indigo", "violet", "pink", "slate"]
PALETTE: tuple[str, ...] = (
    "coral", "sky", "lime", "violet", "amber", "teal", "pink", "indigo", "orange", "slate",
)
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]

router = APIRouter()


class MemberIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Name
    color: Color


def key(name: str) -> str:
    return name.strip().casefold()


def out(row) -> dict:
    return {"id": row["id"], "name": row["name"], "color": row["color"]}


def next_color(db) -> str:
    used = {r["color"] for r in db.execute("SELECT color FROM members")}
    return next((c for c in PALETTE if c not in used), PALETTE[len(used) % len(PALETTE)])


def create_member(db, name: str, color: str | None = None) -> int:
    """Used by the API and by the import (which adds people it has not met before)."""
    cur = db.execute(
        "INSERT INTO members (name, name_key, color, created_at) VALUES (?,?,?,?)",
        (name.strip(), key(name), color or next_color(db), datetime.now(UTC).isoformat(timespec="seconds")),
    )
    return int(cur.lastrowid)


def find_by_name(db, name: str):
    return db.execute("SELECT * FROM members WHERE name_key = ?", (key(name),)).fetchone()


@router.get("")
def list_members():
    with reader() as db:
        return [out(r) for r in db.execute("SELECT * FROM members ORDER BY id")]


@router.post("", status_code=201)
def add_member(body: MemberIn):
    with transaction() as db:
        if find_by_name(db, body.name):
            raise ApiError(409, "member_name_taken")
        member_id = create_member(db, body.name, body.color)
        return out(db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone())


@router.put("/{member_id}")
def update_member(member_id: int, body: MemberIn):
    with transaction() as db:
        if db.execute("SELECT 1 FROM members WHERE id = ?", (member_id,)).fetchone() is None:
            raise ApiError(404, "member_not_found")
        clash = find_by_name(db, body.name)
        if clash and clash["id"] != member_id:
            raise ApiError(409, "member_name_taken")
        db.execute(
            "UPDATE members SET name = ?, name_key = ?, color = ? WHERE id = ?",
            (body.name, key(body.name), body.color, member_id),
        )
        return out(db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone())


@router.delete("/{member_id}", status_code=204)
def delete_member(member_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM members WHERE id = ?", (member_id,)).fetchone() is None:
            raise ApiError(404, "member_not_found")
        db.execute("DELETE FROM members WHERE id = ?", (member_id,))
    return Response(status_code=204)
