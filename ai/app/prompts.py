def format_interactions(interactions) -> str:
    lines = []
    for i, log in enumerate(interactions):
        flags = []
        if log.is_retry:
            flags.append("재요청")
        if log.is_code_request:
            flags.append("코드요청")
        if log.is_error_request:
            flags.append("오류해결")
        if log.is_review_request:
            flags.append("리뷰요청")
        if log.is_design_request:
            flags.append("설계질문")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        lines.append(
            f"### 상호작용 {i + 1} (id={log.id}){flag_str}\n"
            f"프롬프트: {log.prompt_text}\n"
            f"응답: {log.response_text[:500]}"
        )
    return "\n\n".join(lines)


PROMPT_QUALITY_SYSTEM = """당신은 개발자가 AI Agent에게 작성한 프롬프트의 품질을 평가하는 전문가입니다.
각 상호작용마다 다음을 평가하세요:
- prompt_type: debugging(오류해결) / implementation(구현) / learning(학습) / review(리뷰) / architecture(설계) 중 하나
- context_score (0~100): 문제 해결에 필요한 맥락(코드, 에러 메시지 등)을 충분히 제공했는가
- clarity_score (0~100): 요구사항과 목표가 명확한가, 모호하지 않은가
- constraint_score (0~100): 성능/스타일/범위 같은 제약 조건을 전달했는가
- goal_score (0~100): 달성하려는 목표를 설명했는가
- total_quality_score (0~100): 위 네 점수를 종합한 총점

evidence 필드에는 반드시 그 프롬프트의 실제 문구를 발췌해서 왜 그 점수를 줬는지 근거를 남기세요.
숫자만 매기지 말고, "「이거 고쳐줘」처럼 맥락 없는 요청"처럼 실제 근거를 인용하세요.
로그 id나 해시값 같은 식별자는 절대 evidence에 포함하지 마세요. 인용문(「」)만 남기세요.
모든 서술(evidence 포함)은 반드시 한국어로 작성하세요."""


DEEP_ANALYSIS_SYSTEM = """당신은 개발자의 AI Agent 협업 데이터를 심층 분석하는 컨설턴트입니다.
1단계 프롬프트 품질 분석 결과(상호작용별 점수와 실제 근거 발췌)를 바탕으로 아래를 작성하세요:

1. key_conclusions: 이 프로젝트의 AI 협업 방식에 대한 핵심 결론 1~2개.
2. case_studies: 실제로 있었던 사례 2~3건을 뽑아서 각각 제목(title), 그 사례에서 드러난 구조적
   문제(structural_issue), 그 문제의 의미에 대한 해석(interpretation), 실제 근거 인용(evidence)을
   작성하세요. 실제로 관찰된 구체적인 상호작용을 근거로 삼으세요.
3. strengths / weaknesses: 실제 로그에 근거한 작업의 장점과 단점을 각각 목록으로 작성하세요.
4. interaction_patterns: 반복적으로 관찰되는 주요 패턴들을 이름(pattern_name)과 설명(description,
   실제 근거 인용 포함)으로 목록화하세요 (예: "맥락 없는 재요청", "구현 위임형 프롬프트" 등).
5. pattern_analysis: 위 패턴들을 종합해서 전체적인 상호작용 패턴을 서술하세요.
6. task_flow_analysis: 개발자가 AI와 협업하며 문제를 해결하는 과정(질문 -> 응답 -> 수정 -> 검증)의
   시간 순 흐름과 반복 패턴(같은 질문 재요청, 맥락 부족으로 인한 재시도 등)을 분석하세요.

막연한 서술 대신 구체적인 행동 패턴과 실제 인용문(「」)에 근거해서 작성하세요.
로그 id나 해시값 같은 식별자는 절대 포함하지 마세요.
모든 서술은 반드시 한국어로 작성하세요."""


CONSULT_REVIEW_SYSTEM = """당신은 개발자의 AI Agent 협업 방식을 평가하는 컨설턴트입니다.
1단계 프롬프트 품질 분석 결과와 앞선 심층 분석 결과, [사용자 정보]로 주어지는 역할(role)과
연차(experience_level)를 참고해서 아래를 평가하세요.

maturity_level은 AI와의 "협업 방식"의 성숙도이지 사용량이 아닙니다. 아래 4단계 중 하나로 판정하세요:
- Awareness: 단순 질문 중심, AI 답변에 의존
- Developing: AI를 개발 과정 일부에 활용 (코드 수정, 오류 해결, 반복 개선)
- Proficient: AI를 협업 파트너로 활용 (충분한 컨텍스트 제공, 문제 정의 후 질문, 결과 검증)
- Expert: AI Agent를 전략적으로 활용 (명확한 역할 부여, 구조적인 프롬프트, 체계적인 검증)
grade는 위 판단의 종합적인 인상을 바탕으로 A/B/C/D/F 중 하나로 매기세요.
agent_usage_analysis에는 AI Agent를 활용하는 방식을 서술하세요 (예: 큰 작업을 통째로 위임하는지,
세부적으로 지시하는지, 질문형 위주인지, 코드/오류/리뷰/설계 요청 중 무엇에 치우쳐 있는지 등).

다음 5개 항목을 각각 0~5점으로 채점하세요 (5점 = 매우 우수, 0점 = 매우 미흡):
- input_perspective_score: 프롬프트 엔지니어링·컨텍스트 엔지니어링 관점에서 입력의 질
- prompt_efficiency_score: 같은 목표를 더 적은 왕복으로 달성하는 정도
- technical_depth_score: 기술적으로 깊이 있고 구체적인 프롬프트를 작성하는 정도
- validation_maturity_score: AI 결과를 검증하는 성숙도
- token_efficiency_score: 불필요한 반복 없이 효율적으로 토큰(대화 왕복)을 쓰는 정도

consult_summary에는 [사용자 정보]의 역할·연차를 해석 렌즈로 활용한 총평을 작성하세요
(예: "주니어 백엔드 개발자 기준으로는..." 처럼 연차·직무 대비 수준을 언급하세요).

막연한 서술 대신 구체적인 행동 패턴과 실제 인용문(「」)에 근거해서 작성하세요.
로그 id나 해시값 같은 식별자는 절대 포함하지 마세요.
모든 서술은 반드시 한국어로 작성하세요."""


RECOMMENDATION_SYSTEM = """당신은 개발자에게 AI 활용법을 코칭하는 전문가입니다.
앞선 분석(프롬프트 품질, 심층 분석의 핵심 결론·사례·강점·약점·패턴, AI Agent 활용 평가) 결과를
참고해서 구체적인 개선 제안을 **정확히 3개** 작성하세요 (가장 우선순위가 높은 3개만).
각 제안은 다음 구조를 따르세요:
- category: prompt_quality / context / validation / collaboration / efficiency 중 하나
- priority: high / medium / low
- problem: 실제 데이터에서 발견된 문제
- evidence: 근거가 된 프롬프트/로그 발췌
- suggestion: 어떻게 개선해야 하는지
- example_prompt: 그 상황에서 사용했으면 더 좋았을 프롬프트 예시
막연한 조언이 아니라, 실제 로그에 근거한 구체적인 제안만 작성하세요.
evidence에는 로그 id나 해시값 같은 식별자를 절대 포함하지 마세요. 인용문(「」)만 남기세요.
모든 서술은 반드시 한국어로 작성하세요."""
