import io
import zipfile
from datetime import timedelta

import pytest

from app.core import extras
from app.shared.dates import today
from tests.conftest import AUTH, event


def member(client, name, color="sky"):
    return client.post("/api/members", json={"name": name, "color": color}, headers=AUTH).json()["id"]


# ---------------------------------------------------------------- recurring events
def test_series_is_created_changed_and_deleted_as_a_whole(client):
    body = event(repeat={"every": "week", "until": "2026-12-08"})  # 17 Nov, 24 Nov, 1 Dec, 8 Dec
    r = client.post("/api/weekplan/events", json=body, headers=AUTH)
    assert r.status_code == 201 and r.json()["series_count"] == 4
    params = {"from": "2026-11-01", "to": "2026-12-31"}
    days = [e["date"] for e in client.get("/api/weekplan/events", params=params).json()]
    assert days == ["2026-11-17", "2026-11-24", "2026-12-01", "2026-12-08"]
    first = client.get("/api/weekplan/events", params=params).json()[1]
    # one occurrence only
    assert client.put(f"/api/weekplan/events/{first['id']}", json=event(title="Only me", date=first["date"]), headers=AUTH).status_code == 200
    titles = [e["title"] for e in client.get("/api/weekplan/events", params=params).json()]
    assert titles.count("Only me") == 1
    # the whole series: the new title everywhere, every event keeps its own day
    client.put(f"/api/weekplan/events/{first['id']}?scope=series", json=event(title="All of them", date="2026-11-24"), headers=AUTH)
    got = client.get("/api/weekplan/events", params=params).json()
    assert {e["title"] for e in got} == {"All of them"}
    assert [e["date"] for e in got] == days
    # this one and the following
    assert client.delete(f"/api/weekplan/events/{first['id']}?scope=following", headers=AUTH).status_code == 204
    assert [e["date"] for e in client.get("/api/weekplan/events", params=params).json()] == ["2026-11-17"]


def test_series_rules(client):
    assert client.post("/api/weekplan/events", json=event(repeat={"every": "day", "until": "2026-01-01"}), headers=AUTH).status_code == 422
    assert client.post("/api/weekplan/events", json=event(repeat={"every": "day", "until": "2028-01-01"}), headers=AUTH).status_code == 422
    month = client.post("/api/weekplan/events", json=event(date="2026-01-31", repeat={"every": "month", "until": "2026-04-30"}), headers=AUTH)
    assert month.json()["series_count"] == 4
    got = []
    for a, b in (("2026-01-01", "2026-02-28"), ("2026-03-01", "2026-04-30")):
        got += [e["date"] for e in client.get("/api/weekplan/events", params={"from": a, "to": b}).json()]
    assert got == ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]
    # a duplicate on any day stops the whole series
    client.post("/api/weekplan/events", json=event(title="Clash", date="2026-05-08"), headers=AUTH)
    r = client.post("/api/weekplan/events", json=event(title="clash", date="2026-05-01", repeat={"every": "week", "until": "2026-05-15"}), headers=AUTH)
    assert r.status_code == 409
    assert client.put("/api/weekplan/events/1", json=event(repeat={"every": "day", "until": "2026-12-01"}), headers=AUTH).status_code == 422
    assert client.delete("/api/weekplan/events/1?scope=nope", headers=AUTH).status_code == 422


def test_several_people_on_one_event(client):
    sam, alex = member(client, "Sam"), member(client, "Alex")
    r = client.post("/api/weekplan/events", json=event(member_id=sam, also_ids=[alex]), headers=AUTH)
    assert r.json()["also_ids"] == [alex]
    params = {"from": "2026-11-17", "to": "2026-11-17"}
    assert len(client.get("/api/weekplan/events", params={**params, "member": str(alex)}).json()) == 1
    assert len(client.get("/api/weekplan/events", params={**params, "member": str(sam)}).json()) == 1
    assert client.post("/api/weekplan/events", json=event(title="x", member_id=sam, also_ids=[sam]), headers=AUTH).status_code == 422
    assert client.post("/api/weekplan/events", json=event(title="y", also_ids=[99]), headers=AUTH).status_code == 422


def test_calendar_feed(client):
    sam = member(client, "Sam")
    day = (today() + timedelta(days=3)).isoformat()
    client.post("/api/weekplan/events", json=event(title="Fodbold, ude; i regn", date=day, member_id=sam), headers=AUTH)
    client.post("/api/weekplan/events", json=event(title="Hele dagen", date=day, start=None, end=None), headers=AUTH)
    r = client.get("/api/weekplan/calendar.ics")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/calendar")
    text = r.text
    assert text.startswith("BEGIN:VCALENDAR\r\n") and text.endswith("END:VCALENDAR\r\n")
    assert r"SUMMARY:Fodbold\, ude\; i regn" in text
    assert "DTSTART;TZID=Europe/Copenhagen:" in text and "DTSTART;VALUE=DATE:" in text
    assert "DESCRIPTION:Sam" in text
    assert all(len(line.encode()) <= 75 for line in text.split("\r\n"))
    assert "Sam" not in client.get("/api/weekplan/calendar.ics", params={"member": "none"}).text


# ---------------------------------------------------------------- meal plan
def test_favorites_and_ingredients(client):
    week = "/api/mealplan/weeks/2026/47"
    r = client.put(week, json={"days": [{"date": "2026-11-16", "dish": "Lasagne", "note": None}]}, headers=AUTH)
    dish = r.json()["days"][0]["dish"]
    assert dish["ingredients"] == []
    client.put(f"/api/mealplan/dishes/{dish['id']}", json={"favorite": True, "ingredients": ["Hakket kød", " Pasta ", "Ost"]}, headers=AUTH)
    assert client.put(f"/api/mealplan/dishes/{dish['id']}", json={"favorite": False}).status_code == 401
    assert client.put("/api/mealplan/dishes/99", json={"favorite": True}, headers=AUTH).status_code == 404
    got = client.get(week).json()["days"][0]["dish"]
    assert got["ingredients"] == ["Hakket kød", "Pasta", "Ost"]
    favs = client.get("/api/mealplan/dishes", params={"favorites": "true"}).json()
    assert [d["name"] for d in favs] == ["Lasagne"] and favs[0]["favorite"] is True
    client.put(week, json={"days": [{"date": "2026-11-17", "dish": "Tacos", "note": None}]}, headers=AUTH)
    assert [d["name"] for d in client.get("/api/mealplan/dishes").json()][0] == "Lasagne"  # favorites first


# ---------------------------------------------------------------- shopping
def test_shopping_list(client):
    a = client.post("/api/shopping/items", json={"title": "Mælk", "group": "dairy"}, headers=AUTH).json()
    assert client.post("/api/shopping/items", json={"title": "x", "group": "nope"}, headers=AUTH).status_code == 422
    r = client.post("/api/shopping/bulk", json={"titles": ["mælk", "Pasta", "Ost", "ost"]}, headers=AUTH)
    assert r.json() == {"added": 2, "skipped": 2}
    assert client.post("/api/shopping/bulk", json={"titles": ["Pasta"]}).status_code == 401
    # ticking needs no code
    assert client.post(f"/api/shopping/items/{a['id']}/tick", json={"done": True}).json()["done"] is True
    assert client.put(f"/api/shopping/items/{a['id']}", json={"done": False}).status_code == 401
    assert [i["title"] for i in client.get("/api/shopping/items").json()][-1] == "Mælk"  # done goes last
    assert client.post("/api/shopping/clear-done", headers=AUTH).status_code == 204
    assert {i["title"] for i in client.get("/api/shopping/items").json()} == {"Pasta", "Ost"}


# ---------------------------------------------------------------- to-do: due date and repeat
def test_todo_repeats(client):
    day = today().isoformat()
    item = client.post("/api/todo/items", json={"title": "Skrald", "due": day, "repeat": "weekly"}, headers=AUTH).json()
    assert item["due"] == day and item["repeat"] == "weekly"
    client.post(f"/api/todo/items/{item['id']}/tick", json={"done": True})
    items = client.get("/api/todo/items").json()
    open_items = [i for i in items if not i["done"]]
    assert len(open_items) == 1 and open_items[0]["due"] == (today() + timedelta(days=7)).isoformat()
    assert [i for i in items if i["done"]][0]["repeat"] == ""
    client.post(f"/api/todo/items/{item['id']}/tick", json={"done": False})
    client.post(f"/api/todo/items/{item['id']}/tick", json={"done": True})
    assert len([i for i in client.get("/api/todo/items").json() if not i["done"]]) == 1  # no second copy


# ---------------------------------------------------------------- chores and stars
def test_chores_and_stars(client):
    kid = member(client, "Ida")
    morning = client.post("/api/chores/chores", json={"title": "Tænder", "member_id": kid, "stars": 2, "part": "morning"}, headers=AUTH).json()
    client.post("/api/chores/chores", json={"title": "Skole-taske", "member_id": kid, "days": "weekdays"}, headers=AUTH)
    assert client.post("/api/chores/chores", json={"title": "x", "member_id": 99}, headers=AUTH).status_code == 422
    assert client.post("/api/chores/chores", json={"title": "x", "member_id": kid}).status_code == 401
    now = today()
    day = client.get("/api/chores/day", params={"date": now.isoformat()}).json()
    assert len(day) == (2 if now.weekday() < 5 else 1)
    # a child ticks, without any code
    r = client.post(f"/api/chores/chores/{morning['id']}/tick", json={"date": now.isoformat(), "done": True})
    assert r.status_code == 200
    client.post(f"/api/chores/chores/{morning['id']}/tick", json={"date": now.isoformat(), "done": True})  # again: still counted once
    assert client.post(f"/api/chores/chores/{morning['id']}/tick", json={"date": (now - timedelta(days=5)).isoformat(), "done": True}).status_code == 422
    stars = client.get("/api/chores/stars").json()[0]
    assert stars["member_id"] == kid and stars["balance"] == 2 and stars["today"] == 2
    # a reward
    client.put(f"/api/chores/goals/{kid}", json={"title": "Biograf", "stars": 5}, headers=AUTH)
    assert client.post(f"/api/chores/goals/{kid}/claim", headers=AUTH).status_code == 409
    client.put(f"/api/chores/goals/{kid}", json={"title": "Is", "stars": 2}, headers=AUTH)
    assert client.post(f"/api/chores/goals/{kid}/claim", headers=AUTH).json()["balance"] == 0
    # untick takes the stars away; deleting a chore keeps the stars already earned
    client.post(f"/api/chores/chores/{morning['id']}/tick", json={"date": now.isoformat(), "done": False})
    assert client.get("/api/chores/stars").json()[0]["balance"] == -2
    client.post(f"/api/chores/chores/{morning['id']}/tick", json={"date": now.isoformat(), "done": True})
    client.delete(f"/api/chores/chores/{morning['id']}", headers=AUTH)
    assert client.get("/api/chores/stars").json()[0]["balance"] == 0


# ---------------------------------------------------------------- birthdays and countdowns
def test_occasions_next_date_and_age(client):
    now = today()
    soon = now + timedelta(days=10)
    r = client.post("/api/occasions/occasions", json={"title": "Mia", "month": soon.month, "day": soon.day, "year": soon.year - 9}, headers=AUTH)
    assert r.status_code == 201 and r.json()["days_until"] == 10 and r.json()["turns"] == 9
    client.post("/api/occasions/occasions", json={"title": "Skuddag", "month": 2, "day": 29}, headers=AUTH)
    assert client.post("/api/occasions/occasions", json={"title": "x", "month": 2, "day": 30}, headers=AUTH).status_code == 422
    assert client.post("/api/occasions/occasions", json={"title": "x", "month": 4, "day": 31}, headers=AUTH).status_code == 422
    listed = client.get("/api/occasions/occasions").json()
    assert listed[0]["title"] == "Mia"
    leap = next(o for o in listed if o["title"] == "Skuddag")
    assert int(leap["next"][:4]) % 4 == 0
    assert [o["title"] for o in client.get("/api/occasions/occasions", params={"within": 30}).json()] == ["Mia"]


def test_countdowns(client):
    now = today()
    client.post("/api/occasions/countdowns", json={"title": "Jul", "date": (now + timedelta(days=30)).isoformat()}, headers=AUTH)
    client.post("/api/occasions/countdowns", json={"title": "Gammel", "date": (now - timedelta(days=3)).isoformat()}, headers=AUTH)
    got = client.get("/api/occasions/countdowns").json()
    assert [c["title"] for c in got] == ["Jul"] and got[0]["days_left"] == 30


# ---------------------------------------------------------------- board and share
def test_board_messages_expire(client):
    client.post("/api/board/messages", json={"text": "Husk gummistøvler"}, headers=AUTH)
    assert client.post("/api/board/messages", json={"text": "x"}).status_code == 401
    assert [m["text"] for m in client.get("/api/board/messages").json()] == ["Husk gummistøvler"]
    from app.core.db import transaction

    with transaction() as db:
        db.execute("UPDATE board SET expires_at = '2000-01-01T00:00:00+00:00'")
    assert client.get("/api/board/messages").json() == []


def test_share_link(client):
    r = client.post("/api/share/links", json={"label": "Babysitter", "days": 5, "valid_days": 3}, headers=AUTH)
    token = r.json()["token"]
    assert client.get(f"/api/share/view/{token}").json()["label"] == "Babysitter"
    assert client.get("/api/share/view/wrong").status_code == 404
    assert client.get("/api/share/links").status_code == 401
    links = client.get("/api/share/links", headers=AUTH).json()
    assert links[0]["label"] == "Babysitter" and "token" not in links[0]
    assert client.delete(f"/api/share/links/{links[0]['id']}", headers=AUTH).status_code == 204
    assert client.get(f"/api/share/view/{token}").status_code == 404


# ---------------------------------------------------------------- weather, backup, night mode
def test_weather(client, monkeypatch):
    assert client.get("/api/weather").json() == {"configured": False}
    calls = []

    def fake(lat, lon):
        calls.append((lat, lon))
        return {"current": {"temperature_2m": 7.6, "weather_code": 3, "wind_speed_10m": 4.2},
                "daily": {"time": ["2026-11-19"], "weather_code": [61], "temperature_2m_max": [9.2], "temperature_2m_min": [3.1]}}

    monkeypatch.setattr(extras, "fetch_forecast", fake)
    extras._cache.clear()
    assert client.put("/api/weather/location", json={"place": "Aarhus", "lat": 56.16, "lon": 10.2}).status_code == 401
    client.put("/api/weather/location", json={"place": "Aarhus", "lat": 56.16, "lon": 10.2}, headers=AUTH)
    data = client.get("/api/weather").json()
    assert data["now"]["temp"] == 8 and data["days"][0]["max"] == 9 and data["place"] == "Aarhus"
    client.get("/api/weather")
    assert len(calls) == 1  # cached
    monkeypatch.setattr(extras, "fetch_forecast", lambda *_: (_ for _ in ()).throw(OSError("offline")))
    extras._cache.clear()
    assert client.get("/api/weather").json()["unavailable"] is True


def test_backup_zip(client):
    assert client.get("/api/backup").status_code == 401
    r = client.get("/api/backup", headers=AUTH)
    assert r.status_code == 200 and r.headers["content-type"] == "application/zip"
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert "app.db" in names


def test_night_mode_fields(client):
    d = client.get("/api/dashboard/dashboards/main").json()
    assert d["night_start"] is None
    body = {k: d[k] for k in ("name", "device", "orientation", "widgets")}
    ok = client.put("/api/dashboard/dashboards/main", json={**body, "night_start": 22, "night_end": 6}, headers=AUTH)
    assert ok.json()["night_start"] == 22 and ok.json()["night_end"] == 6
    for bad in ({"night_start": 22}, {"night_start": 25, "night_end": 6}):
        assert client.put("/api/dashboard/dashboards/main", json={**body, **bad}, headers=AUTH).status_code == 422


@pytest.mark.parametrize("path", ["/api/shopping/items", "/api/chores/chores", "/api/occasions/occasions", "/api/board/messages"])
def test_new_lists_are_open_to_read(client, path):
    assert client.get(path).status_code == 200


def test_new_widget_types_are_accepted(client):
    d = client.get("/api/dashboard/dashboards/main").json()
    body = {k: d[k] for k in ("name", "device", "orientation")}
    kinds = ["chores", "stars", "birthdays", "countdown", "message", "weather"]
    body["widgets"] = [{"id": f"w{i}", "type": k, "order": i, "size": "small", "settings": {}} for i, k in enumerate(kinds)]
    r = client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH)
    assert r.status_code == 200 and [w["type"] for w in r.json()["widgets"]] == kinds
    body["widgets"][0]["settings"] = {"x": 1}
    assert client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH).status_code == 422
