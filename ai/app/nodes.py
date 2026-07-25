import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.prompts import (
    MATURITY_SYSTEM,
    PROMPT_QUALITY_SYSTEM,
    RECOMMENDATION_SYSTEM,
    TASK_FLOW_SYSTEM,
    format_interactions,
)
from app.schemas import (
    MaturityResult,
    PipelineState,
    PromptQualityBatch,
    RecommendationBatch,
    TaskFlowResult,
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


def maturity_node(state: PipelineState) -> dict:
    llm = _llm(MaturityResult)
    quality_summary = "\n".join(
        f"- {qa.log_id} ({qa.prompt_type}): context={qa.context_score}, clarity={qa.clarity_score}, "
        f"constraint={qa.constraint_score}, goal={qa.goal_score}, 근거: {qa.evidence}"
        for qa in state.prompt_analyses
    )
    result: MaturityResult = llm.invoke(
        [
            SystemMessage(content=MATURITY_SYSTEM),
            HumanMessage(
                content=(
                    f"[행동 패턴 통계]\n{compute_behavior_stats(state.interactions)}\n\n"
                    f"[1단계 프롬프트 품질 분석 결과]\n{quality_summary}\n\n"
                    f"[원본 로그]\n{format_interactions(state.interactions)}"
                )
            ),
        ]
    )
    return {"evaluation": result}


def task_flow_node(state: PipelineState) -> dict:
    llm = _llm(TaskFlowResult)
    result: TaskFlowResult = llm.invoke(
        [
            SystemMessage(content=TASK_FLOW_SYSTEM),
            HumanMessage(
                content=(
                    f"[성숙도 판정]\n레벨: {state.evaluation.maturity_level}\n"
                    f"강점: {state.evaluation.strengths}\n약점: {state.evaluation.weaknesses}\n\n"
                    f"[시간 순 상호작용 로그]\n{format_interactions(state.interactions)}"
                )
            ),
        ]
    )
    return {"task_flow": result}


def recommendation_node(state: PipelineState) -> dict:
    llm = _llm(RecommendationBatch)
    quality_summary = "\n".join(f"- {qa.log_id}: {qa.evidence}" for qa in state.prompt_analyses)
    result: RecommendationBatch = llm.invoke(
        [
            SystemMessage(content=RECOMMENDATION_SYSTEM),
            HumanMessage(
                content=(
                    f"[성숙도 판정] {state.evaluation.maturity_level}\n"
                    f"강점: {state.evaluation.strengths}\n약점: {state.evaluation.weaknesses}\n\n"
                    f"[작업 흐름 평가]\n"
                    f"긍정 요인: {state.task_flow.positive_factors}\n"
                    f"개선 기회: {state.task_flow.improvement_opportunities}\n\n"
                    f"[프롬프트별 근거]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"recommendations": result.recommendations}
