import { getToken } from './auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? JSON.stringify(body);
    } catch {
      // 응답 본문이 없거나 JSON이 아닌 경우 statusText를 그대로 사용
    }
    throw new ApiError(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  email: string;
  name: string;
}

export function signup(input: {
  email: string;
  password: string;
  name: string;
  role: string;
  experienceLevel: string;
}) {
  return request<AuthResponse>('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface Project {
  id: string;
  name: string;
  apiKey: string;
  language: string | null;
  framework: string | null;
  projectSize: string | null;
  devEnvironment: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export function listProjects() {
  return request<Project[]>('/api/v1/projects');
}

export function getProject(id: string) {
  return request<Project>(`/api/v1/projects/${id}`);
}

export function createProject(input: { name: string; language?: string; framework?: string }) {
  return request<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function regenerateApiKey(projectId: string) {
  return request<Project>(`/api/v1/projects/${projectId}/api-key/regenerate`, {
    method: 'POST',
  });
}

export interface Recommendation {
  id: string;
  category: string;
  priority: string;
  problem: string;
  evidence: string;
  suggestion: string;
  examplePrompt: string;
}

export interface CaseStudy {
  title: string;
  structuralIssue: string;
  interpretation: string;
  evidence: string;
}

export interface InteractionPattern {
  patternName: string;
  description: string;
}

export interface ConsultCategory {
  category: string;
  score: number;
  positiveNote: string;
  improvementNote: string;
}

export interface Evaluation {
  id: string;
  maturityLevel: string;
  grade: string;
  evaluatedAt: string;
  recommendations: Recommendation[];
  commitCount: number | null;
  interactionCount: number;
  avgResponseTimeMs: number | null;
  medianResponseTimeMs: number | null;
  activitySummary: string;
  agentUsageAnalysis: string;
  keyConclusions: string[];
  caseStudies: CaseStudy[];
  strengths: string[];
  weaknesses: string[];
  interactionPatterns: InteractionPattern[];
  patternAnalysis: string;
  consultCategories: ConsultCategory[];
  consultSummary: string;
  consultTotalScore: number;
  consultLevel: string;
}

export function getEvaluation(projectId: string) {
  return request<Evaluation>(`/api/v1/projects/${projectId}/evaluation`);
}

export function runAnalysis(projectId: string) {
  return request<Evaluation>(`/api/v1/projects/${projectId}/analyze`, {
    method: 'POST',
  });
}

export interface AnalysisProgress {
  stage: number;
  label: string;
  done: boolean;
}

export function getAnalysisProgress(projectId: string) {
  return request<AnalysisProgress>(`/api/v1/projects/${projectId}/analyze/status`);
}
