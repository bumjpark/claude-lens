from fastapi import FastAPI, HTTPException

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

    initial_state = PipelineState(project_id=request.project_id, interactions=request.interactions)
    final_state = pipeline.invoke(initial_state)

    return AnalyzeResponse(
        prompt_analyses=final_state["prompt_analyses"],
        maturity=final_state["maturity"],
        task_flow=final_state["task_flow"],
        recommendations=final_state["recommendations"],
    )
