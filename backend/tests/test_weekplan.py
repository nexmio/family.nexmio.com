from tests.conftest import AUTH, event


def create(client, **over):
    return client.post("/api/weekplan/events", json=event(**over), headers=AUTH)


def test_create_and_list(client):
    r = create(client)
    assert r.status_code == 201 and r.json()["id"]
    got = client.get("/api/weekplan/events", params={"from": "2026-11-16", "to": "2026-11-22"})
    assert [e["title"] for e in got.json()] == ["Swimming"]
    assert client.get(f"/api/weekplan/events/{r.json()['id']}").json()["end"] == "17:00"


def test_validation(client):
    for bad in (
        {"title": "  "},
        {"date": "2026-13-40"},
        {"start": "10:00", "end": "09:00"},
        {"category": "nope"},
        {"start": "25:00"},
    ):
        assert create(client, **bad).status_code == 422, bad
    r = client.post("/api/weekplan/events", json={**event(), "extra": 1}, headers=AUTH)
    assert r.status_code == 422


def test_duplicate(client):
    create(client, title="Dentist Æble")
    r = create(client, title="  dentist æble ")
    assert r.status_code == 409 and r.json()["error"] == "duplicate"
    assert r.json()["details"]["duplicates"][0]["title"] == "Dentist Æble"
    r = client.post("/api/weekplan/events?allow_duplicate=true", json=event(title="DENTIST ÆBLE"), headers=AUTH)
    assert r.status_code == 201


def test_ranges(client):
    ok = {"from": "2026-11-01", "to": "2026-12-02"}  # 32 days
    assert client.get("/api/weekplan/events", params=ok).status_code == 200
    assert client.get("/api/weekplan/events", params={"from": "2026-01-01", "to": "2026-03-31"}).status_code == 422
    assert client.get("/api/weekplan/events", params={"from": "2026-02-01", "to": "2026-01-01"}).status_code == 422


def test_sorting_and_category_filter(client):
    create(client, title="B", start="10:00", end=None)
    create(client, title="A", start="09:00", end=None, category="homework")
    create(client, title="Allday", start=None, end=None, category="plan")
    params = {"from": "2026-11-17", "to": "2026-11-17"}
    assert [e["title"] for e in client.get("/api/weekplan/events", params=params).json()] == ["Allday", "A", "B"]
    r = client.get("/api/weekplan/events", params={**params, "category": "homework,plan"})
    assert [e["title"] for e in r.json()] == ["Allday", "A"]
    assert client.get("/api/weekplan/events", params={**params, "category": "zzz"}).status_code == 422


def test_update_delete_and_codes(client):
    event_id = create(client).json()["id"]
    url = f"/api/weekplan/events/{event_id}"
    assert client.put(url, json=event(title="New")).status_code == 401
    assert client.delete(url).status_code == 401
    assert client.put(url, json=event(title="New"), headers=AUTH).json()["title"] == "New"
    assert client.put("/api/weekplan/events/9999", json=event(), headers=AUTH).status_code == 404
    assert client.delete(url, headers=AUTH).status_code == 204
    assert client.delete(url, headers=AUTH).status_code == 404
    assert client.get(url).status_code == 404


def test_reads_need_no_code(client):
    assert client.get("/api/weekplan/events", params={"from": "2026-11-16", "to": "2026-11-22"}).status_code == 200


def test_member_link_and_filter(client):
    sam = client.post("/api/members", json={"name": "Sam", "color": "coral"}, headers=AUTH).json()["id"]
    alex = client.post("/api/members", json={"name": "Alex", "color": "sky"}, headers=AUTH).json()["id"]
    create(client, title="S", member_id=sam)
    create(client, title="A", member_id=alex)
    create(client, title="F", member_id=None)
    params = {"from": "2026-11-17", "to": "2026-11-17"}
    titles = lambda **extra: sorted(  # noqa: E731
        e["title"] for e in client.get("/api/weekplan/events", params={**params, **extra}).json()
    )
    assert titles() == ["A", "F", "S"]
    assert titles(member=str(sam)) == ["S"]
    assert titles(member=f"{sam},{alex}") == ["A", "S"]
    assert titles(member="none") == ["F"]
    assert titles(member=f"{alex},none") == ["A", "F"]
    assert client.get("/api/weekplan/events", params={**params, "member": "x"}).status_code == 422
    assert create(client, title="Z", member_id=9999).status_code == 422
