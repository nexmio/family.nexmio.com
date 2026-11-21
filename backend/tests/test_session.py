from app.core import access_code
from tests.conftest import AUTH, TEST_CODE, event

CSRF = {"X-Requested-With": "nexmio"}


def login(client, code=TEST_CODE):
    return client.post("/api/session/login", json={"code": code})


def test_login_gives_free_access_until_logout(client):
    assert client.get("/api/session").json() == {"logged_in": False}
    assert client.post("/api/weekplan/events", json=event(), headers=CSRF).status_code == 401
    r = login(client)
    assert r.status_code == 200 and "httponly" in r.headers["set-cookie"].lower()
    assert client.get("/api/session").json() == {"logged_in": True}
    # changes now work without typing the code again
    assert client.post("/api/weekplan/events", json=event(), headers=CSRF).status_code == 201
    assert client.post("/api/weekplan/events?allow_duplicate=true", json=event(), headers=CSRF).status_code == 201
    assert client.post("/api/session/logout").status_code == 204
    assert client.get("/api/session").json() == {"logged_in": False}
    assert client.post("/api/weekplan/events", json=event(), headers=CSRF).status_code == 401


def test_wrong_code_does_not_log_in_and_is_rate_limited(client):
    assert login(client, "nope").status_code == 401
    for _ in range(4):
        login(client, "nope")
    assert login(client).status_code == 429  # even the right code is refused for a while
    assert client.get("/api/session").json() == {"logged_in": False}


def test_cookie_changes_need_our_own_header(client):
    login(client)
    r = client.post("/api/weekplan/events", json=event())
    assert r.status_code == 403 and r.json()["error"] == "csrf_header_missing"


def test_token_is_stored_hashed_and_expired_sessions_do_not_work(client):
    from app.core.db import reader, transaction

    token = login(client).cookies["nexmio_session"]
    with reader() as db:
        rows = [r["token_hash"] for r in db.execute("SELECT token_hash FROM sessions")]
    assert rows and token not in rows
    with transaction() as db:
        db.execute("UPDATE sessions SET expires_at = '2000-01-01T00:00:00+00:00'")
    assert not access_code.session_valid(token)
    assert client.post("/api/weekplan/events", json=event(), headers=CSRF).status_code == 401


def test_changing_the_code_logs_other_sessions_out(client, app):
    from fastapi.testclient import TestClient

    other = TestClient(app)
    login(client)
    login(other)
    r = client.post("/api/code/change", json={"new": "brand-new-code"}, headers=CSRF)
    assert r.status_code == 204
    assert client.get("/api/session").json() == {"logged_in": True}
    assert other.get("/api/session").json() == {"logged_in": False}
    assert client.post("/api/code/check", headers=AUTH).status_code == 401  # the old code is gone


def test_display_files_are_never_stale(client, tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html></html>")
    (dist / "assets" / "app-abc.js").write_text("x")
    monkeypatch.setenv("NEXMIO_FRONTEND_DIR", str(dist))
    assert client.get("/admin/x").headers["cache-control"] == "no-cache"
    assert "immutable" in client.get("/assets/app-abc.js").headers["cache-control"]
    r = client.get("/assets/old-chunk-123.js")
    assert r.status_code == 404 and "html" not in r.headers["content-type"]
