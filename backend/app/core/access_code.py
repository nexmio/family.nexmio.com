"""The shared family code (section 8): argon2id hash, checked on the server, rate limited."""

import hashlib
import secrets
import time
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Request

from app.core.config import MIN_CODE_LENGTH
from app.core.db import reader, transaction
from app.core.errors import ApiError

HEADER = "X-Family-Code"
SESSION_COOKIE = "nexmio_session"
SESSION_DAYS = 30
CLIENT_HEADER = ("X-Requested-With", "nexmio")
MAX_FAILURES = 5
WINDOW_SECONDS = 60
BLOCK_SECONDS = 300

_hasher = PasswordHasher()
_failures: dict[str, list[float]] = {}
_blocked_until: dict[str, float] = {}


def reset_rate_limits() -> None:
    _failures.clear()
    _blocked_until.clear()


def is_set() -> bool:
    return _get_hash() is not None


def _get_hash() -> str | None:
    with reader() as db:
        row = db.execute("SELECT value FROM settings WHERE key = 'code_hash'").fetchone()
    return row["value"] if row else None


def set_code(code: str) -> None:
    if len(code) < MIN_CODE_LENGTH:
        raise ValueError(f"The code must be at least {MIN_CODE_LENGTH} characters")
    with transaction() as db:
        db.execute(
            "INSERT INTO settings (key, value) VALUES ('code_hash', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (_hasher.hash(code),),
        )


def _matches(stored: str, code: str) -> bool:
    try:
        return _hasher.verify(stored, code)
    except (VerifyMismatchError, InvalidHashError):
        return False


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _check_blocked(ip: str) -> None:
    until = _blocked_until.get(ip)
    if until is None:
        return
    remaining = until - time.monotonic()
    if remaining <= 0:
        _blocked_until.pop(ip, None)
        return
    raise ApiError(
        429, "too_many_attempts", headers={"Retry-After": str(int(remaining) + 1)}
    )


def _register_failure(ip: str) -> None:
    now = time.monotonic()
    recent = [t for t in _failures.get(ip, []) if now - t < WINDOW_SECONDS]
    recent.append(now)
    _failures[ip] = recent
    if len(recent) >= MAX_FAILURES:
        _blocked_until[ip] = now + BLOCK_SECONDS
        _failures.pop(ip, None)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session() -> str:
    """A login that lasts SESSION_DAYS. Only a hash of the token is stored."""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(days=SESSION_DAYS)
    with transaction() as db:
        db.execute("DELETE FROM sessions WHERE expires_at < ?", (datetime.now(UTC).isoformat(),))
        db.execute(
            "INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)",
            (_token_hash(token), expires.isoformat()),
        )
    return token


def session_valid(token: str | None) -> bool:
    if not token:
        return False
    with reader() as db:
        row = db.execute(
            "SELECT expires_at FROM sessions WHERE token_hash = ?", (_token_hash(token),)
        ).fetchone()
    return bool(row) and row["expires_at"] > datetime.now(UTC).isoformat()


def end_session(token: str | None, keep: bool = False) -> None:
    """Logs one session out; with keep=True it logs everyone else out instead."""
    with transaction() as db:
        if token and not keep:
            db.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))
        elif token and keep:
            db.execute("DELETE FROM sessions WHERE token_hash != ?", (_token_hash(token),))
        else:
            db.execute("DELETE FROM sessions")


def check_code(request: Request, code: str) -> None:
    """Rate limited check of a typed code (used by the login and by the code header)."""
    ip = _client_ip(request)
    _check_blocked(ip)
    stored = _get_hash()
    if stored is None:
        raise ApiError(503, "code_not_set")
    if not code or not _matches(stored, code):
        if code:
            _register_failure(ip)
        raise ApiError(401, "wrong_code")


def require_code(request: Request) -> None:
    """Raises ApiError unless the request has the code in its header or a valid admin login."""
    ip = _client_ip(request)
    _check_blocked(ip)
    if _get_hash() is None:
        raise ApiError(503, "code_not_set")
    code = request.headers.get(HEADER)
    if code:
        check_code(request, code)
        return
    if session_valid(request.cookies.get(SESSION_COOKIE)):
        # a login cookie is sent by the browser on its own, so changes must also carry our own header
        header_ok = request.headers.get(CLIENT_HEADER[0]) == CLIENT_HEADER[1]
        if request.method not in ("GET", "HEAD", "OPTIONS") and not header_ok:
            raise ApiError(403, "csrf_header_missing")
        return
    raise ApiError(401, "wrong_code")
