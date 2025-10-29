import axios from 'axios';
import { AnnotationType } from './types';

export const api = axios.create({
  baseURL: '/api',
});

export type Prompt = {
  id: number;
  title: string;
  body: string;
  category?: string;
  metadata?: Record<string, string>;
};

export type ModelOutput = {
  id: number;
  prompt_id: number;
  response: string;
  model_version: string;
  parameters?: Record<string, string>;
};

export type AnnotationTask = {
  id: number;
  prompt_id: number;
  annotation_type: AnnotationType;
  rubric_config?: Record<string, number>;
  status: string;
  created_at: string;
};

export type AssignmentDetail = {
  id: number;
  task_id: number;
  status: string;
  due_at?: string | null;
  created_at: string;
  task: AnnotationTask;
  prompt: Prompt;
  model_outputs: ModelOutput[];
};

export type Metric = {
  name: string;
  value: number;
  unit?: string;
  description?: string;
};

export const fetchAssignments = async (userId: number) => {
  const response = await api.get<AssignmentDetail[]>(`/assignments/${userId}`);
  return response.data;
};

export const submitAnnotation = async (
  assignmentId: number,
  userId: number,
  payload: Record<string, unknown>,
  comment?: string,
  safetyIncident?: Record<string, unknown> | null,
) => {
  const response = await api.post(
    `/assignments/${assignmentId}/submit`,
    {
      payload,
      comment,
      safety_incident: safetyIncident ?? null,
    },
    {
      params: { user_id: userId },
    },
  );
  return response.data;
};

export const fetchMetrics = async () => {
  const response = await api.get<Metric[]>('/analytics/metrics');
  return response.data;
};

export const fetchAnnotationTypes = async () => {
  const response = await api.get<string[]>('/tasks/support/annotation-types');
  return response.data as AnnotationType[];
};
