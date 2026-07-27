STAGE_LABELS = {
    1: "프롬프트 품질 분석",
    2: "심층 분석",
    3: "AI Agent 활용·컨설트 평가",
    4: "개선 제안 생성",
}

_progress: dict[str, dict] = {}


def reset(project_id: str) -> None:
    _progress[project_id] = {"stage": 0, "label": "준비 중", "done": False}


def set_stage(project_id: str, stage: int) -> None:
    _progress[project_id] = {"stage": stage, "label": STAGE_LABELS[stage], "done": False}


def set_done(project_id: str) -> None:
    current = _progress.get(project_id, {"stage": len(STAGE_LABELS)})
    _progress[project_id] = {"stage": current["stage"], "label": "완료", "done": True}


def get(project_id: str) -> dict:
    return _progress.get(project_id, {"stage": 0, "label": "대기 중", "done": False})
