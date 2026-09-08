import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_login_returns_profile_for_valid_teacher():
    response = client.post(
        "/login",
        json={"username": "admin", "password": "admin123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["username"] == "admin"
    assert payload["user"]["role"] == "teacher"
    assert "token" in payload


def test_me_requires_authentication():
    response = client.get("/me")
    assert response.status_code == 401


def test_student_can_view_activity_list_without_login():
    response = client.get("/activities")
    assert response.status_code == 200
