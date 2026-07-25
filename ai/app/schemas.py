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


# --- 2단계: 성숙도 판정 (evaluations 테이블과 매핑) ---
class MaturityResult(BaseModel):
    maturity_level: Literal["Awareness", "Developing", "Proficient", "Expert"]
    prompt_quality_score: int = Field(ge=0, le=100)
    efficiency_score: int = Field(ge=0, le=100, description="같은 목표를 더 적은 왕복으로 달성하는 정도")
    context_usage_score: int = Field(ge=0, le=100)
    validation_score: int = Field(ge=0, le=100, description="AI 결과를 검증하는 정도")
    collaboration_score: int = Field(ge=0, le=100)
    total_score: int = Field(ge=0, le=100)
    grade: Literal["A", "B", "C", "D", "F"]
    strengths: list[str] = Field(description="실제 로그에 근거한 강점 목록")
    weaknesses: list[str] = Field(description="실제 로그에 근거한 약점/다음 단계로 가기 위한 조건 목록")


# --- 3단계: 작업 흐름 평가 ---
class TaskFlowResult(BaseModel):
    positive_factors: list[str]
    improvement_opportunities: list[str]
    summary: str


# --- 4단계: 개선 제안 (recommendations 테이블과 매핑) ---
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
    evaluation: MaturityResult
    task_flow: TaskFlowResult
    recommendations: list[Recommendation]


class PipelineState(BaseModel):
    project_id: str
    interactions: list[Interaction]
    prompt_analyses: Optional[list[PromptQualityResult]] = None
    evaluation: Optional[MaturityResult] = None
    task_flow: Optional[TaskFlowResult] = None
    recommendations: Optional[list[Recommendation]] = None
