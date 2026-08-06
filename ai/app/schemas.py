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
    requested_at: Optional[str] = None


class Commit(BaseModel):
    message: str
    files_changed: list[str] = Field(default_factory=list)
    committed_at: Optional[str] = None


class AnalyzeRequest(BaseModel):
    project_id: str
    user_role: str
    user_experience_level: str
    interactions: list[Interaction]
    commits: list[Commit] = Field(default_factory=list)


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


class CaseStudy(BaseModel):
    title: str = Field(description="사례 제목 (커밋 이력이 있으면 작업/기능 단위 이름)")
    structural_issue: str = Field(
        description="이 사례의 핵심 요약 — 커밋 이력이 있으면 무엇을 구현/작업했는지, "
        "없으면 상호작용에서 드러난 구조적 문제"
    )
    interpretation: str = Field(
        description="커밋 이력이 있으면 어떻게 구현했는지(관련 커밋과 AI 상호작용을 연결한 "
        "과정), 없으면 그 문제가 의미하는 바에 대한 해석"
    )
    evidence: str = Field(description="근거가 된 실제 프롬프트/응답 발췌, 관련 커밋 메시지가 있으면 함께 인용")


class InteractionPattern(BaseModel):
    pattern_name: str = Field(description="패턴 이름 (예: 맥락 없는 재요청)")
    description: str = Field(description="패턴 설명, 실제 근거 인용 포함")


class RiskFlag(BaseModel):
    title: str = Field(description="위험 신호 제목")
    description: str = Field(description="무엇이 왜 위험한지에 대한 설명")
    evidence: str = Field(description="근거가 된 커밋 메시지/프롬프트 인용")


# --- 2단계: 심층 분석 (evaluations 테이블과 매핑) ---
class DeepAnalysisResult(BaseModel):
    key_conclusions: list[str] = Field(description="핵심 결론 1~2개")
    case_studies: list[CaseStudy] = Field(description="실제 사례 2~3건")
    strengths: list[str] = Field(description="실제 로그에 근거한 작업의 장점")
    weaknesses: list[str] = Field(description="실제 로그에 근거한 작업의 단점")
    interaction_patterns: list[InteractionPattern] = Field(description="주요 상호작용 패턴 목록")
    pattern_analysis: str = Field(description="위 패턴들을 종합한 분석 서술")
    task_flow_analysis: str = Field(description="작업 시도 흐름 및 반복 패턴 분석")
    risk_flags: list[RiskFlag] = Field(
        default_factory=list,
        description="검증 없이 커밋된 것으로 보이는 위험 신호 목록 (커밋 이력 없으면 빈 리스트)",
    )


# --- 3단계: AI Agent 활용 평가 + 컨설트 총평 (evaluations 테이블과 매핑) ---
class ConsultCategoryResult(BaseModel):
    category: Literal[
        "input_perspective",
        "prompt_efficiency",
        "technical_depth",
        "validation_maturity",
        "token_efficiency",
    ]
    score: float = Field(ge=0, le=5, description="0~5점, 0.5 단위로 채점 가능")
    positive_note: str = Field(description="이 항목에서 잘하고 있는 점 한 문장 (실제 근거 기반)")
    improvement_note: str = Field(description="이 항목에서 개선 여지가 있는 점 한 문장 (실제 근거 기반)")


class ConsultReviewResult(BaseModel):
    grade: Literal["A", "B", "C", "D", "F"]
    maturity_level: Literal["Awareness", "Developing", "Proficient", "Expert"]
    agent_usage_analysis: str = Field(description="AI Agent를 활용하는 방식(위임형/미세지시형 등) 분석")
    categories: list[ConsultCategoryResult] = Field(
        description="input_perspective, prompt_efficiency, technical_depth, "
        "validation_maturity, token_efficiency 순서로 정확히 5개"
    )
    consult_summary: str = Field(description="사용자의 연차·직무 맥락을 반영한 컨설트 총평")


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


# --- 5단계: 리포트 편집 (중복 인용/빈 문단 정리, 새 사실 생성 금지) ---
class EditedReport(BaseModel):
    key_conclusions: list[str] = Field(description="정리된 핵심 결론 (최소 2개 유지)")
    case_studies: list[CaseStudy] = Field(description="정리된 주요 작업 분석 사례")
    strengths: list[str]
    weaknesses: list[str]
    interaction_patterns: list[InteractionPattern]
    pattern_analysis: str
    task_flow_analysis: str
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    agent_usage_analysis: str
    consult_categories: list[ConsultCategoryResult] = Field(
        description="5개 항목, category 값과 순서·score는 원본과 동일하게 유지, "
        "positive_note/improvement_note만 중복 제거 목적으로 수정 가능"
    )
    consult_summary: str
    recommendations: list[Recommendation] = Field(
        description="category/priority는 원본 유지, problem/evidence/suggestion/example_prompt만 수정 가능"
    )


class AnalyzeResponse(BaseModel):
    prompt_analyses: list[PromptQualityResult]
    deep_analysis: DeepAnalysisResult
    consult_review: ConsultReviewResult
    recommendations: list[Recommendation]


class PipelineState(BaseModel):
    project_id: str
    user_role: str
    user_experience_level: str
    interactions: list[Interaction]
    commits: list[Commit] = Field(default_factory=list)
    prompt_analyses: Optional[list[PromptQualityResult]] = None
    deep_analysis: Optional[DeepAnalysisResult] = None
    consult_review: Optional[ConsultReviewResult] = None
    recommendations: Optional[list[Recommendation]] = None
