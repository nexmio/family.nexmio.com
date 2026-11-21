"""A small message board for the family ("Remember wellies tomorrow!")."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.db import reader, transaction
from app.core.errors import ApiError

router = APIRouter()


class MessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    days: Annotated[int, Field(ge=1, le=60)] | None = None  # None: stays until it is removed


def out(r) -> dict:
    return {"id": r["id"], "text": r["text"], "created_at": r["created_at"], "expires_at": r["expires_at"]}


def _now() -> datetime:
    return datetime.now(UTC)


@router.get("/ping")
def ping():
    return {"module": "board"}


@router.get("/messages")
def list_messages():
    with reader() as db:
        rows = db.execute(
            "SELECT * FROM board WHERE expires_at IS NULL OR expires_at > ? ORDER BY id DESC", (_now().isoformat(),)
        ).fetchall()
    return [out(r) for r in rows]


@router.post("/messages", status_code=201)
def add_message(body: MessageIn):
    expires = (_now() + timedelta(days=body.days)).isoformat() if body.days else None
    with transaction() as db:
        db.execute("DELETE FROM board WHERE expires_at IS NOT NULL AND expires_at < ?", (_now().isoformat(),))
        cur = db.execute(
            "INSERT INTO board (text, created_at, expires_at) VALUES (?,?,?)",
            (body.text, _now().isoformat(timespec="seconds"), expires),
        )
        return out(db.execute("SELECT * FROM board WHERE id = ?", (cur.lastrowid,)).fetchone())


@router.delete("/messages/{message_id}", status_code=204)
def delete_message(message_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM board WHERE id = ?", (message_id,)).fetchone() is None:
            raise ApiError(404, "message_not_found")
        db.execute("DELETE FROM board WHERE id = ?", (message_id,))
    return Response(status_code=204)
