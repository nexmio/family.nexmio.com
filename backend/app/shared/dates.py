"""Date helpers used by more than one module (A6)."""

from datetime import date, timedelta

from app.core.config import MAX_RANGE_DAYS
from app.core.errors import ApiError


def validate_range(start: date, end: date) -> None:
    if start > end:
        raise ApiError(422, "invalid_range", "from must not be after to")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise ApiError(422, "range_too_long", f"at most {MAX_RANGE_DAYS} days")


def week_days(year: int, week: int) -> list[date]:
    """The seven days of an ISO week, Monday first (A8)."""
    try:
        monday = date.fromisocalendar(year, week, 1)
    except ValueError as exc:
        raise ApiError(422, "invalid_week", str(exc)) from exc
    return [monday + timedelta(days=i) for i in range(7)]


def today() -> date:
    """Today in the family's time zone (A8)."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo("Europe/Copenhagen")).date()
