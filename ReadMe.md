# Holowellness RLHF Annotation Platform

This repository provides a reference implementation of the Holowellness human-feedback platform described in `docs/holowellness_rlhf_ui_plan.md`. It contains a FastAPI backend for task orchestration and a Vite/React frontend for annotators, reviewers, and admins.

## Project Structure

```
backend/          # FastAPI application and database models
backend/tests/    # Pytest suite validating core API flows
frontend/         # React + Chakra UI single-page application
```

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

The API uses SQLite by default (`holowellness.db`) and automatically creates tables on startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000` so you can iterate on the UI while running the FastAPI backend locally.

## Running Tests

```bash
cd backend
pytest
```

## Key Features

- Task creation API that supports rubric, comparison, and demonstration workflows.
- Assignment endpoints to fetch annotator queues and submit annotations with optional safety flags.
- Analytics endpoint providing aggregate metrics for dashboards.
- React dashboard with metrics, assignment summaries, and a task workspace tailored to the annotation modality.

Refer to `docs/holowellness_rlhf_ui_plan.md` for the long-term roadmap and implementation details.
