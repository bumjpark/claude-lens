import { useEffect, useState } from 'react';
import { ApiError, getEvaluation, runAnalysis, type Evaluation } from '../lib/api';

const SCORE_LABELS: Record<string, string> = {
  promptQualityScore: '프롬프트 품질',
  efficiencyScore: '효율성',
  contextUsageScore: '컨텍스트 활용',
  validationScore: '검증',
  collaborationScore: '협업',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium text-gray-900">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-gray-900"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

export default function EvaluationPanel({ projectId }: { projectId: string }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);

  useEffect(() => {
    getEvaluation(projectId)
      .then((data) => setEvaluation(data))
      .catch(() => setNeedsAnalysis(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await runAnalysis(projectId);
      setEvaluation(result);
      setNeedsAnalysis(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : '분석 실행에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return <p className="mt-8 text-sm text-gray-500">분석 결과를 불러오는 중...</p>;
  }

  if (needsAnalysis || !evaluation) {
    return (
      <div className="mt-8 rounded-md border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">AI 분석</h2>
        <p className="mb-3 text-sm text-gray-500">
          아직 분석 결과가 없습니다. CLI로 대화 기록을 업로드한 뒤 분석을 실행해보세요.
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {analyzing ? '분석 중... (최대 1~2분 소요)' : '분석 실행'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI 분석 결과</h2>
            <p className="text-xs text-gray-400">
              {new Date(evaluation.evaluatedAt).toLocaleString('ko-KR')} 분석
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
          >
            {analyzing ? '분석 중...' : '다시 분석'}
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-md bg-gray-900 px-3 py-1 text-lg font-semibold text-white">
            {evaluation.grade}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{evaluation.maturityLevel}</p>
            <p className="text-xs text-gray-500">종합 점수 {evaluation.totalScore}점</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ['promptQualityScore', evaluation.promptQualityScore],
              ['efficiencyScore', evaluation.efficiencyScore],
              ['contextUsageScore', evaluation.contextUsageScore],
              ['validationScore', evaluation.validationScore],
              ['collaborationScore', evaluation.collaborationScore],
            ] as const
          ).map(([key, score]) => (
            <ScoreBar key={key} label={SCORE_LABELS[key]} score={score} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">강점</h3>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-600">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">약점</h3>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-red-600">-</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">개선 제안</h3>
        <div className="flex flex-col gap-3">
          {evaluation.recommendations.map((r) => (
            <div key={r.id} className="rounded-md border border-gray-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[r.priority] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {PRIORITY_LABEL[r.priority] ?? r.priority}
                </span>
                <span className="text-xs text-gray-400">{r.category}</span>
              </div>
              <p className="mb-2 text-sm font-medium text-gray-900">{r.problem}</p>
              <p className="mb-2 border-l-2 border-gray-200 pl-2 text-xs text-gray-500">
                근거: {r.evidence}
              </p>
              <p className="mb-2 text-sm text-gray-600">{r.suggestion}</p>
              <div className="rounded-md bg-gray-100 p-2 text-xs text-gray-700">
                예시: {r.examplePrompt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
