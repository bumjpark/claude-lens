import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.progress import set_stage
from app.prompts import (
    ANALYSIS_SYSTEM,
    PROMPT_QUALITY_SYSTEM,
    RECOMMENDATION_SYSTEM,
    format_interactions,
)
from app.schemas import (
    AnalysisResult,
    PipelineState,
    PromptQualityBatch,
    RecommendationBatch,
)

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")


def _llm(schema):
    return ChatOpenAI(model=MODEL, temperature=0).with_structured_output(schema)


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
        result: PromptQualityBatch = llm.invoke(
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


def analysis_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 2)
    llm = _llm(AnalysisResult)
    quality_summary = format_quality_summary(state.prompt_analyses)
    result: AnalysisResult = llm.invoke(
        [
            SystemMessage(content=ANALYSIS_SYSTEM),
            HumanMessage(
                content=(
                    f"[사용자 정보] 역할: {state.user_role}, 연차: {state.user_experience_level}\n\n"
                    f"[행동 패턴 통계]\n{compute_behavior_stats(state.interactions)}\n\n"
                    f"[1단계 프롬프트 품질 분석 결과 (시간 순)]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"evaluation": result}


def recommendation_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 3)
    llm = _llm(RecommendationBatch)
    quality_summary = "\n".join(f"- {qa.log_id}: {qa.evidence}" for qa in state.prompt_analyses)
    result: RecommendationBatch = llm.invoke(
        [
            SystemMessage(content=RECOMMENDATION_SYSTEM),
            HumanMessage(
                content=(
                    f"[종합 분석]\n"
                    f"등급: {state.evaluation.grade}, 성숙도: {state.evaluation.maturity_level}\n"
                    f"로그 분석: {state.evaluation.interaction_log_analysis}\n"
                    f"작업 흐름: {state.evaluation.task_flow_analysis}\n"
                    f"Agent 활용 방식: {state.evaluation.agent_usage_analysis}\n"
                    f"연차·직무 맥락 해석: {state.evaluation.context_interpretation}\n\n"
                    f"[프롬프트별 근거]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"recommendations": result.recommendations}
