from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .models import AnnotationType, UserRole


class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole = UserRole.annotator
    specialty: Optional[str] = None
    experience_years: Optional[int] = None


class UserCreate(UserBase):
    password: Optional[str] = None  # placeholder for integration


class UserRead(UserBase):
    id: int

    class Config:
        orm_mode = True


class PromptBase(BaseModel):
    title: str
    body: str
    category: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class PromptCreate(PromptBase):
    model_outputs: Optional[List["ModelOutputCreate"]] = None


class PromptRead(PromptBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class ModelOutputBase(BaseModel):
    model_version: str
    response: str
    parameters: Optional[Dict[str, str]] = None


class ModelOutputCreate(ModelOutputBase):
    pass


class ModelOutputRead(ModelOutputBase):
    id: int
    prompt_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class AnnotationTaskBase(BaseModel):
    prompt_id: int
    annotation_type: AnnotationType
    rubric_config: Optional[Dict[str, float]] = None


class AnnotationTaskCreate(AnnotationTaskBase):
    assignee_ids: Optional[List[int]] = None
    due_at: Optional[datetime] = None


class AnnotationTaskRead(AnnotationTaskBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        orm_mode = True


class AssignmentRequest(BaseModel):
    due_at: Optional[datetime] = None


class TaskAssignmentRead(BaseModel):
    id: int
    task_id: int
    status: str
    due_at: Optional[datetime]
    created_at: datetime

    class Config:
        orm_mode = True


class AnnotationCreate(BaseModel):
    payload: Dict[str, object]
    comment: Optional[str] = None
    safety_incident: Optional[Dict[str, object]] = Field(
        default=None, description="Optional safety incident metadata"
    )


class AnnotationRead(BaseModel):
    id: int
    task_id: int
    assignment_id: int
    user_id: int
    payload: Dict[str, object]
    comment: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class AssignmentDetail(TaskAssignmentRead):
    task: AnnotationTaskRead
    prompt: PromptRead
    model_outputs: List[ModelOutputRead]


class AnalyticsMetric(BaseModel):
    name: str
    value: float
    unit: Optional[str] = None
    description: Optional[str] = None
