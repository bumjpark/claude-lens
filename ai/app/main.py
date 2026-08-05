from fastapi import FastAPI, HTTPException

from app import progress
from app.graph import pipeline
from app.schemas import AnalyzeRequest, AnalyzeResponse, PipelineState

app = FastAPI(title="claude-lens AI Engine")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    if not request.interactions:
        raise HTTPException(status_code=400, detail="interactions가 비어있습니다")

    progress.reset(request.project_id)
    initial_state = PipelineState(
        project_id=request.project_id,
        user_role=request.user_role,
        user_experience_level=request.user_experience_level,
        interactions=request.interactions,
        commits=request.commits,
    )
    final_state = pipeline.invoke(initial_state)
    progress.set_done(request.project_id)

    return AnalyzeResponse(
        prompt_analyses=final_state["prompt_analyses"],
        deep_analysis=final_state["deep_analysis"],
        consult_review=final_state["consult_review"],
        recommendations=final_state["recommendations"],
    )


@app.get("/analyze/{project_id}/status")
def analyze_status(project_id: str) -> dict:
    return progress.get(project_id)
