"""Runs the numbered .sql files in app/migrations once each."""

from datetime import UTC, datetime
from pathlib import Path

from app.core.db import connect

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"


def migrate() -> list[str]:
    conn = connect()
    applied_now: list[str] = []
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
        )
        done = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
        for path in sorted(MIGRATIONS.glob("*.sql")):
            if path.name in done:
                continue
            conn.executescript("BEGIN;\n" + path.read_text(encoding="utf-8") + "\nCOMMIT;")
            conn.execute(
                "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
                (path.name, datetime.now(UTC).isoformat(timespec="seconds")),
            )
            applied_now.append(path.name)
    finally:
        conn.close()
    return applied_now
