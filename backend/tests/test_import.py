import json
import re

import pytest

from app.modules.weekplan import importer, service
from app.modules.weekplan.schemas import ImportFile
from tests.conftest import AUTH, event, imp


def file_with(*events, **top):
    return {"schema_version": 1, "events": list(events), **top}


def preview(client, payload):
    raw = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    return client.post("/api/weekplan/import/preview", content=raw).json()


def count(client):
    r = client.get("/api/weekplan/events", params={"from": "2026-11-01", "to": "2026-12-01"})
    return len(r.json())


def test_template_download_and_examples_validate(client):
    for lang in ("da", "en"):
        r = client.get("/api/weekplan/import/template", params={"lang": lang})
        assert r.status_code == 200
        assert f'weekplan-import-template.{lang}.md' in r.headers["content-disposition"]
        text = r.text
        for word in ("schema_version", "homework", "plan", "appointment", "other", "YYYY-MM-DD", "null"):
            assert word in text
        blocks = re.findall(r"```json\n(.*?)```", text, re.DOTALL)
        assert len(blocks) >= 2
        for block in blocks:
            ImportFile.model_validate(json.loads(block))
    assert "Answer only with JSON" in client.get("/api/weekplan/import/template").text
    assert "Svar kun med JSON" in importer.build_template("da")


def test_model_rejections():
    from pydantic import ValidationError

    good = file_with(imp())
    ImportFile.model_validate(good)
    for bad in (
        {"events": []},
        {**good, "schema_version": 2},
        {**good, "extra": 1},
        file_with(*[imp(title=f"T{i}") for i in range(501)]),
        file_with({**imp(), "title": ""}),
        file_with(imp(category="x")),
        file_with({**imp(), "extra": 1}),
    ):
        with pytest.raises(ValidationError):
            ImportFile.model_validate(bad)


def test_preview_valid_changes_nothing(client):
    result = preview(client, file_with(*[imp(title=f"T{i}") for i in range(5)]))
    assert result["ok"] and len(result["events"]) == 5 and result["duplicates"] == []
    assert count(client) == 0


def test_preview_errors_per_event(client):
    bad = {**imp(title="x"), "date": "nonsense"}
    result = preview(client, file_with(imp(), imp(title="b"), bad))
    assert not result["ok"]
    assert {"index": 2, "field": "date"}.items() <= result["errors"][0].items()


def test_preview_file_level_errors(client):
    assert preview(client, b"not json")["errors"][0]["code"] == "invalid_json"
    assert preview(client, b"x" * 1_000_001)["errors"][0]["code"] == "file_too_large"
    many = preview(client, file_with(*[imp(title=f"T{i}") for i in range(501)]))
    assert many["errors"][0]["code"] == "too_many_events"
    assert not preview(client, file_with(imp(), schema_version=3))["ok"]


def test_duplicates_existing_and_inside_file(client):
    client.post("/api/weekplan/events", json=event(title="Old"), headers=AUTH)
    result = preview(client, file_with(imp(title="old"), imp(title="New"), imp(title="NEW ")))
    kinds = [(d["index"], d["kind"]) for d in result["duplicates"]]
    assert kinds == [(0, "existing"), (2, "file")]


def test_execute_skip_and_counts(client):
    payload = {"file": file_with(*[imp(title=f"T{i}") for i in range(5)]), "skip": [1, 3]}
    r = client.post("/api/weekplan/import/execute", json=payload, headers=AUTH)
    assert r.json() == {"created": 3, "skipped": 2, "first_date": "2026-11-17", "new_members": 0}
    assert count(client) == 3


def test_execute_needs_code_and_revalidates(client):
    payload = {"file": file_with(imp()), "skip": []}
    assert client.post("/api/weekplan/import/execute", json=payload).status_code == 401
    assert count(client) == 0
    bad = {"file": file_with({**imp(), "date": "2026-99-99"}), "skip": []}
    assert client.post("/api/weekplan/import/execute", json=bad, headers=AUTH).status_code == 422


def test_execute_rolls_back_on_database_error(client, monkeypatch):
    real = service.insert_event
    calls = {"n": 0}

    def flaky(db, data):
        calls["n"] += 1
        if calls["n"] == 3:
            raise RuntimeError("simulated database error")
        return real(db, data)

    monkeypatch.setattr(service, "insert_event", flaky)
    payload = {"file": file_with(*[imp(title=f"T{i}") for i in range(5)]), "skip": []}
    with pytest.raises(RuntimeError):
        client.post("/api/weekplan/import/execute", json=payload, headers=AUTH)
    assert count(client) == 0


def test_import_creates_unknown_people_and_links_known_ones(client):
    alex = client.post("/api/members", json={"name": "Alex", "color": "sky"}, headers=AUTH).json()
    payload = {
        "file": file_with(imp(title="A", person="alex"), imp(title="B", person="Sam"), imp(title="C", person="SAM")),
        "skip": [],
    }
    shown = preview(client, payload["file"])
    assert shown["new_people"] == ["Sam"]
    r = client.post("/api/weekplan/import/execute", json=payload, headers=AUTH).json()
    assert r["created"] == 3 and r["new_members"] == 1
    members = {m["name"]: m["id"] for m in client.get("/api/members").json()}
    assert set(members) == {"Alex", "Sam"}
    events = client.get("/api/weekplan/events", params={"from": "2026-11-17", "to": "2026-11-17"}).json()
    assert {e["title"]: e["member_id"] for e in events} == {"A": alex["id"], "B": members["Sam"], "C": members["Sam"]}
