import struct
import zlib

from tests.conftest import AUTH


def png() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    raw = zlib.compress(b"\x00\xff\x00\x00")
    header = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    return b"\x89PNG\r\n\x1a\n" + header + chunk(b"IDAT", raw) + chunk(b"IEND", b"")


def test_photo_upload_serve_move_delete(client):
    assert client.post("/api/photos/photos", content=png()).status_code == 401
    album = client.post("/api/photos/albums", json={"name": "Sommer"}, headers=AUTH).json()
    r = client.post(f"/api/photos/photos?album_id={album['id']}", content=png(), headers=AUTH)
    assert r.status_code == 201
    pid = r.json()["id"]
    file = client.get(f"/api/photos/photos/{pid}/file")
    assert file.status_code == 200 and file.headers["content-type"] == "image/png"
    assert "immutable" in file.headers["cache-control"]
    assert [p["id"] for p in client.get("/api/photos/photos", params={"albums": str(album["id"])}).json()] == [pid]
    assert client.get("/api/photos/photos", params={"albums": "none"}).json() == []
    assert client.put(f"/api/photos/photos/{pid}", json={"album_id": None}, headers=AUTH).status_code == 200
    assert client.get("/api/photos/albums").json()["without_album"] == 1
    assert client.delete(f"/api/photos/photos/{pid}").status_code == 401
    assert client.delete(f"/api/photos/photos/{pid}", headers=AUTH).status_code == 204
    assert client.get(f"/api/photos/photos/{pid}/file").status_code == 404


def test_photo_rejects_non_images_and_big_files(client):
    assert client.post("/api/photos/photos", content=b"<html>not an image</html>", headers=AUTH).status_code == 422
    big = b"\xff\xd8\xff" + b"0" * 15_000_001
    assert client.post("/api/photos/photos", content=big, headers=AUTH).status_code == 413
    assert client.post("/api/photos/photos?album_id=99", content=png(), headers=AUTH).status_code == 422


def test_albums_unique_and_deleted_keeps_photos(client):
    assert client.post("/api/photos/albums", json={"name": "Jul"}, headers=AUTH).status_code == 201
    assert client.post("/api/photos/albums", json={"name": " jul "}, headers=AUTH).status_code == 409
    album = client.get("/api/photos/albums").json()["albums"][0]
    pid = client.post(f"/api/photos/photos?album_id={album['id']}", content=png(), headers=AUTH).json()["id"]
    assert client.delete(f"/api/photos/albums/{album['id']}", headers=AUTH).status_code == 204
    assert [p["id"] for p in client.get("/api/photos/photos").json()] == [pid]


def test_todo_flow(client):
    member = client.post("/api/members", json={"name": "Mette", "color": "coral"}, headers=AUTH).json()["id"]
    assert client.post("/api/todo/items", json={"title": "Køb mælk"}).status_code == 401
    a = client.post("/api/todo/items", json={"title": "Køb mælk", "member_id": member}, headers=AUTH).json()
    b = client.post("/api/todo/items", json={"title": "Betal SFO"}, headers=AUTH).json()
    assert client.post("/api/todo/items", json={"title": "x", "member_id": 99}, headers=AUTH).status_code == 422
    assert client.put(f"/api/todo/items/{a['id']}", json={"done": True}, headers=AUTH).json()["done"] is True
    assert [i["title"] for i in client.get("/api/todo/items").json()] == ["Betal SFO", "Køb mælk"]
    r = client.put(f"/api/todo/items/{b['id']}", json={"member_id": None, "set_member": True}, headers=AUTH)
    assert r.json()["member_id"] is None
    assert client.post("/api/todo/clear-done", headers=AUTH).status_code == 204
    assert [i["title"] for i in client.get("/api/todo/items").json()] == ["Betal SFO"]
    assert client.delete(f"/api/todo/items/{b['id']}", headers=AUTH).status_code == 204
    assert client.delete(f"/api/todo/items/{b['id']}", headers=AUTH).status_code == 404


def test_screen_settings_and_wallpaper(client):
    d = client.get("/api/dashboard/dashboards/default").json()
    assert d["start_view"] == "day" and d["touch"] is False and d["slideshow"]["transition"] == "fade"
    types = [w["type"] for w in d["widgets"]]
    assert types == ["person-agenda", "photo-slideshow", "meal-today", "todo", "clock"]
    body = {k: d[k] for k in ("name", "device", "orientation", "widgets")}
    body.update(start_view="week", touch=True, return_after=45, idle_photo_after=10,
                slideshow={"transition": "zoom", "interval": 10, "albums": [1], "overlay_clock": False,
                           "overlay_plan": True, "overlay_meal": False})
    r = client.put("/api/dashboard/dashboards/main", json=body, headers=AUTH)
    assert r.status_code == 200 and r.json()["start_view"] == "week" and r.json()["slideshow"]["transition"] == "zoom"
    for bad in ({"start_view": "month"}, {"return_after": 5}, {"idle_photo_after": 999},
                {"slideshow": {"transition": "spin"}}, {"slideshow": {"interval": 1}}):
        assert client.put("/api/dashboard/dashboards/main", json={**body, **bad}, headers=AUTH).status_code == 422, bad
    assert client.get("/api/family").json()["wallpaper"] == "ocean"
    assert client.put("/api/family", json={"wallpaper": "mint"}, headers=AUTH).json()["wallpaper"] == "mint"
    assert client.put("/api/family", json={"wallpaper": "neon"}, headers=AUTH).status_code == 422


def test_ticking_needs_no_code_but_other_changes_do(client):
    item = client.post("/api/todo/items", json={"title": "Køb mælk"}, headers=AUTH).json()
    r = client.post(f"/api/todo/items/{item['id']}/tick", json={"done": True})
    assert r.status_code == 200 and r.json()["done"] is True
    assert client.post(f"/api/todo/items/{item['id']}/tick", json={"done": False}).json()["done"] is False
    assert client.post("/api/todo/items/99/tick", json={"done": True}).status_code == 404
    assert client.put(f"/api/todo/items/{item['id']}", json={"done": True}).status_code == 401
    assert client.delete(f"/api/todo/items/{item['id']}").status_code == 401
