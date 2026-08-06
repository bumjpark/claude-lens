from fastapi import FastAPI, HTTPException

from app import progress
from app.graph import pipeline
from app.nodes import apply_sample_size_caveat
from app.schemas import AnalyzeRequest, AnalyzeResponse, PipelineState

app = FastAPI(title="claude-lens AI Engine")


@app.get("/health")
def health():
    return {"status": "ok"}


def _sort_key(value):
    # None(시각 정보 없음)은 뒤로 보내고, 있는 값은 문자열 그대로 정렬해도 ISO 형식이라
    # 시간순과 일치한다.
    return (value is None, value or "")


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    if not request.interactions:
        raise HTTPException(status_code=400, detail="interactions가 비어있습니다")

    progress.reset(request.project_id)
    # DB 조회(interactionLogRepository.findByProjectId)에 정렬이 없어서 도착 순서가
    # 시간순이라는 보장이 없다. 재요청 체인 페어링(compute_retry_chains)과 커밋-상호작용
    # 조인이 전부 "배열 순서 = 시간 순서"를 가정하므로, 파이프라인 진입 시점에 한 번
    # 정렬해서 이후 모든 단계가 이 전제를 믿고 쓸 수 있게 한다.
    interactions = sorted(request.interactions, key=lambda i: _sort_key(i.requested_at))
    commits = sorted(request.commits, key=lambda c: _sort_key(c.committed_at))

    initial_state = PipelineState(
        project_id=request.project_id,
        user_role=request.user_role,
        user_experience_level=request.user_experience_level,
        interactions=interactions,
        commits=commits,
    )
    final_state = pipeline.invoke(initial_state)
    progress.set_done(request.project_id)

    # report_editor_node가 consult_summary를 다시 쓰므로, 표본 크기 고지는 파이프라인이
    # 완전히 끝난 뒤 여기서 마지막으로 적용해야 편집 단계에 지워지지 않는다.
    consult_review = apply_sample_size_caveat(final_state["consult_review"], len(interactions))

    return AnalyzeResponse(
        prompt_analyses=final_state["prompt_analyses"],
        deep_analysis=final_state["deep_analysis"],
        consult_review=consult_review,
        recommendations=final_state["recommendations"],
    )


@app.get("/analyze/{project_id}/status")
def analyze_status(project_id: str) -> dict:
    return progress.get(project_id)
