import requests
import pytest

BASE_URL = "http://127.0.0.1:8000"

# Test credentials

STUDENT_EMAIL = "test@example.com"
STUDENT_PASSWORD = "testpassword"
STUDENT_NAME = "Test Student"
STUDENT_USN = "1ABC123"
STUDENT_DEPT = "CSE"
STUDENT_SEMESTER = 4
STUDENT_STATUS = "active"

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"

@pytest.fixture(scope="module")
def student_tokens():
    # Register student with all profile fields
    requests.post(f"{BASE_URL}/auth/register/", json={
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "role": "student",
        "name": STUDENT_NAME,
        "usn": STUDENT_USN,
        "dept": STUDENT_DEPT,
        "semester": STUDENT_SEMESTER,
        "status": STUDENT_STATUS
    })
    resp = requests.post(f"{BASE_URL}/auth/login/", json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
    assert resp.status_code == 200
    data = resp.json()
    return data["access"], data["refresh"]

@pytest.fixture(scope="module")
def admin_tokens():
    # Register admin if not exists
    requests.post(f"{BASE_URL}/auth/register/", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "role": "admin"
    })
    resp = requests.post(f"{BASE_URL}/auth/login/", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200
    data = resp.json()
    return data["access"], data["refresh"]

def test_student_dashboard(student_tokens):
    access, _ = student_tokens
    resp = requests.get(f"{BASE_URL}/me/dashboard/", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert "student" in resp.json() or "dues" in resp.json()

def test_admin_students(admin_tokens):
    access, _ = admin_tokens
    resp = requests.get(f"{BASE_URL}/students/", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert "students" in resp.json() or isinstance(resp.json(), list)

def test_student_profile(student_tokens):
    access, _ = student_tokens
    resp = requests.get(f"{BASE_URL}/me/profile/", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert "name" in resp.json() or "usn" in resp.json()

def test_fee_components(admin_tokens):
    access, _ = admin_tokens
    resp = requests.get(f"{BASE_URL}/fee/components/", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_notifications(student_tokens):
    access, _ = student_tokens
    resp = requests.get(f"{BASE_URL}/notifications/", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
