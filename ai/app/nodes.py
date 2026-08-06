import logging
import os
import re
from datetime import datetime

from langchain_core.exceptions import OutputParserException
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.progress import set_stage
from app.prompts import (
    CONSULT_REVIEW_SYSTEM,
    DEEP_ANALYSIS_SYSTEM,
    PROMPT_QUALITY_SYSTEM,
    RECOMMENDATION_SYSTEM,
    REPORT_EDITOR_SYSTEM,
    format_interactions,
)
from app.schemas import (
    ConsultReviewResult,
    DeepAnalysisResult,
    EditedReport,
    PipelineState,
    PromptQualityBatch,
    RecommendationBatch,
)

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
# 1단계는 상호작용을 5건씩 쪼개 여러 번 호출해서 비용 비중이 가장 크다.
# 점수 매기기 위주의 비교적 단순한 작업이라 저렴한 모델로도 충분해서 따로 분리한다.
MODEL_LIGHT = os.environ.get("OPENAI_MODEL_LIGHT", "gpt-4o-mini")

logger = logging.getLogger(__name__)


def _llm(schema, model=MODEL):
    return ChatOpenAI(model=model, temperature=0).with_structured_output(schema)


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


def _parse_requested_at(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


# LLM에게 시간 계산을 시키면 틀리기 쉬워서, 재요청 직전 상호작용과의 실제 소요 시간을
# 파이썬에서 미리 계산해 넘긴다. recommendation_node가 "이 프롬프트가 실제로 얼마나
# 손실을 냈는지"를 반사실로 제시할 때 쓰는 재료다.
def compute_retry_chains(interactions) -> str:
    lines = []
    for prev, cur in zip(interactions, interactions[1:]):
        if not cur.is_retry:
            continue
        prev_dt = _parse_requested_at(prev.requested_at)
        cur_dt = _parse_requested_at(cur.requested_at)
        prev_snippet = prev.prompt_text[:60]
        cur_snippet = cur.prompt_text[:60]
        if prev_dt and cur_dt:
            delta_min = (cur_dt - prev_dt).total_seconds() / 60
            lines.append(f"- 「{prev_snippet}」 → 재요청 「{cur_snippet}」 (약 {delta_min:.0f}분 소요)")
        else:
            lines.append(f"- 「{prev_snippet}」 → 재요청 「{cur_snippet}」 (소요 시간 불명)")
    return "\n".join(lines) or "(재요청 체인 없음)"


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
    llm = _llm(PromptQualityBatch, model=MODEL_LIGHT)
    interactions = state.interactions
    all_results = []

    for start in range(0, len(interactions), PROMPT_QUALITY_CHUNK_SIZE):
        chunk = interactions[start : start + PROMPT_QUALITY_CHUNK_SIZE]
        previous = interactions[start - 1] if start > 0 else None
        result: PromptQualityBatch = _invoke_with_retry(
            llm,
            [
                SystemMessage(content=PROMPT_QUALITY_SYSTEM),
                HumanMessage(
                    content=(
                        f"다음은 한 개발자의 AI 상호작용 로그 {len(chunk)}건입니다. "
                        f"반드시 {len(chunk)}건 전부에 대해 하나씩 빠짐없이 평가해주세요. "
                        "log_id는 상호작용의 id를 그대로 쓰세요.\n\n"
                        + format_interactions(chunk, previous=previous)
                    )
                ),
            ]
        )
        all_results.extend(result.results)

    return {"prompt_analyses": all_results}


# 상호작용 자체(state.interactions)에는 시각이 있지만 1단계 결과(PromptQualityResult)에는
# 없어서, log_id로 다시 조인해서 커밋 시각과 비교 가능한 시각을 함께 보여준다.
def format_quality_summary(prompt_analyses, interactions) -> str:
    requested_at_by_id = {i.id: i.requested_at for i in interactions}
    return "\n".join(
        f"- {qa.log_id} ({qa.prompt_type}, 시각={requested_at_by_id.get(qa.log_id) or '알수없음'}): "
        f"context={qa.context_score}, clarity={qa.clarity_score}, "
        f"constraint={qa.constraint_score}, goal={qa.goal_score}, 근거: {qa.evidence}"
        for qa in prompt_analyses
    )


# 3~4단계는 1단계의 점수 자체보다 인용 근거만 있으면 충분하다 (점수는 2단계 심층 분석에서
# 이미 종합됐음). 매번 같은 원본 요약 전체를 다시 보내는 대신 가벼운 버전을 쓴다.
def format_evidence_digest(prompt_analyses) -> str:
    return "\n".join(f"- {qa.log_id}: {qa.evidence}" for qa in prompt_analyses)


# 각 단계가 독립적으로 "가장 좋은 근거"를 고르면 같은 인용문을 반복해서 뽑는 경향이 있다.
# LLM은 자기가 이전에 뭘 인용했는지 기억하지 못하므로, 앞 단계 결과에서 이미 쓰인 인용문을
# 직접 추출해서 다음 단계에 "재인용 금지" 목록으로 넘긴다.
_QUOTE = re.compile(r"「(.+?)」")


def extract_used_quotes(*texts) -> set[str]:
    quotes = set()
    for t in texts:
        if t:
            quotes.update(_QUOTE.findall(t))
    return quotes


def collect_report_text(deep_analysis=None, consult_review=None) -> str:
    parts = []
    if deep_analysis:
        parts.extend(deep_analysis.key_conclusions)
        parts.extend(cs.evidence for cs in deep_analysis.case_studies)
        parts.extend(deep_analysis.strengths)
        parts.extend(deep_analysis.weaknesses)
        parts.extend(p.description for p in deep_analysis.interaction_patterns)
        parts.append(deep_analysis.pattern_analysis)
        parts.append(deep_analysis.task_flow_analysis)
        parts.extend(rf.evidence for rf in deep_analysis.risk_flags)
    if consult_review:
        for c in consult_review.categories:
            parts.append(c.positive_note)
            parts.append(c.improvement_note)
        parts.append(consult_review.agent_usage_analysis)
        parts.append(consult_review.consult_summary)
    return "\n".join(parts)


def format_used_quotes(*texts) -> str:
    quotes = extract_used_quotes(*texts)
    if not quotes:
        return "(아직 없음)"
    return "\n".join(f"- 「{q}」" for q in sorted(quotes))


# 커밋 메시지 앞의 "feat:", "fix(scope):" 같은 conventional commit 접두어는 개발자
# 내부 관례라 리포트에는 노출할 필요가 없어서 LLM에 넘기기 전에 제거한다.
_CONVENTIONAL_COMMIT_PREFIX = re.compile(
    r"^(feat|fix|chore|docs|refactor|test|style|perf|build|ci|revert)(\([^)]*\))?!?\s*:\s*",
    re.IGNORECASE,
)


def strip_commit_prefix(message: str) -> str:
    return _CONVENTIONAL_COMMIT_PREFIX.sub("", message).strip()


# 커밋 시각과 상호작용 시각을 LLM이 직접 눈으로 비교하게 시키면 잘 못한다 — 이걸
# 파이썬에서 미리 계산해서 커밋마다 "근접 상호작용"을 붙여준다. 이 목록이 비어있으면
# (원본 대사 없음이 아니라 실제로 그 시간대에 상호작용이 없다는 뜻) case_studies가
# "AI 없이 진행된 것으로 보인다"고 말해도 근거 있는 관찰이 된다.
JOIN_WINDOW_HOURS = 6


def format_commits(commits, interactions=None) -> str:
    if not commits:
        return "(수집된 커밋 이력 없음)"
    lines = []
    for c in commits:
        files = ", ".join(c.files_changed[:10]) if c.files_changed else "(변경 파일 정보 없음)"
        message = strip_commit_prefix(c.message)
        line = f"- [{c.committed_at}] {message} (변경 파일: {files})"
        if interactions is not None:
            nearby = _nearby_interactions(c, interactions)
            if nearby:
                quoted = "; ".join(f"「{n.prompt_text[:60]}」" for n in nearby[:5])
                line += f"\n  근접 상호작용(±{JOIN_WINDOW_HOURS}시간 이내, 미리 계산됨): {quoted}"
            else:
                line += f"\n  근접 상호작용(±{JOIN_WINDOW_HOURS}시간 이내, 미리 계산됨): 없음"
        lines.append(line)
    return "\n".join(lines)


def _nearby_interactions(commit, interactions):
    c_dt = _parse_requested_at(commit.committed_at)
    if not c_dt:
        return []
    window = JOIN_WINDOW_HOURS * 3600
    result = []
    for i in interactions:
        i_dt = _parse_requested_at(i.requested_at)
        if i_dt and abs((i_dt - c_dt).total_seconds()) <= window:
            result.append(i)
    return result


def deep_analysis_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 2)
    llm = _llm(DeepAnalysisResult)
    quality_summary = format_quality_summary(state.prompt_analyses, state.interactions)
    commit_summary = format_commits(state.commits, state.interactions)
    result: DeepAnalysisResult = _invoke_with_retry(
        llm,
        [
            SystemMessage(content=DEEP_ANALYSIS_SYSTEM),
            HumanMessage(
                content=(
                    f"[사용자 정보] 역할: {state.user_role}, 연차: {state.user_experience_level}\n\n"
                    f"[행동 패턴 통계]\n{compute_behavior_stats(state.interactions)}\n\n"
                    f"[실제 Git 커밋 이력 (시간 순, 오래된 순)]\n{commit_summary}\n\n"
                    f"[1단계 프롬프트 품질 분석 결과 (시간 순)]\n{quality_summary}"
                )
            ),
        ]
    )
    return {"deep_analysis": result}


def consult_review_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 3)
    llm = _llm(ConsultReviewResult)
    evidence_digest = format_evidence_digest(state.prompt_analyses)
    used_quotes = format_used_quotes(collect_report_text(deep_analysis=state.deep_analysis))
    sample_size = len(state.interactions)
    da = state.deep_analysis
    result: ConsultReviewResult = _invoke_with_retry(
        llm,
        [
            SystemMessage(content=CONSULT_REVIEW_SYSTEM),
            HumanMessage(
                content=(
                    f"[사용자 정보] 역할: {state.user_role}, 연차: {state.user_experience_level}\n\n"
                    f"[표본 크기] 총 상호작용 {sample_size}건\n\n"
                    f"[행동 패턴 통계]\n{compute_behavior_stats(state.interactions)}\n\n"
                    f"[심층 분석 결과]\n"
                    f"핵심 결론: {da.key_conclusions}\n강점: {da.strengths}\n약점: {da.weaknesses}\n"
                    f"패턴 분석: {da.pattern_analysis}\n작업 흐름: {da.task_flow_analysis}\n\n"
                    f"[이미 앞 단계 리포트에서 인용된 문구 — 재인용 금지]\n{used_quotes}\n\n"
                    f"[1단계 프롬프트별 근거]\n{evidence_digest}"
                )
            ),
        ]
    )
    return {"consult_review": result}


# "N건 기준 잠정 평가" 같은 표본 크기 고지는 LLM이 매번 쓰리라 기대하지 않고 코드에서
# 결정적으로 붙인다. report_editor_node가 consult_summary를 다시 쓰기 때문에, 여기서
# 붙이면 편집 단계에서 지워질 수 있어 파이프라인 맨 끝(main.py)에서 적용해야 한다.
MIN_SAMPLE_SIZE_FOR_CONFIDENT_REVIEW = 30


def apply_sample_size_caveat(consult_review: ConsultReviewResult, sample_size: int) -> ConsultReviewResult:
    if sample_size >= MIN_SAMPLE_SIZE_FOR_CONFIDENT_REVIEW:
        return consult_review
    caveat = f"{sample_size}건의 상호작용 기준 잠정 평가입니다. "
    if consult_review.consult_summary.startswith(caveat):
        return consult_review
    return consult_review.model_copy(
        update={"consult_summary": caveat + consult_review.consult_summary}
    )


# 인용문 자체에 「」가 이미 들어있는 원문(사용자 프롬프트가 스스로 인용부호를 쓴 경우)을
# 그대로 재인용하면 화면에서 「「...」」로 이중 표시된다. 화면 쪽에서 이미 「」로 한 번
# 감싸주므로, LLM이 만든 evidence 안에 남아있는 「」는 여기서 미리 제거해둔다.
def _strip_quote_marks(text: str) -> str:
    return text.replace("「", "").replace("」", "") if text else text


# evidence가 빈 문자열(부재가 근거인 경우)이거나, 실제 로그 원문에 있는 문구여야 한다.
# 없는 문구를 지어냈거나 분석 결과 문장 자체를 evidence로 쓴 경우를 걸러낸다.
def _find_hallucinated_evidence(recommendations, interactions) -> list[str]:
    haystack = "\n".join(f"{i.prompt_text}\n{i.response_text}" for i in interactions)
    return [r.evidence for r in recommendations if r.evidence and r.evidence not in haystack]


def recommendation_node(state: PipelineState) -> dict:
    set_stage(state.project_id, 4)
    llm = _llm(RecommendationBatch)
    evidence_digest = format_evidence_digest(state.prompt_analyses)
    retry_chains = compute_retry_chains(state.interactions)
    behavior_stats = compute_behavior_stats(state.interactions)
    used_quotes = format_used_quotes(collect_report_text(deep_analysis=state.deep_analysis, consult_review=state.consult_review))
    da = state.deep_analysis
    cr = state.consult_review
    content = (
        f"[심층 분석]\n"
        f"핵심 결론: {da.key_conclusions}\n강점: {da.strengths}\n약점: {da.weaknesses}\n"
        f"패턴 분석: {da.pattern_analysis}\n\n"
        f"[AI Agent 활용 평가]\n"
        f"등급: {cr.grade}, 성숙도: {cr.maturity_level}\n"
        f"Agent 활용 방식: {cr.agent_usage_analysis}\n\n"
        f"[행동 패턴 통계]\n{behavior_stats}\n\n"
        f"[재요청으로 이어진 프롬프트 목록 (실제 소요 시간)]\n{retry_chains}\n\n"
        f"[이미 앞 단계 리포트에서 인용된 문구 — 재인용 금지]\n{used_quotes}\n\n"
        f"[프롬프트별 근거]\n{evidence_digest}"
    )

    result: RecommendationBatch | None = None
    for attempt in range(3):
        result = _invoke_with_retry(
            llm,
            [SystemMessage(content=RECOMMENDATION_SYSTEM), HumanMessage(content=content)],
        )
        bad = _find_hallucinated_evidence(result.recommendations, state.interactions)
        if not bad:
            break
        if attempt < 2:
            logger.warning("recommendation evidence 환각 감지, 재시도 %d/2", attempt + 1)
            quoted = "\n".join(f"- 「{b}」" for b in bad)
            content = (
                content
                + f"\n\n[검증 실패 — 다시 작성하세요]\n다음 evidence는 실제 로그(프롬프트/응답 "
                f"원문)에 존재하지 않는 문구입니다. evidence는 반드시 실제 원문 그대로 인용하거나, "
                f"근거가 '부재'(예: 리뷰 요청이 없음)라면 빈 문자열이어야 합니다:\n{quoted}"
            )

    recommendations = [
        r.model_copy(update={"evidence": _strip_quote_marks(r.evidence)})
        for r in result.recommendations
    ]
    return {"recommendations": recommendations}


_EXPECTED_CATEGORIES = [
    "input_perspective",
    "prompt_efficiency",
    "technical_depth",
    "validation_maturity",
    "token_efficiency",
]


def _format_report_draft(da: DeepAnalysisResult, cr: ConsultReviewResult, recommendations) -> str:
    case_studies = "\n".join(
        f"- title: {c.title}\n  structural_issue: {c.structural_issue}\n  "
        f"interpretation: {c.interpretation}\n  evidence: {c.evidence}"
        for c in da.case_studies
    )
    patterns = "\n".join(f"- {p.pattern_name}: {p.description}" for p in da.interaction_patterns)
    risk_flags = "\n".join(
        f"- title: {r.title}\n  description: {r.description}\n  evidence: {r.evidence}"
        for r in da.risk_flags
    ) or "(없음)"
    categories = "\n".join(
        f"- {c.category} ({c.score}점): positive_note={c.positive_note} / "
        f"improvement_note={c.improvement_note}"
        for c in cr.categories
    )
    recs = "\n".join(
        f"- category: {r.category}, priority: {r.priority}\n  problem: {r.problem}\n  "
        f"evidence: {r.evidence}\n  suggestion: {r.suggestion}\n  example_prompt: {r.example_prompt}"
        for r in recommendations
    )
    return (
        f"[key_conclusions]\n" + "\n".join(f"- {k}" for k in da.key_conclusions) + "\n\n"
        f"[case_studies]\n{case_studies}\n\n"
        f"[strengths]\n" + "\n".join(f"- {s}" for s in da.strengths) + "\n\n"
        f"[weaknesses]\n" + "\n".join(f"- {w}" for w in da.weaknesses) + "\n\n"
        f"[interaction_patterns]\n{patterns}\n\n"
        f"[pattern_analysis]\n{da.pattern_analysis}\n\n"
        f"[task_flow_analysis]\n{da.task_flow_analysis}\n\n"
        f"[risk_flags]\n{risk_flags}\n\n"
        f"[agent_usage_analysis]\n{cr.agent_usage_analysis}\n\n"
        f"[consult_categories]\n{categories}\n\n"
        f"[consult_summary]\n{cr.consult_summary}\n\n"
        f"[recommendations]\n{recs}"
    )


# 4개 노드가 각자 독립적으로 글을 쓰다 보니 아무도 리포트 전체를 다시 안 읽는 구조라,
# 마지막에 완성된 초안 전체를 한 번 더 검토해서 중복 인용/빈 문단만 정리한다. 새 사실을
# 만들어내지 않도록 지시하고, 구조가 깨지면(카테고리 5개 순서 등) 원본을 그대로 쓴다.
def report_editor_node(state: PipelineState) -> dict:
    llm = _llm(EditedReport)
    da = state.deep_analysis
    cr = state.consult_review
    draft = _format_report_draft(da, cr, state.recommendations)

    result: EditedReport = _invoke_with_retry(
        llm,
        [
            SystemMessage(content=REPORT_EDITOR_SYSTEM),
            HumanMessage(content=f"[리포트 초안]\n{draft}"),
        ]
    )

    categories = cr.categories
    if [c.category for c in result.consult_categories] == _EXPECTED_CATEGORIES:
        categories = result.consult_categories

    updated_deep_analysis = da.model_copy(update={
        "key_conclusions": result.key_conclusions or da.key_conclusions,
        "case_studies": result.case_studies or da.case_studies,
        "strengths": result.strengths or da.strengths,
        "weaknesses": result.weaknesses or da.weaknesses,
        "interaction_patterns": result.interaction_patterns or da.interaction_patterns,
        "pattern_analysis": result.pattern_analysis or da.pattern_analysis,
        "task_flow_analysis": result.task_flow_analysis or da.task_flow_analysis,
        "risk_flags": result.risk_flags,
    })
    updated_consult_review = cr.model_copy(update={
        "agent_usage_analysis": result.agent_usage_analysis or cr.agent_usage_analysis,
        "categories": categories,
        "consult_summary": result.consult_summary or cr.consult_summary,
    })

    return {
        "deep_analysis": updated_deep_analysis,
        "consult_review": updated_consult_review,
        "recommendations": result.recommendations or state.recommendations,
    }
