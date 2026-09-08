"""
High School Management System API

A simple FastAPI application that allows students to view extracurricular
activities and lets teachers securely manage registrations.
"""

import json
import os
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Mergington High School API",
    description="API for viewing and managing extracurricular activities",
)

current_dir = Path(__file__).parent
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(current_dir, "static")),
    name="static",
)

ROOT_DIR = current_dir
TEACHERS_FILE = ROOT_DIR / "teachers.json"
ACTIVE_TOKENS: dict[str, dict] = {}


def load_teachers() -> dict:
    with TEACHERS_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = authorization.split(" ", 1)[1].strip()
    user = ACTIVE_TOKENS.get(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"],
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"],
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"],
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"],
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"],
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"],
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"],
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"],
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"],
    },
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.post("/login")
def login(credentials: dict):
    username = str(credentials.get("username", "")).strip()
    password = str(credentials.get("password", "")).strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    teachers = load_teachers()
    teacher_record = teachers.get(username)
    if teacher_record is None or teacher_record.get("password") != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = {
        "username": teacher_record["username"],
        "role": teacher_record.get("role", "teacher"),
        "full_name": teacher_record.get("full_name", username),
        "email": teacher_record.get("email", f"{username}@mergington.edu"),
    }
    token = f"{username}-{uuid.uuid4().hex}"
    ACTIVE_TOKENS[token] = user

    return {"token": token, "user": user}


@app.get("/me")
def get_current_profile(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(
    activity_name: str,
    email: str,
    current_user: dict = Depends(get_current_user),
):
    """Register a student for an activity. Teacher-only access."""
    del current_user

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")

    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(
    activity_name: str,
    email: str,
    current_user: dict = Depends(get_current_user),
):
    """Unregister a student from an activity. Teacher-only access."""
    del current_user

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")

    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
