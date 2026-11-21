"""Links to a read-only plan for someone who is helping out (a babysitter, a grandparent).

The link only opens a page that shows the next days. It can be removed at any time and runs out by itself.
The plan itself is as open as it always is on the home network."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.access_code import require_code
from app.core.db import reader, transaction
from app.core.errors import ApiError

router = APIRouter()


class LinkIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    days: Annotated[int, Field(ge=1, le=60)] = 7        # how many days of the plan the page shows
    valid_days: Annotated[int, Field(ge=1, le=365)] = 14  # how long the link works


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(UTC)


@router.get("/ping")
def ping():
    return {"module": "share"}


@router.post("/links", status_code=201)
def create_link(body: LinkIn):
    token = secrets.token_urlsafe(18)
    expires = _now() + timedelta(days=body.valid_days)
    with transaction() as db:
        cur = db.execute(
            "INSERT INTO share_links (token_hash, label, days, expires_at, created_at) VALUES (?,?,?,?,?)",
            (_hash(token), body.label, body.days, expires.isoformat(), _now().isoformat(timespec="seconds")),
        )
    # the token is shown only now; only its hash is kept
    return {"id": cur.lastrowid, "token": token, "path": f"/share/{token}", "expires_at": expires.isoformat()}


@router.get("/links", dependencies=[Depends(require_code)])
def list_links():
    with reader() as db:
        rows = db.execute("SELECT id, label, days, expires_at, created_at FROM share_links ORDER BY id DESC").fetchall()
    return [{**dict(r), "active": r["expires_at"] > _now().isoformat()} for r in rows]


@router.delete("/links/{link_id}", status_code=204)
def delete_link(link_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM share_links WHERE id = ?", (link_id,)).fetchone() is None:
            raise ApiError(404, "link_not_found")
        db.execute("DELETE FROM share_links WHERE id = ?", (link_id,))
    return Response(status_code=204)


@router.get("/view/{token}")
def view(token: str):
    with reader() as db:
        row = db.execute("SELECT label, days, expires_at FROM share_links WHERE token_hash = ?", (_hash(token),)).fetchone()
    if row is None or row["expires_at"] <= _now().isoformat():
        raise ApiError(404, "link_not_found")
    return {"label": row["label"], "days": row["days"], "expires_at": row["expires_at"]}
