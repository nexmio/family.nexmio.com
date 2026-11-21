from tests.conftest import AUTH, event


def add(client, name="Alex", color="sky"):
    return client.post("/api/members", json={"name": name, "color": color}, headers=AUTH)


def test_crud_and_codes(client):
    assert client.post("/api/members", json={"name": "A", "color": "sky"}).status_code == 401
    r = add(client)
    assert r.status_code == 201 and r.json()["color"] == "sky"
    member = r.json()["id"]
    assert client.get("/api/members").json() == [{"id": member, "name": "Alex", "color": "sky"}]
    assert client.put(f"/api/members/{member}", json={"name": "Alexander", "color": "lime"}).status_code == 401
    r = client.put(f"/api/members/{member}", json={"name": "Alexander", "color": "lime"}, headers=AUTH)
    assert r.json()["name"] == "Alexander"
    assert client.put("/api/members/99", json={"name": "X", "color": "lime"}, headers=AUTH).status_code == 404
    assert client.delete(f"/api/members/{member}").status_code == 401
    assert client.delete(f"/api/members/{member}", headers=AUTH).status_code == 204
    assert client.delete(f"/api/members/{member}", headers=AUTH).status_code == 404


def test_validation(client):
    assert add(client, name="  ").status_code == 422
    assert add(client, color="purple-haze").status_code == 422
    assert add(client).status_code == 201
    assert add(client, name="ALEX", color="lime").status_code == 409


def test_deleting_a_member_keeps_their_events(client):
    member = add(client).json()["id"]
    client.post("/api/weekplan/events", json=event(member_id=member), headers=AUTH)
    client.delete(f"/api/members/{member}", headers=AUTH)
    events = client.get("/api/weekplan/events", params={"from": "2026-11-17", "to": "2026-11-17"}).json()
    assert len(events) == 1 and events[0]["member_id"] is None
