"""Core extras: the weather (from Open-Meteo) and a backup of everything as one file."""

import json
import sqlite3
import tempfile
import time
import urllib.request
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.access_code import require_code
from app.core.config import data_dir
from app.core.db import reader, transaction

router = APIRouter()
CACHE_SECONDS = 30 * 60
_cache: dict[tuple[float, float], tuple[float, dict]] = {}


class Location(BaseModel):
    model_config = ConfigDict(extra="forbid")
    place: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
    lat: Annotated[float, Field(ge=-90, le=90)]
    lon: Annotated[float, Field(ge=-180, le=180)]


def fetch_forecast(lat: float, lon: float) -> dict:
    """Asks Open-Meteo (free, no key). Only the coordinates leave the house. Replaced in tests."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,weather_code,wind_speed_10m"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FCopenhagen&forecast_days=4"
    )
    with urllib.request.urlopen(url, timeout=4) as res:  # noqa: S310 (fixed https address)
        return json.load(res)


def _settings(db) -> dict:
    return {r["key"]: r["value"] for r in db.execute("SELECT key, value FROM settings")}


@router.get("/weather")
def weather():
    with reader() as db:
        s = _settings(db)
    if "weather_lat" not in s:
        return {"configured": False}
    lat, lon = float(s["weather_lat"]), float(s["weather_lon"])
    place = s.get("weather_place", "")
    cached = _cache.get((lat, lon))
    if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
        return {"configured": True, "place": place, **cached[1]}
    try:
        raw = fetch_forecast(lat, lon)
        data = {
            "now": {"temp": round(raw["current"]["temperature_2m"]), "code": raw["current"]["weather_code"],
                    "wind": round(raw["current"]["wind_speed_10m"])},
            "days": [
                {"date": d, "code": c, "max": round(hi), "min": round(lo)}
                for d, c, hi, lo in zip(
                    raw["daily"]["time"], raw["daily"]["weather_code"],
                    raw["daily"]["temperature_2m_max"], raw["daily"]["temperature_2m_min"], strict=True,
                )
            ],
        }
    except Exception:  # offline or the service is down: show the last answer, or say it is unavailable
        if cached:
            return {"configured": True, "place": place, "stale": True, **cached[1]}
        return {"configured": True, "place": place, "unavailable": True}
    _cache[(lat, lon)] = (time.monotonic(), data)
    return {"configured": True, "place": place, **data}


@router.put("/weather/location", dependencies=[Depends(require_code)])
def set_location(body: Location):
    with transaction() as db:
        for key, value in (("weather_lat", body.lat), ("weather_lon", body.lon), ("weather_place", body.place)):
            db.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, str(value)),
            )
    _cache.clear()
    return {"place": body.place, "lat": body.lat, "lon": body.lon}


@router.delete("/weather/location", status_code=204, dependencies=[Depends(require_code)])
def clear_location():
    with transaction() as db:
        db.execute("DELETE FROM settings WHERE key IN ('weather_lat', 'weather_lon', 'weather_place')")
    _cache.clear()


@router.get("/backup", dependencies=[Depends(require_code)])
def backup(background: BackgroundTasks):
    """One zip with the database (a safe copy) and all photos. Unpack it into a new data folder to restore."""
    tmp = Path(tempfile.mkdtemp())
    snapshot = tmp / "app.db"
    source = sqlite3.connect(data_dir() / "app.db")
    target = sqlite3.connect(snapshot)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()
    archive = tmp / "backup.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(snapshot, "app.db")
        photos = data_dir() / "photos"
        if photos.is_dir():
            for f in sorted(photos.iterdir()):
                if f.is_file():
                    z.write(f, f"photos/{f.name}")
    background.add_task(lambda: [p.unlink(missing_ok=True) for p in (snapshot, archive)] and tmp.rmdir())
    name = f"nexmio-family-backup-{datetime.now(UTC):%Y%m%d}.zip"
    return FileResponse(archive, media_type="application/zip", filename=name)


