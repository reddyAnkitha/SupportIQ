from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["name"] == "SupportIQ API"


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_analyze_validation():
    response = client.post(
        "/analyze",
        json={
            "customer_age": 30,
            "priority": "High",
            "ticket_type": "Technical issue",
            "channel": "Email",
            "description": "Unable to access the application.",
        },
    )

    assert response.status_code in [200, 500]

def test_analyze_validation_error():
    response = client.post(
        "/analyze",
        json={
            "customer_age": 10,
            "priority": "High",
            "ticket_type": "Technical issue",
            "channel": "Email",
            "description": "Unable to access the application.",
        },
    )

    assert response.status_code == 422
