import pytest
from fastapi.testclient import TestClient

from app.core import access_code
from app.main import create_app

TEST_CODE = "test-code-1234"
AUTH = {"X-Family-Code": TEST_CODE}


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("NEXMIO_DATA_DIR", str(tmp_path))
    access_code.reset_rate_limits()
    application = create_app()
    access_code.set_code(TEST_CODE)
    return application


@pytest.fixture
def client(app):
    return TestClient(app)


def event(**over):
    base = {
        "title": "Swimming",
        "date": "2026-11-17",
        "start": "16:00",
        "end": "17:00",
        "member_id": None,
        "category": "appointment",
        "notes": None,
    }
    base.update(over)
    return base


def imp(**over):
    """An event as it appears in an import file (a person name, not a member id)."""
    base = event(**over)
    base.pop("member_id", None)
    base.setdefault("person", None)
    base.update({k: v for k, v in over.items() if k == "person"})
    return base
