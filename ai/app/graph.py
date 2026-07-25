from langgraph.graph import END, START, StateGraph

from app.nodes import (
    maturity_node,
    prompt_quality_node,
    recommendation_node,
    task_flow_node,
)
from app.schemas import PipelineState


def build_graph():
    graph = StateGraph(PipelineState)
    graph.add_node("analyze_prompt_quality", prompt_quality_node)
    graph.add_node("judge_maturity", maturity_node)
    graph.add_node("evaluate_task_flow", task_flow_node)
    graph.add_node("generate_recommendations", recommendation_node)

    graph.add_edge(START, "analyze_prompt_quality")
    graph.add_edge("analyze_prompt_quality", "judge_maturity")
    graph.add_edge("judge_maturity", "evaluate_task_flow")
    graph.add_edge("evaluate_task_flow", "generate_recommendations")
    graph.add_edge("generate_recommendations", END)

    return graph.compile()


pipeline = build_graph()
