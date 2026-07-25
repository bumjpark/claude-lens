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


# --- 1단계: 프롬프트 품질 분석 ---
class PromptQualityResult(BaseModel):
    interaction_id: str
    context_score: int = Field(ge=0, le=100, description="충분한 맥락을 제공했는지")
    clarity_score: int = Field(ge=0, le=100, description="요구사항이 명확한지")
    evidence: str = Field(description="판단 근거가 된 실제 프롬프트 발췌 + 이유")


class PromptQualityBatch(BaseModel):
    results: list[PromptQualityResult]


# --- 2단계: 성숙도 판정 ---
class MaturityResult(BaseModel):
    level: Literal["Awareness", "Developing", "Proficient", "Expert"]
    prompt_quality_score: int = Field(ge=0, le=100)
    context_score: int = Field(ge=0, le=100)
    validation_score: int = Field(ge=0, le=100, description="AI 결과를 검증하는 정도")
    problem_solving_score: int = Field(ge=0, le=100)
    collaboration_score: int = Field(ge=0, le=100)
    reasoning: str = Field(description="이 레벨로 판단한 근거")
    next_level_conditions: str = Field(description="다음 단계로 성장하기 위한 조건")


# --- 3단계: 작업 흐름 평가 ---
class TaskFlowResult(BaseModel):
    positive_factors: list[str]
    improvement_opportunities: list[str]
    summary: str


# --- 4단계: 개선 제안 ---
class Recommendation(BaseModel):
    problem: str
    evidence: str = Field(description="근거가 된 실제 로그 발췌")
    recommendation: str
    example_prompt: str = Field(description="개선된 프롬프트 예시")


class RecommendationBatch(BaseModel):
    recommendations: list[Recommendation]


class AnalyzeResponse(BaseModel):
    prompt_analyses: list[PromptQualityResult]
    maturity: MaturityResult
    task_flow: TaskFlowResult
    recommendations: list[Recommendation]


class PipelineState(BaseModel):
    project_id: str
    interactions: list[Interaction]
    prompt_analyses: Optional[list[PromptQualityResult]] = None
    maturity: Optional[MaturityResult] = None
    task_flow: Optional[TaskFlowResult] = None
    recommendations: Optional[list[Recommendation]] = None
