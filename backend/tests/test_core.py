import subprocess
import sys

import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.core import access_code
from app.core.registry import ModuleInfo
from app.main import create_app
from tests.conftest import AUTH, TEST_CODE


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_modules_list_and_order(client):
    data = client.get("/api/modules").json()
    assert [m["id"] for m in data] == ["weekplan", "mealplan", "shopping", "todo", "chores", "occasions", "board", "photos", "share", "dashboard"]
    assert set(data[0]) == {"id", "icon", "requires_code_to_view"}


def test_unknown_api_path_is_json_404(client):
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.json()["error"] == "not_found"


def _test_modules():
    plain, locked = APIRouter(), APIRouter()
    for r in (plain, locked):
        r.get("/thing")(lambda: {"ok": True})
        r.post("/thing")(lambda: {"ok": True})
    return [
        ModuleInfo("plain", "x", False, plain),
        ModuleInfo("locked", "x", True, locked),
    ]


@pytest.fixture
def test_client(tmp_path, monkeypatch):
    monkeypatch.setenv("NEXMIO_DATA_DIR", str(tmp_path))
    access_code.reset_rate_limits()
    app = create_app(_test_modules())
    return TestClient(app)


def test_extra_module_is_listed_without_core_changes(test_client):
    assert [m["id"] for m in test_client.get("/api/modules").json()] == ["plain", "locked"]


def test_no_code_set_gives_503(test_client):
    r = test_client.post("/api/plain/thing", headers=AUTH)
    assert r.status_code == 503 and r.json()["error"] == "code_not_set"


def test_code_rules(test_client):
    access_code.set_code(TEST_CODE)
    assert test_client.post("/api/plain/thing").status_code == 401
    assert test_client.post("/api/plain/thing", headers={"X-Family-Code": "wrong"}).status_code == 401
    assert test_client.post("/api/plain/thing", headers=AUTH).status_code == 200
    # GET: open on an ordinary module, closed on a module that requires the code to view
    assert test_client.get("/api/plain/thing").status_code == 200
    assert test_client.get("/api/locked/thing").status_code == 401
    assert test_client.get("/api/locked/thing", headers=AUTH).status_code == 200


def test_rate_limit_blocks_even_the_right_code(test_client):
    access_code.set_code(TEST_CODE)
    bad = {"X-Family-Code": "wrong-code"}
    for _ in range(5):
        assert test_client.post("/api/plain/thing", headers=bad).status_code == 401
    r = test_client.post("/api/plain/thing", headers=AUTH)
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0


def test_hash_is_argon2id_and_code_not_stored(app, client, tmp_path):
    from app.core.db import reader

    with reader() as db:
        value = db.execute("SELECT value FROM settings WHERE key='code_hash'").fetchone()["value"]
    assert value.startswith("$argon2id$")
    for path in tmp_path.rglob("*"):
        if path.is_file():
            assert TEST_CODE.encode() not in path.read_bytes()


def test_code_check_and_change(client):
    assert client.post("/api/code/check").status_code == 401
    assert client.post("/api/code/check", headers=AUTH).status_code == 204
    assert client.post("/api/code/change", headers=AUTH, json={"new": "abc"}).status_code == 422
    assert client.post("/api/code/change", headers={"X-Family-Code": "no"}, json={"new": "abcdef"}).status_code == 401
    assert client.post("/api/code/change", headers=AUTH, json={"new": "new-code-1"}).status_code == 204
    assert client.post("/api/code/check", headers=AUTH).status_code == 401
    assert client.post("/api/code/check", headers={"X-Family-Code": "new-code-1"}).status_code == 204


def test_cli_set_and_reset_code(tmp_path, monkeypatch):
    monkeypatch.setenv("NEXMIO_DATA_DIR", str(tmp_path))
    env = {"NEXMIO_DATA_DIR": str(tmp_path), "PATH": "/usr/bin:/bin", "PYTHONPATH": "."}
    run = lambda code: subprocess.run(
        [sys.executable, "-m", "app.cli", "reset-code", "--code-from-stdin"],
        input=code + "\n", text=True, env=env, capture_output=True,
    )
    assert run("first-code").returncode == 0
    assert run("abc").returncode == 1
    assert run("second-code").returncode == 0
    application = create_app()
    client = TestClient(application)
    assert client.post("/api/code/check", headers={"X-Family-Code": "first-code"}).status_code == 401
    assert client.post("/api/code/check", headers={"X-Family-Code": "second-code"}).status_code == 204


def test_family_name(client):
    assert client.get("/api/family").json() == {"name": None, "wallpaper": "ocean"}
    assert client.put("/api/family", json={"name": "Smith"}).status_code == 401
    assert client.put("/api/family", json={"name": "  Smith family "}, headers=AUTH).json()["name"] == "Smith family"
    assert client.get("/api/family").json()["name"] == "Smith family"
    assert client.put("/api/family", json={"name": ""}, headers=AUTH).json()["name"] is None
    assert client.put("/api/family", json={"name": "x" * 41}, headers=AUTH).status_code == 422
