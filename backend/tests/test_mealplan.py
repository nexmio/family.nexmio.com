from tests.conftest import AUTH

WEEK = "/api/mealplan/weeks/2026/47"


def days(*pairs):
    return {"days": [{"date": d, "dish": dish, "note": None} for d, dish in pairs]}


def test_week_roundtrip(client):
    body = days(("2026-11-16", "Spaghetti bolognese"), ("2026-11-17", "Tacos"), ("2026-11-22", None))
    assert client.put(WEEK, json=body, headers=AUTH).status_code == 200
    week = client.get(WEEK).json()["days"]
    assert [d["date"] for d in week][0] == "2026-11-16" and week[-1]["date"] == "2026-11-22"
    assert week[0]["dish"]["name"] == "Spaghetti bolognese"
    assert week[2]["dish"] is None


def test_validation_and_atomic(client):
    client.put(WEEK, json=days(("2026-11-16", "Soup")), headers=AUTH)
    outside = days(("2026-11-16", "Pasta"), ("2026-11-23", "Fish"))
    assert client.put(WEEK, json=outside, headers=AUTH).status_code == 422
    assert client.get(WEEK).json()["days"][0]["dish"]["name"] == "Soup"
    assert client.put("/api/mealplan/weeks/2026/60", json=days(), headers=AUTH).status_code == 422
    dup = days(("2026-11-16", "A"), ("2026-11-16", "B"))
    assert client.put(WEEK, json=dup, headers=AUTH).status_code == 422


def test_dishes_reuse_and_delete_keeps_dish(client):
    client.put(WEEK, json=days(("2026-11-16", "Spaghetti bolognese")), headers=AUTH)
    client.put(WEEK, json=days(("2026-11-17", "SPAGHETTI BOLOGNESE")), headers=AUTH)
    dishes = client.get("/api/mealplan/dishes", params={"search": "spag"}).json()
    assert [d["name"] for d in dishes] == ["Spaghetti bolognese"]
    client.put(WEEK, json=days(("2026-11-17", "")), headers=AUTH)
    assert client.get(WEEK).json()["days"][1]["dish"] is None
    assert len(client.get("/api/mealplan/dishes").json()) == 1


def test_dishes_order_and_limit(client):
    for i in range(25):
        client.put(f"/api/mealplan/weeks/2026/{i + 1}", json=days(), headers=AUTH)
    client.put(WEEK, json=days(("2026-11-16", "Old dish")), headers=AUTH)
    client.put("/api/mealplan/weeks/2026/48", json=days(("2026-11-23", "New dish")), headers=AUTH)
    names = [d["name"] for d in client.get("/api/mealplan/dishes").json()]
    assert names == ["New dish", "Old dish"]


def test_days_only_with_dish_and_range(client):
    client.put(WEEK, json=days(("2026-11-16", "A"), ("2026-11-18", "B")), headers=AUTH)
    got = client.get("/api/mealplan/days", params={"from": "2026-11-16", "to": "2026-11-22"}).json()
    assert [d["dish"]["name"] for d in got] == ["A", "B"]
    r = client.get("/api/mealplan/days", params={"from": "2026-01-01", "to": "2026-12-31"})
    assert r.status_code == 422


def test_codes(client):
    assert client.put(WEEK, json=days()).status_code == 401
    assert client.get(WEEK).status_code == 200
