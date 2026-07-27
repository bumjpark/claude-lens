from typing import Literal, Optional

from pydantic import BaseModel, Field


class Interaction(BaseModel):
    id: str
    prompt_text: str
    response_text: str
    is_retry: bool = False
    is_code_request: bool = False
    is_error_request: bool = False
    is_review_request: bool = False
    is_design_request: bool = False


class AnalyzeRequest(BaseModel):
    project_id: str
    user_role: str
    user_experience_level: str
    interactions: list[Interaction]


# --- 1단계: 프롬프트 품질 분석 (prompt_analyses 테이블과 매핑) ---
class PromptQualityResult(BaseModel):
    log_id: str
    prompt_type: Literal["debugging", "implementation", "learning", "review", "architecture"]
    context_score: int = Field(ge=0, le=100, description="문제 해결에 필요한 맥락을 충분히 제공했는지")
    clarity_score: int = Field(ge=0, le=100, description="요구사항과 목표가 명확한지")
    constraint_score: int = Field(ge=0, le=100, description="제약 조건(성능/스타일/범위 등)을 전달했는지")
    goal_score: int = Field(ge=0, le=100, description="달성하려는 목표를 설명했는지")
    total_quality_score: int = Field(ge=0, le=100)
    evidence: str = Field(description="판단 근거가 된 실제 프롬프트 발췌 + 이유")


class PromptQualityBatch(BaseModel):
    results: list[PromptQualityResult]


# --- 2단계: 종합 분석 (evaluations 테이블과 매핑) ---
class AnalysisResult(BaseModel):
    grade: Literal["A", "B", "C", "D", "F"]
    maturity_level: Literal["Awareness", "Developing", "Proficient", "Expert"]
    interaction_log_analysis: str = Field(description="AI 프롬프트 상호작용 로그에서 관찰되는 패턴, 실제 근거 인용 포함")
    task_flow_analysis: str = Field(description="작업 시도 흐름 및 반복 패턴 분석")
    agent_usage_analysis: str = Field(description="AI Agent를 활용하는 방식(위임형/미세지시형 등) 분석")
    context_interpretation: str = Field(description="사용자의 연차·직무 맥락을 반영한 해석")


# --- 3단계: 개선 제안 (recommendations 테이블과 매핑) ---
class Recommendation(BaseModel):
    category: Literal["prompt_quality", "context", "validation", "collaboration", "efficiency"]
    priority: Literal["high", "medium", "low"]
    problem: str
    evidence: str = Field(description="근거가 된 실제 로그 발췌")
    suggestion: str
    example_prompt: str = Field(description="개선된 프롬프트 예시")


class RecommendationBatch(BaseModel):
    recommendations: list[Recommendation]


class AnalyzeResponse(BaseModel):
    prompt_analyses: list[PromptQualityResult]
    evaluation: AnalysisResult
    recommendations: list[Recommendation]


class PipelineState(BaseModel):
    project_id: str
    user_role: str
    user_experience_level: str
    interactions: list[Interaction]
    prompt_analyses: Optional[list[PromptQualityResult]] = None
    evaluation: Optional[AnalysisResult] = None
    recommendations: Optional[list[Recommendation]] = None
