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
