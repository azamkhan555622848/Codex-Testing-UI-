from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Sequence

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from . import models, schemas


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=user.email,
        name=user.name,
        role=user.role,
        specialty=user.specialty,
        experience_years=user.experience_years,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_or_create_users(db: Session, users: Sequence[schemas.UserCreate]) -> List[models.User]:
    existing = {
        u.email: u
        for u in db.query(models.User).filter(models.User.email.in_([usr.email for usr in users]))
    }
    result = []
    for user in users:
        if user.email in existing:
            result.append(existing[user.email])
        else:
            result.append(create_user(db, user))
    return result


def create_prompt(db: Session, prompt: schemas.PromptCreate) -> models.Prompt:
    db_prompt = models.Prompt(
        title=prompt.title,
        body=prompt.body,
        category=prompt.category,
        metadata=prompt.metadata,
    )
    db.add(db_prompt)
    db.flush()

    if prompt.model_outputs:
        for output in prompt.model_outputs:
            db_output = models.ModelOutput(
                prompt=db_prompt,
                model_version=output.model_version,
                response=output.response,
                parameters=output.parameters,
            )
            db.add(db_output)

    db.commit()
    db.refresh(db_prompt)
    return db_prompt


def create_task(db: Session, task_in: schemas.AnnotationTaskCreate) -> models.AnnotationTask:
    db_task = models.AnnotationTask(
        prompt_id=task_in.prompt_id,
        annotation_type=task_in.annotation_type,
        rubric_config=task_in.rubric_config,
    )
    db.add(db_task)
    db.flush()

    if task_in.assignee_ids:
        for assignee_id in task_in.assignee_ids:
            assignment = models.TaskAssignment(
                task=db_task, user_id=assignee_id, due_at=task_in.due_at
            )
            db.add(assignment)

    db.commit()
    db.refresh(db_task)
    return db_task


def assign_task(db: Session, task_id: int, user_id: int, due_at: Optional[datetime]) -> models.TaskAssignment:
    assignment = (
        db.query(models.TaskAssignment)
        .filter(models.TaskAssignment.task_id == task_id, models.TaskAssignment.user_id == user_id)
        .one_or_none()
    )
    if assignment:
        assignment.due_at = due_at
        assignment.status = "pending"
    else:
        assignment = models.TaskAssignment(
            task_id=task_id, user_id=user_id, due_at=due_at, status="pending"
        )
        db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def fetch_assignments_for_user(db: Session, user_id: int) -> List[schemas.AssignmentDetail]:
    assignments = (
        db.query(models.TaskAssignment)
        .options(
            joinedload(models.TaskAssignment.task).joinedload(models.AnnotationTask.prompt),
            joinedload(models.TaskAssignment.task).joinedload(models.AnnotationTask.prompt).joinedload(
                models.Prompt.model_outputs
            ),
        )
        .filter(models.TaskAssignment.user_id == user_id)
        .all()
    )

    result: List[schemas.AssignmentDetail] = []
    for assignment in assignments:
        prompt = assignment.task.prompt
        detail = schemas.AssignmentDetail(
            id=assignment.id,
            task_id=assignment.task_id,
            status=assignment.status,
            due_at=assignment.due_at,
            created_at=assignment.created_at,
            task=schemas.AnnotationTaskRead.from_orm(assignment.task),
            prompt=schemas.PromptRead.from_orm(prompt),
            model_outputs=[schemas.ModelOutputRead.from_orm(o) for o in prompt.model_outputs],
        )
        result.append(detail)
    return result


def submit_annotation(
    db: Session,
    assignment_id: int,
    user_id: int,
    annotation: schemas.AnnotationCreate,
) -> models.Annotation:
    db_assignment = (
        db.query(models.TaskAssignment)
        .options(joinedload(models.TaskAssignment.task))
        .filter(models.TaskAssignment.id == assignment_id)
        .one()
    )

    db_annotation = models.Annotation(
        task_id=db_assignment.task_id,
        assignment_id=assignment_id,
        user_id=user_id,
        payload=annotation.payload,
        comment=annotation.comment,
    )
    db.add(db_annotation)

    db_assignment.status = "completed"

    if annotation.safety_incident:
        incident = models.SafetyIncident(
            annotation=db_annotation,
            severity=str(annotation.safety_incident.get("severity", "info")),
            tags=annotation.safety_incident.get("tags"),
        )
        db.add(incident)

    db.add(
        models.AuditLog(
            actor_id=user_id,
            action="submit_annotation",
            payload={"assignment_id": assignment_id, "task_id": db_assignment.task_id},
        )
    )
    db.commit()
    db.refresh(db_annotation)
    return db_annotation


def get_metrics(db: Session) -> List[schemas.AnalyticsMetric]:
    total_annotations = db.query(func.count(models.Annotation.id)).scalar() or 0
    completed_assignments = (
        db.query(func.count(models.TaskAssignment.id))
        .filter(models.TaskAssignment.status == "completed")
        .scalar()
        or 0
    )
    total_assignments = db.query(func.count(models.TaskAssignment.id)).scalar() or 0
    completion_rate = (
        float(completed_assignments) / total_assignments * 100 if total_assignments else 0.0
    )

    safety_incidents = db.query(func.count(models.SafetyIncident.id)).scalar() or 0

    return [
        schemas.AnalyticsMetric(
            name="annotations_total",
            value=float(total_annotations),
            description="Total annotations submitted",
        ),
        schemas.AnalyticsMetric(
            name="assignment_completion_rate",
            value=completion_rate,
            unit="%",
            description="Percentage of assignments marked as completed",
        ),
        schemas.AnalyticsMetric(
            name="safety_incidents_total",
            value=float(safety_incidents),
            description="Total safety incidents flagged by annotators",
        ),
    ]
