import copy

from tests.conftest import AUTH

BODY = {
    "name": "Kitchen",
    "device": "screen",
    "orientation": "portrait",
    "widgets": [
        {"id": "w1", "type": "week-calendar", "order": 1, "size": "large",
         "settings": {"categories": ["homework", "plan"], "weeks": 1, "members": [1]}},
        {"id": "w2", "type": "meal-boxes", "order": 2, "size": "small", "settings": {"days": 5}},
    ],
}


def create(client, slug="tv", **over):
    return client.post("/api/dashboard/dashboards", json={**BODY, "slug": slug, **over}, headers=AUTH)


def test_default_exists_from_start(client):
    d = client.get("/api/dashboard/dashboards/default").json()
    assert d["is_default"] and d["slug"] == "main" and len(d["widgets"]) == 5
    assert [x["slug"] for x in client.get("/api/dashboard/dashboards").json()] == ["main"]


def test_create_get_update_delete(client):
    assert create(client).status_code == 201
    assert client.get("/api/dashboard/dashboards/tv").json()["orientation"] == "portrait"
    updated = {**BODY, "name": "TV", "orientation": "landscape"}
    r = client.put("/api/dashboard/dashboards/tv", json=updated, headers=AUTH)
    assert r.json()["name"] == "TV"
    assert create(client).status_code == 409
    assert client.delete("/api/dashboard/dashboards/tv", headers=AUTH).status_code == 204
    assert client.get("/api/dashboard/dashboards/tv").status_code == 404


def test_only_the_default_is_on_root(client):
    assert create(client).status_code == 201
    assert client.get("/api/dashboard/dashboards/tv").json()["is_default"] is False
    # nobody can make a custom dashboard the root one, neither when creating nor when changing
    assert create(client, slug="tv2", is_default=True).status_code == 422
    r = client.put("/api/dashboard/dashboards/tv", json={**BODY, "is_default": True}, headers=AUTH)
    assert r.status_code == 422
    assert client.get("/api/dashboard/dashboards/default").json()["slug"] == "main"
    # the default can be edited like any other dashboard, but not deleted
    r = client.put("/api/dashboard/dashboards/main", json={**BODY, "name": "Stuen"}, headers=AUTH)
    assert r.status_code == 200 and r.json()["is_default"] is True and r.json()["name"] == "Stuen"
    assert client.delete("/api/dashboard/dashboards/main", headers=AUTH).status_code == 409


def test_clock_and_date_can_be_hidden(client):
    assert client.get("/api/dashboard/dashboards/main").json()["show_clock"] is True
    r = client.put("/api/dashboard/dashboards/main", json={**BODY, "show_clock": False}, headers=AUTH)
    assert r.json()["show_clock"] is False
    assert create(client, show_clock=False).json()["show_clock"] is False


def test_title_override_and_hidden(client):
    r = client.put("/api/dashboard/dashboards/main", json={**BODY, "title": "Hos os", "show_title": True}, headers=AUTH)
    assert r.json()["title"] == "Hos os" and r.json()["show_title"] is True
    r = client.put("/api/dashboard/dashboards/main", json={**BODY, "title": "", "show_title": False}, headers=AUTH)
    assert r.json()["title"] is None and r.json()["show_title"] is False
    r = client.put("/api/dashboard/dashboards/main", json={**BODY, "title": "x" * 41}, headers=AUTH)
    assert r.status_code == 422


def test_invalid_slugs(client):
    for slug in ("Admin", "admin", "api", "has space", "", "-x", "a" * 31, "default"):
        assert create(client, slug=slug).status_code == 422, slug


def test_invalid_setups(client):
    def bad(mutate):
        body = copy.deepcopy(BODY)
        mutate(body)
        r = client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH)
        assert r.status_code == 422, body

    bad(lambda b: b["widgets"][0].update(type="unknown"))
    bad(lambda b: b["widgets"][0].update(size="huge"))
    bad(lambda b: b.update(widgets=[{**b["widgets"][1], "id": f"w{i}"} for i in range(15)]))
    bad(lambda b: b["widgets"][1].update(id="w1"))
    bad(lambda b: b["widgets"][0]["settings"].update(weeks=5))
    bad(lambda b: b["widgets"][1]["settings"].update(days=15))
    bad(lambda b: b["widgets"][0]["settings"].update(categories=[]))
    bad(lambda b: b.update(device="watch"))


def test_codes_and_presets(client):
    assert client.post("/api/dashboard/dashboards", json={**BODY, "slug": "x"}).status_code == 401
    assert client.put("/api/dashboard/dashboards/main", json=BODY).status_code == 401
    assert client.delete("/api/dashboard/dashboards/main").status_code == 401
    assert client.get("/api/dashboard/dashboards").status_code == 200
    ids = [p["id"] for p in client.get("/api/dashboard/presets").json()]
    assert {"family-hub", "kids-board", "large-calendar", "homework-and-meals", "phone-today"} <= set(ids)


def test_new_widget_types(client):
    body = copy.deepcopy(BODY)
    body["widgets"] += [
        {"id": "w3", "type": "person-agenda", "order": 3, "size": "medium", "settings": {"days": 2, "members": []}},
        {"id": "w4", "type": "clock", "order": 4, "size": "small", "settings": {}},
    ]
    assert client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH).status_code == 200
    body["widgets"][2]["settings"]["days"] = 8
    assert client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH).status_code == 422
    body["widgets"][2]["settings"]["days"] = 2
    body["widgets"][3]["settings"] = {"x": 1}
    assert client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH).status_code == 422
