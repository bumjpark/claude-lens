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

  // 200이어도 바디가 비어있는 응답이 있을 수 있어서(예: 204 대신 200으로 내려오는 경우),
  // 상태 코드만 보고 바로 res.json()을 부르면 빈 문자열 파싱 실패로 성공을 실패로
  // 오인할 수 있다. 텍스트로 먼저 읽고 비어있으면 파싱을 건너뛴다.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
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

export interface RiskFlag {
  title: string;
  description: string;
  evidence: string;
}

export interface ConsultCategory {
  category: string;
  score: number;
  positiveNote: string;
  improvementNote: string;
}

interface EvaluationBase {
  id: string;
  evaluatedAt: string;
  recommendations: Recommendation[];
  commitCount: number | null;
  interactionCount: number;
  avgResponseTimeMs: number | null;
  medianResponseTimeMs: number | null;
  activitySummary: string;
  keyConclusions: string[];
  retryCount: number | null;
  estimatedWastedMinutes: number | null;
  // 비교 대상 사용자가 너무 적으면(현재 5명 미만) null — "상위 N%"를 표시할 수 없다는 뜻
  peerPercentile: number | null;
  peerCount: number;
}

// 결제 전에는 3~7번 섹션에 해당하는 필드를 서버가 아예 내려주지 않는다.
// paid로 분기되는 판별 유니언이라 `if (evaluation.paid)` 안에서는 아래 필드들이
// null 걱정 없이 그대로 좁혀진다.
export type Evaluation =
  | (EvaluationBase & { paid: false })
  | (EvaluationBase & {
      paid: true;
      maturityLevel: string;
      grade: string;
      agentUsageAnalysis: string;
      caseStudies: CaseStudy[];
      strengths: string[];
      weaknesses: string[];
      interactionPatterns: InteractionPattern[];
      patternAnalysis: string;
      riskFlags: RiskFlag[];
      consultCategories: ConsultCategory[];
      consultSummary: string;
      consultTotalScore: number;
      consultLevel: string;
    });

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

export interface PaymentPrepareResult {
  orderId: string;
  amount: number;
  orderName: string;
}

export function preparePayment(projectId: string) {
  return request<PaymentPrepareResult>(`/api/v1/projects/${projectId}/payment/prepare`, {
    method: 'POST',
  });
}

export function confirmPayment(
  projectId: string,
  input: { orderId: string; paymentKey: string; amount: number },
) {
  return request<void>(`/api/v1/projects/${projectId}/payment/confirm`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
