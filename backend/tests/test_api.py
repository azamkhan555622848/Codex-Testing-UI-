from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_user_and_prompt_flow():
    email = f"clinician-{uuid.uuid4()}@example.com"
    user_response = client.post(
        "/users",
        json={
            "email": email,
            "name": "Clinician",
            "role": "annotator",
        },
    )
    assert user_response.status_code == 201, user_response.text
    user_id = user_response.json()["id"]

    prompt_response = client.post(
        "/prompts",
        json={
            "title": "Sleep hygiene guidance",
            "body": "Patient struggles with insomnia.",
            "category": "sleep",
            "metadata": {"risk_level": "low"},
            "model_outputs": [
                {
                    "model_version": "policy-v1",
                    "response": "Consider a consistent bedtime routine.",
                    "parameters": {"temperature": "0.7"},
                }
            ],
        },
    )
    assert prompt_response.status_code == 201, prompt_response.text
    prompt_id = prompt_response.json()["id"]

    task_response = client.post(
        "/tasks",
        json={
            "prompt_id": prompt_id,
            "annotation_type": "rubric",
            "rubric_config": {"accuracy": 5, "empathy": 5},
            "assignee_ids": [user_id],
        },
    )
    assert task_response.status_code == 201, task_response.text

    assignments_response = client.get(f"/assignments/{user_id}")
    assert assignments_response.status_code == 200
    assignments = assignments_response.json()
    assert assignments
    assignment_id = assignments[0]["id"]

    submission = client.post(
        f"/assignments/{assignment_id}/submit",
        params={"user_id": user_id},
        json={
            "payload": {"accuracy": 4, "empathy": 5, "comments": "Strong guidance."},
            "comment": "Recommend adding follow-up plan.",
            "safety_incident": None,
        },
    )
    assert submission.status_code == 200, submission.text

    metrics = client.get("/analytics/metrics")
    assert metrics.status_code == 200
    names = [metric["name"] for metric in metrics.json()]
    assert "annotations_total" in names
