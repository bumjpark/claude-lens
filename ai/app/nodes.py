import logging
import os

from langchain_core.exceptions import OutputParserException
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.progress import set_stage
from app.prompts import (
    CONSULT_REVIEW_SYSTEM,
    DEEP_ANALYSIS_SYSTEM,
    PROMPT_QUALITY_SYSTEM,
    RECOMMENDATION_SYSTEM,
    format_interactions,
)
from app.schemas import (
    ConsultReviewResult,
    DeepAnalysisResult,
    PipelineState,
    PromptQualityBatch,
    RecommendationBatch,
)

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

logger = logging.getLogger(__name__)


def _llm(schema):
    return ChatOpenAI(model=MODEL, temperature=0).with_structured_output(schema)


# LLM이 드물게 같은 구절을 반복하다 응답이 깨져서(OutputParserException) 구조화 출력
# 파싱에 실패하는 경우가 있다. temperature=0이라도 재시도 시 다른 응답이 나올 수 있어서
# 몇 번 재시도해서 넘긴다.
def _invoke_with_retry(llm, messages, retries=2):
    last_error = None
    for attempt in range(retries + 1):
        try:
            return llm.invoke(messages)
        except OutputParserException as e:
            last_error = e
            logger.warning(
                "LLM 구조화 출력 파싱 실패, 재시도 %d/%d", attempt + 1, retries + 1
            )
    raise last_error


def compute_behavior_stats(interactions) -> str:
    total = len(interactions) or 1
    retry_rate = sum(1 for i in interactions if i.is_retry) / total * 100
    code_rate = sum(1 for i in interactions if i.is_code_request) / total * 100
    review_rate = sum(1 for i in interactions if i.is_review_request) / total * 100
    design_rate = sum(1 for i in interactions if i.is_design_request) / total * 100
    return (
        f"총 상호작용 {len(interactions)}건 중: "
        f"재요청 비율 {retry_rate:.1f}%, 코드요청 비율 {code_rate:.1f}%, "
        f"리뷰요청 비율 {review_rate:.1f}%, 설계질문 비율 {design_rate:.1f}%"
    )


# 한 번에 너무 많은 상호작용을 넣으면 LLM이 일부를 누락하고 응답하는 경우가 있어서
# (예: 42건 중 12건만 응답) 작은 묶음으로 쪼개서 호출한 뒤 합친다.
PROMPT_QUALITY_CHUNK_SIZE = 5


def prompt_quality_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 1)
    llm = _llm(PromptQualityBatch)
    interactions = state.interactions
    all_results = []

    for start in range(0, len(interactions), PROMPT_QUALITY_CHUNK_SIZE):
        chunk = interactions[start : start + PROMPT_QUALITY_CHUNK_SIZE]
        result: PromptQualityBatch = _invoke_with_retry(
            llm,
            [
                SystemMessage(content=PROMPT_QUALITY_SYSTEM),
                HumanMessage(
                    content=(
                        f"다음은 한 개발자의 AI 상호작용 로그 {len(chunk)}건입니다. "
                        f"반드시 {len(chunk)}건 전부에 대해 하나씩 빠짐없이 평가해주세요. "
                        "log_id는 상호작용의 id를 그대로 쓰세요.\n\n"
                        + format_interactions(chunk)
                    )
                ),
            ]
        )
        all_results.extend(result.results)

    return {"prompt_analyses": all_results}


def format_quality_summary(prompt_analyses) -> str:
    return "\n".join(
        f"- {qa.log_id} ({qa.prompt_type}): context={qa.context_score}, clarity={qa.clarity_score}, "
        f"constraint={qa.constraint_score}, goal={qa.goal_score}, 근거: {qa.evidence}"
        for qa in prompt_analyses
    )


def deep_analysis_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 2)
    llm = _llm(DeepAnalysisResult)
    quality_summary = format_quality_summary(state.prompt_analyses)
    result: DeepAnalysisResult = _invoke_with_retry(
        llm,
        [
            SystemMessage(content=DEEP_ANALYSIS_SYSTEM),
            HumanMessage(
                content=(
                    f"[사용자 정보] 역할: {state.user_role}, 연차: {state.user_experience_level}\n\n"
                    f"[행동 패턴 통계]\n{compute_behavior_stats(state.interactions)}\n\n"
                    f"[1단계 프롬프트 품질 분석 결과 (시간 순)]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"deep_analysis": result}


def consult_review_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 3)
    llm = _llm(ConsultReviewResult)
    quality_summary = format_quality_summary(state.prompt_analyses)
    da = state.deep_analysis
    result: ConsultReviewResult = _invoke_with_retry(
        llm,
        [
            SystemMessage(content=CONSULT_REVIEW_SYSTEM),
            HumanMessage(
                content=(
                    f"[사용자 정보] 역할: {state.user_role}, 연차: {state.user_experience_level}\n\n"
                    f"[행동 패턴 통계]\n{compute_behavior_stats(state.interactions)}\n\n"
                    f"[심층 분석 결과]\n"
                    f"핵심 결론: {da.key_conclusions}\n강점: {da.strengths}\n약점: {da.weaknesses}\n"
                    f"패턴 분석: {da.pattern_analysis}\n작업 흐름: {da.task_flow_analysis}\n\n"
                    f"[1단계 프롬프트 품질 분석 결과 (시간 순)]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"consult_review": result}


def recommendation_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 4)
    llm = _llm(RecommendationBatch)
    quality_summary = "\n".join(f"- {qa.log_id}: {qa.evidence}" for qa in state.prompt_analyses)
    da = state.deep_analysis
    cr = state.consult_review
    result: RecommendationBatch = _invoke_with_retry(
        llm,
        [
            SystemMessage(content=RECOMMENDATION_SYSTEM),
            HumanMessage(
                content=(
                    f"[심층 분석]\n"
                    f"핵심 결론: {da.key_conclusions}\n강점: {da.strengths}\n약점: {da.weaknesses}\n"
                    f"패턴 분석: {da.pattern_analysis}\n\n"
                    f"[AI Agent 활용 평가]\n"
                    f"등급: {cr.grade}, 성숙도: {cr.maturity_level}\n"
                    f"Agent 활용 방식: {cr.agent_usage_analysis}\n\n"
                    f"[프롬프트별 근거]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"recommendations": result.recommendations}
