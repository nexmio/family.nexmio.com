"""Family photos for the slideshow. Files live in data/photos/, rows in app.db."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, StringConstraints

from app.core.config import data_dir
from app.core.db import reader, transaction
from app.core.errors import ApiError

router = APIRouter()
MAX_BYTES = 15_000_000


def photo_dir():
    path = data_dir() / "photos"
    path.mkdir(parents=True, exist_ok=True)
    return path


def sniff(raw: bytes) -> tuple[str, str] | None:
    """The real type of an image, from its first bytes (not from what the client says)."""
    if raw.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "png"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "image/webp", "webp"
    if raw[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif", "gif"
    return None


class AlbumIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class PhotoPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    album_id: int | None = None


@router.get("/ping")
def ping():
    return {"module": "photos"}


@router.get("/albums")
def list_albums():
    with reader() as db:
        rows = db.execute(
            "SELECT a.id, a.name, COUNT(p.id) AS count FROM albums a "
            "LEFT JOIN photos p ON p.album_id = a.id GROUP BY a.id ORDER BY a.name"
        ).fetchall()
        loose = db.execute("SELECT COUNT(*) AS n FROM photos WHERE album_id IS NULL").fetchone()["n"]
    return {"albums": [dict(r) for r in rows], "without_album": loose}


@router.post("/albums", status_code=201)
def add_album(body: AlbumIn):
    key = body.name.casefold()
    with transaction() as db:
        if db.execute("SELECT 1 FROM albums WHERE name_key = ?", (key,)).fetchone():
            raise ApiError(409, "album_name_taken")
        cur = db.execute("INSERT INTO albums (name, name_key) VALUES (?, ?)", (body.name, key))
        return {"id": cur.lastrowid, "name": body.name, "count": 0}


@router.delete("/albums/{album_id}", status_code=204)
def delete_album(album_id: int):
    with transaction() as db:
        if db.execute("SELECT 1 FROM albums WHERE id = ?", (album_id,)).fetchone() is None:
            raise ApiError(404, "album_not_found")
        db.execute("DELETE FROM albums WHERE id = ?", (album_id,))
    return Response(status_code=204)


@router.get("/photos")
def list_photos(albums: str | None = None):
    """albums: comma separated album ids and/or `none`; empty means every photo."""
    sql, params = "SELECT id, album_id, created_at FROM photos", []
    if albums:
        try:
            wanted = [None if a.strip() == "none" else int(a) for a in albums.split(",") if a.strip()]
        except ValueError as exc:
            raise ApiError(422, "invalid_album_filter") from exc
        ids = [a for a in wanted if a is not None]
        parts = []
        if ids:
            parts.append(f"album_id IN ({','.join('?' * len(ids))})")
            params += ids
        if None in wanted:
            parts.append("album_id IS NULL")
        if parts:
            sql += " WHERE " + " OR ".join(parts)
    with reader() as db:
        return [dict(r) for r in db.execute(sql + " ORDER BY id DESC", params)]


@router.post("/photos", status_code=201)
async def upload_photo(request: Request, album_id: int | None = None):
    raw = await request.body()
    if len(raw) > MAX_BYTES:
        raise ApiError(413, "photo_too_large")
    kind = sniff(raw)
    if kind is None:
        raise ApiError(422, "not_an_image")
    content_type, ext = kind
    name = f"{uuid.uuid4().hex}.{ext}"
    with transaction() as db:
        if album_id is not None and db.execute("SELECT 1 FROM albums WHERE id = ?", (album_id,)).fetchone() is None:
            raise ApiError(422, "album_not_found")
        (photo_dir() / name).write_bytes(raw)
        cur = db.execute(
            "INSERT INTO photos (filename, content_type, album_id, created_at) VALUES (?,?,?,?)",
            (name, content_type, album_id, datetime.now(UTC).isoformat(timespec="seconds")),
        )
        return {"id": cur.lastrowid, "album_id": album_id}


@router.get("/photos/{photo_id}/file")
def photo_file(photo_id: int):
    with reader() as db:
        row = db.execute("SELECT filename, content_type FROM photos WHERE id = ?", (photo_id,)).fetchone()
    if row is None or not (photo_dir() / row["filename"]).exists():
        raise ApiError(404, "photo_not_found")
    return FileResponse(
        photo_dir() / row["filename"], media_type=row["content_type"],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.put("/photos/{photo_id}")
def move_photo(photo_id: int, body: PhotoPatch):
    with transaction() as db:
        if db.execute("SELECT 1 FROM photos WHERE id = ?", (photo_id,)).fetchone() is None:
            raise ApiError(404, "photo_not_found")
        album = db.execute("SELECT 1 FROM albums WHERE id = ?", (body.album_id,)).fetchone()
        if body.album_id is not None and album is None:
            raise ApiError(422, "album_not_found")
        db.execute("UPDATE photos SET album_id = ? WHERE id = ?", (body.album_id, photo_id))
    return {"id": photo_id, "album_id": body.album_id}


@router.delete("/photos/{photo_id}", status_code=204)
def delete_photo(photo_id: int):
    with transaction() as db:
        row = db.execute("SELECT filename FROM photos WHERE id = ?", (photo_id,)).fetchone()
        if row is None:
            raise ApiError(404, "photo_not_found")
        db.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
    (photo_dir() / row["filename"]).unlink(missing_ok=True)
    return Response(status_code=204)
