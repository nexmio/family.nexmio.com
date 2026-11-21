"""AI import (section 10): validate a file, find duplicates, build the template."""

import json
from pathlib import Path

from pydantic import ValidationError

from app.core import members as members_core
from app.modules.weekplan import service
from app.modules.weekplan.schemas import ImportFile

MAX_BYTES = 1_000_000
TEMPLATE_DIR = Path(__file__).parent / "templates"
LANGUAGES = ("da", "en")


def build_template(lang: str) -> str:
    lang = lang if lang in LANGUAGES else "en"
    text = (TEMPLATE_DIR / f"import_template.{lang}.md").read_text(encoding="utf-8")
    schema = json.dumps(ImportFile.model_json_schema(), indent=2, ensure_ascii=False)
    return text.replace("{{JSON_SCHEMA}}", schema)


def _error(index: int | None, field: str | None, code: str) -> dict:
    return {"index": index, "field": field, "code": code}


def _convert(exc: ValidationError) -> list[dict]:
    out = []
    for err in exc.errors():
        loc = err["loc"]
        if loc and loc[0] == "events" and len(loc) == 1 and err["type"] == "too_long":
            out.append(_error(None, "events", "too_many_events"))
        elif len(loc) >= 2 and loc[0] == "events" and isinstance(loc[1], int):
            field = str(loc[2]) if len(loc) > 2 else None
            out.append(_error(loc[1], field, err["type"]))
        else:
            out.append(_error(None, ".".join(str(x) for x in loc) or None, err["type"]))
    return out


def preview(db, raw: bytes) -> dict:
    """Checks the file and changes nothing. Always returns {ok, errors, events, duplicates}."""
    result = {"ok": False, "errors": [], "events": [], "duplicates": [], "new_people": []}
    if len(raw) > MAX_BYTES:
        result["errors"] = [_error(None, None, "file_too_large")]
        return result
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        result["errors"] = [_error(None, None, "invalid_json")]
        return result
    try:
        parsed = ImportFile.model_validate(payload)
    except ValidationError as exc:
        result["errors"] = _convert(exc)
        return result

    events = [e.model_dump(mode="json") for e in parsed.events]
    seen: dict[tuple[str, str], int] = {}
    duplicates = []
    for i, ev in enumerate(parsed.events):
        key = (ev.title.strip().casefold(), ev.date.isoformat())
        existing = service.find_duplicates(db, ev.title, ev.date)
        if existing:
            duplicates.append({"index": i, "kind": "existing", "existing": existing[0]})
        elif key in seen:
            duplicates.append({"index": i, "kind": "file", "first_index": seen[key]})
        seen.setdefault(key, i)
    new_people: list[str] = []
    for ev in parsed.events:
        name = ev.person
        if name and members_core.find_by_name(db, name) is None:
            if all(members_core.key(n) != members_core.key(name) for n in new_people):
                new_people.append(name)
    result.update(ok=True, events=events, duplicates=duplicates, new_people=new_people)
    return result
