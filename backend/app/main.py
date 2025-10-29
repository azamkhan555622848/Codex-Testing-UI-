from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, schemas
from .database import Base, SessionLocal, engine
from .models import AnnotationType

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Holowellness RLHF Annotation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/users", response_model=schemas.UserRead, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user)


@app.post("/prompts", response_model=schemas.PromptRead, status_code=201)
def create_prompt(prompt: schemas.PromptCreate, db: Session = Depends(get_db)):
    return crud.create_prompt(db, prompt)


@app.post("/tasks", response_model=schemas.AnnotationTaskRead, status_code=201)
def create_task(task: schemas.AnnotationTaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, task)


@app.post("/tasks/{task_id}/assign/{user_id}", response_model=schemas.TaskAssignmentRead)
def assign_task(
    task_id: int,
    user_id: int,
    request: schemas.AssignmentRequest | None = None,
    db: Session = Depends(get_db),
):
    due_at = request.due_at if request else None
    return crud.assign_task(db, task_id=task_id, user_id=user_id, due_at=due_at)


@app.get("/assignments/{user_id}", response_model=list[schemas.AssignmentDetail])
def get_assignments(user_id: int, db: Session = Depends(get_db)):
    return crud.fetch_assignments_for_user(db, user_id)


@app.post("/assignments/{assignment_id}/submit", response_model=schemas.AnnotationRead)
def submit_annotation(
    assignment_id: int,
    annotation: schemas.AnnotationCreate,
    user_id: int,
    db: Session = Depends(get_db),
):
    assignments = crud.fetch_assignments_for_user(db, user_id)
    if not any(a.id == assignment_id for a in assignments):
        raise HTTPException(status_code=404, detail="Assignment not found for user")
    return crud.submit_annotation(db, assignment_id=assignment_id, user_id=user_id, annotation=annotation)


@app.get("/analytics/metrics", response_model=list[schemas.AnalyticsMetric])
def get_metrics(db: Session = Depends(get_db)):
    return crud.get_metrics(db)


@app.get("/tasks/support/annotation-types", response_model=list[str])
def get_annotation_types():
    return [atype.value for atype in AnnotationType]
