from langgraph.graph import END, START, StateGraph

from app.nodes import (
    consult_review_node,
    deep_analysis_node,
    prompt_quality_node,
    recommendation_node,
)
from app.schemas import PipelineState


def build_graph():
    graph = StateGraph(PipelineState)
    graph.add_node("analyze_prompt_quality", prompt_quality_node)
    graph.add_node("run_deep_analysis", deep_analysis_node)
    graph.add_node("run_consult_review", consult_review_node)
    graph.add_node("generate_recommendations", recommendation_node)

    graph.add_edge(START, "analyze_prompt_quality")
    graph.add_edge("analyze_prompt_quality", "run_deep_analysis")
    graph.add_edge("run_deep_analysis", "run_consult_review")
    graph.add_edge("run_consult_review", "generate_recommendations")
    graph.add_edge("generate_recommendations", END)

    return graph.compile()


pipeline = build_graph()
