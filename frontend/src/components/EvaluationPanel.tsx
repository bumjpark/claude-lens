import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Lock,
  RotateCcw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  ApiError,
  getAnalysisProgress,
  getEvaluation,
  preparePayment,
  runAnalysis,
  type AnalysisProgress,
  type ConsultCategory,
  type Evaluation,
} from '../lib/api';
import { startReportPayment } from '../lib/toss';
import SectionHeader from './SectionHeader';

const ANALYSIS_STEPS = [
  { stage: 1, label: '프롬프트 품질 분석' },
  { stage: 2, label: '심층 분석' },
  { stage: 3, label: 'AI 활용·컨설트 평가' },
  { stage: 4, label: '개선 제안 생성' },
];

function AnalysisStepper({ progress }: { progress: AnalysisProgress | null }) {
  const currentStage = progress?.stage ?? 0;
  const doneCount = progress?.done
    ? ANALYSIS_STEPS.length
    : ANALYSIS_STEPS.filter((s) => currentStage > s.stage).length;
  const percent = Math.round((doneCount / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="w-full rounded-3xl border border-gray-200 bg-gray-50 p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-700">분석 진행률</span>
        <span className="text-xl font-bold text-gray-900">{percent}%</span>
      </div>
      <div className="mb-6 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-black transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-start">
        {ANALYSIS_STEPS.map((step, idx) => {
          const isDone = currentStage > step.stage || Boolean(progress?.done);
          const isCurrent = currentStage === step.stage && !progress?.done;
          return (
            <Fragment key={step.stage}>
              <div className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold transition-all duration-300 ${
                    isDone
                      ? 'border-black bg-black text-white'
                      : isCurrent
                        ? 'border-black bg-white text-black ring-4 ring-gray-200'
                        : 'border-gray-200 bg-white text-gray-300'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    step.stage
                  )}
                </div>
                <span
                  className={`text-sm leading-tight font-medium ${
                    isCurrent ? 'text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < ANALYSIS_STEPS.length - 1 && (
                <div
                  className={`mt-[22px] h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                    isDone ? 'bg-black' : 'bg-gray-200'
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export const EVALUATION_SECTIONS = [
  { id: 'section-1', title: '개발 활동 요약' },
  { id: 'section-2', title: '핵심 결론' },
  { id: 'section-3', title: '주요 작업 분석' },
  { id: 'section-4', title: '작업의 장점과 단점' },
  { id: 'section-5', title: 'AI 상호작용 패턴 분석' },
  { id: 'section-6', title: 'AI Agent 활용 평가' },
  { id: 'section-7', title: 'AI 컨설트 총평' },
];

const PRIORITY_LABEL: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-gray-900 text-white',
  medium: 'bg-gray-200 text-gray-700',
  low: 'bg-gray-100 text-gray-500',
};

function AnalysisBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-lg leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  caption,
  tinted,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  caption: string;
  tinted?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        tinted ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg ${iconClass}`}>{icon}</div>
      <p className="text-lg text-gray-500">{label}</p>
      <p className="mt-1 text-4xl font-bold text-gray-900">{value}</p>
      <p className="mt-1.5 text-base text-gray-400">{caption}</p>
    </div>
  );
}

// 값 하나를 전체 분포 안에서 보여주는 단일 지표라 범례 없이 막대 하나로 충분하다.
// 비교 대상이 너무 적을 땐(현재 5명 미만) 왜곡된 숫자 대신 안내 문구로 대체한다.
function PeerPercentileBar({ percentile, peerCount }: { percentile: number | null; peerCount: number }) {
  if (percentile === null) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900">또래 비교</h3>
        <p className="mt-1 text-base text-gray-500">
          아직 비교할 사용자가 충분하지 않아요 (현재 {peerCount}명). 더 많은 분석이 쌓이면 표시됩니다.
        </p>
      </div>
    );
  }

  const outperform = Math.min(100, Math.max(0, 100 - percentile));

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-lg font-bold text-gray-900">또래 비교</h3>
        <span className="text-3xl font-bold text-gray-900">상위 {percentile}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-3 rounded-full bg-black" style={{ width: `${outperform}%` }} />
      </div>
      <p className="mt-2 text-sm text-gray-400">
        전체 {peerCount}명 중 {outperform}%보다 높은 컨설트 점수예요
      </p>
    </div>
  );
}

const CONSULT_CATEGORY_META: Record<
  string,
  { index: number; label: string; title: string; subtitle: string; badgeColor: string }
> = {
  input_perspective: {
    index: 1,
    label: '입력(Input) 관점',
    title: '7.1 입력(Input) 관점',
    subtitle: 'Context & Prompt Engineering',
    badgeColor: 'bg-black',
  },
  prompt_efficiency: {
    index: 2,
    label: '프롬프트 효율성',
    title: '7.2 프롬프트 효율성',
    subtitle: 'Prompt Count & Process Efficiency',
    badgeColor: 'bg-black',
  },
  technical_depth: {
    index: 3,
    label: '기술적 프롬프트 깊이',
    title: '7.3 기술적 프롬프트 깊이',
    subtitle: 'Technical Prompt Depth',
    badgeColor: 'bg-black',
  },
  validation_maturity: {
    index: 4,
    label: '검증 성숙도',
    title: '7.4 검증 체계',
    subtitle: 'Validation & Quality Assurance',
    badgeColor: 'bg-black',
  },
  token_efficiency: {
    index: 5,
    label: '토큰 활용 효율',
    title: '7.5 토큰 활용 효율',
    subtitle: 'Token Utilization Efficiency',
    badgeColor: 'bg-black',
  },
};

function ConsultCategoryCard({ item, fullWidth }: { item: ConsultCategory; fullWidth?: boolean }) {
  const meta = CONSULT_CATEGORY_META[item.category];
  if (!meta) return null;
  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white p-6 ${fullWidth ? 'sm:col-span-2' : ''}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white ${meta.badgeColor}`}
        >
          {meta.index}
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{meta.title}</h3>
          <p className="text-sm text-gray-400">{meta.subtitle}</p>
        </div>
      </div>
      <div className="mb-4 rounded-xl bg-gray-50 p-4">
        <div className="mb-1.5 flex items-center justify-between text-base">
          <span className="text-gray-600">{meta.label}</span>
          <span className="font-semibold text-gray-900">{item.score} / 5</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-black"
            style={{ width: `${(item.score / 5) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 text-base">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <span className="text-gray-700">{item.positiveNote}</span>
        </div>
        <div className="flex items-start gap-2">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <span className="text-gray-700">{item.improvementNote}</span>
        </div>
      </div>
    </div>
  );
}

// 결제 전엔 서버가 실제 데이터를 안 내려주므로, 블러 처리할 내용도 실제 텍스트가 아니라
// 레이아웃만 흉내 낸 스켈레톤이다 (DOM을 그대로 봐도 원문이 없어야 진짜 페이월이 된다).
function PaywallPlaceholder() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="mb-4 text-xl font-semibold text-gray-900">주요 작업 분석 · 장단점 · 상호작용 패턴</h3>
        <div className="grid grid-cols-1 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
              <div className="mb-2 h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-5/6 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-4 text-xl font-semibold text-gray-900">AI Agent 활용 평가 · 컨설트 총평</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="mb-3 h-5 w-1/2 rounded bg-gray-200" />
              <div className="h-2 w-full rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportPaywall({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const order = await preparePayment(projectId);
      await startReportPayment(projectId, order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '결제를 시작하지 못했습니다');
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none blur-md select-none">
        <PaywallPlaceholder />
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-10">
        <div className="mx-4 w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">전체 리포트 잠금 해제</h3>
          <p className="mt-2 text-base text-gray-500">
            주요 작업 사례, 장단점, AI Agent 활용 등급, 5개 항목 컨설트 총평까지 전부 확인하세요.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            onClick={handlePay}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-black px-6 py-3 text-base font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? '결제 준비 중...' : '1,500원 결제하고 전체 보기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSeconds(ms: number | null, approx: boolean) {
  if (ms == null) return '-';
  const seconds = Math.round(ms / 1000);
  return approx ? `약 ${seconds}초` : `${seconds}초`;
}

export default function EvaluationPanel({
  projectId,
  onSectionsReady,
}: {
  projectId: string;
  onSectionsReady?: (sections: { id: string; title: string }[]) => void;
}) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getEvaluation(projectId)
      .then((data) => setEvaluation(data))
      .catch(() => setNeedsAnalysis(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (evaluation) onSectionsReady?.(EVALUATION_SECTIONS);
  }, [evaluation, onSectionsReady]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    setProgress(null);
    pollRef.current = setInterval(() => {
      getAnalysisProgress(projectId).then(setProgress).catch(() => {});
    }, 1000);
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
      if (pollRef.current) clearInterval(pollRef.current);
      setAnalyzing(false);
      setProgress(null);
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (loading) {
    return <p className="mt-8 text-base text-gray-500">분석 결과를 불러오는 중...</p>;
  }

  if (needsAnalysis || !evaluation) {
    return (
      <div className="mt-8 rounded-3xl border border-gray-200 p-6">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">AI 분석</h2>
        <p className="mb-3 text-lg text-gray-500">
          아직 분석 결과가 없습니다. CLI로 대화 기록을 업로드한 뒤 분석을 실행해보세요.
        </p>
        {error && <p className="mb-3 text-lg text-red-600">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="rounded-full bg-black px-5 py-2.5 text-lg font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {analyzing ? '분석 중... (최대 1~2분 소요)' : '분석 실행'}
        </button>
        {analyzing && (
          <div className="mt-4 max-w-xl">
            <AnalysisStepper progress={progress} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="shrink-0 rounded-full border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {analyzing ? '분석 중...' : '다시 분석'}
          </button>
        </div>
        {analyzing && <AnalysisStepper progress={progress} />}
      </div>
      {error && <p className="text-lg text-red-600">{error}</p>}

      <section>
        <SectionHeader id="section-1" index={1} title="개발 활동 요약" subtitle="Quantitative Overview" />
        <h3 className="mb-4 text-xl font-semibold text-gray-900">데이터 스냅샷 (정량)</h3>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            tinted
            icon={<Activity className="h-6 w-6 text-purple-600" />}
            iconClass="bg-purple-100"
            label="AI INTERACTION"
            value={`${evaluation.interactionCount}건`}
            caption="AI와의 전체 상호작용"
          />
          <StatCard
            icon={<Clock className="h-6 w-6 text-orange-500" />}
            iconClass="bg-orange-100"
            label="평균 요청 소요"
            value={formatSeconds(evaluation.avgResponseTimeMs, true)}
            caption="요청당 평균 응답 시간"
          />
          <StatCard
            icon={<Zap className="h-6 w-6 text-emerald-600" />}
            iconClass="bg-emerald-100"
            label="중앙값"
            value={formatSeconds(evaluation.medianResponseTimeMs, false)}
            caption="요청당 중앙값 응답 시간"
          />
          <StatCard
            icon={<RotateCcw className="h-6 w-6 text-red-500" />}
            iconClass="bg-red-100"
            label="재요청 손실 시간"
            value={
              evaluation.estimatedWastedMinutes != null ? `약 ${evaluation.estimatedWastedMinutes}분` : '-'
            }
            caption={`재요청 ${evaluation.retryCount ?? 0}건 기준 추정`}
          />
        </div>
        <div className="mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-6">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-900" />
            <h3 className="text-xl font-bold text-gray-900">해석 (요약)</h3>
          </div>
          <p className="text-lg leading-relaxed text-gray-700">{evaluation.activitySummary}</p>
        </div>
        <PeerPercentileBar percentile={evaluation.peerPercentile} peerCount={evaluation.peerCount} />
      </section>

      <section>
        <SectionHeader id="section-2" index={2} title="핵심 결론" subtitle="Key Conclusions" />
        <div className="mb-6 flex flex-col gap-3">
          {evaluation.keyConclusions.map((c, i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-200 bg-gray-50 p-6"
            >
              <p className="text-lg leading-relaxed font-medium text-gray-800">{c}</p>
            </div>
          ))}
        </div>
        <h3 className="mb-3 text-xl font-semibold text-gray-900">개선 우선순위 Top 3</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {evaluation.recommendations.map((r, i) => (
            <div key={r.id} className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-xl font-semibold text-gray-900">{r.problem}</p>
                <span
                  className={`ml-auto shrink-0 rounded px-3 py-1 text-base font-medium ${PRIORITY_STYLE[r.priority] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {PRIORITY_LABEL[r.priority] ?? r.priority}
                </span>
              </div>
              <p className="mb-2 text-base text-gray-400">{r.category}</p>
              <p className="mb-3 border-l-2 border-gray-200 pl-3 text-base italic text-gray-500">
                「{r.evidence}」
              </p>
              <p className="mb-3 text-lg text-gray-600">{r.suggestion}</p>
              <div className="rounded-md bg-gray-50 p-4 text-base text-gray-700">
                예시: {r.examplePrompt}
              </div>
            </div>
          ))}
        </div>
      </section>

      {!evaluation.paid && (
        <div id="section-3">
          <ReportPaywall projectId={projectId} />
        </div>
      )}
      {evaluation.paid && (
      <>
      <section>
        <SectionHeader id="section-3" index={3} title="주요 작업 분석" subtitle="Case Studies" />
        <div className="grid grid-cols-1 gap-4">
          {evaluation.caseStudies.map((c, i) => (
            <div key={i} className="rounded-3xl border border-gray-200 bg-white p-6">
              <h3 className="mb-3 text-xl font-semibold text-gray-900">{c.title}</h3>
              <p className="mb-2 text-base text-gray-500">
                <span className="font-medium text-gray-700">구조적 문제:</span> {c.structuralIssue}
              </p>
              <p className="mb-3 text-lg text-gray-600">{c.interpretation}</p>
              <p className="border-l-2 border-gray-200 pl-3 text-base italic text-gray-500">「{c.evidence}」</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader id="section-4" index={4} title="작업의 장점과 단점" subtitle="Strengths & Weaknesses" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-3 text-xl font-bold text-gray-900">강점</h3>
            <ul className="flex flex-col gap-2 text-lg text-gray-700">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gray-900">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 text-xl font-bold text-gray-900">단점</h3>
            <ul className="flex flex-col gap-2 text-lg text-gray-700">
              {evaluation.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gray-400">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader id="section-5" index={5} title="AI 상호작용 패턴 분석" subtitle="Interaction Patterns" />
        <div className="mb-4 flex flex-col gap-3">
          {evaluation.interactionPatterns.map((p, i) => (
            <div key={i} className="flex gap-3 rounded-3xl border border-gray-200 bg-white p-5">
              <Layers className="mt-0.5 h-5 w-5 shrink-0 text-gray-900" />
              <div>
                <p className="font-semibold text-gray-900">{p.patternName}</p>
                <p className="text-base text-gray-600">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
        <AnalysisBlock title="종합 패턴 분석" text={evaluation.patternAnalysis} />
      </section>

      <section>
        <SectionHeader id="section-6" index={6} title="AI Agent 활용 평가" subtitle="Agent Usage Evaluation" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="flex flex-col justify-center gap-3 rounded-3xl bg-black p-8 text-white">
            <span className="w-fit rounded-md bg-white/20 px-4 py-1.5 text-4xl font-bold">
              {evaluation.grade}
            </span>
            <p className="text-2xl font-semibold">{evaluation.maturityLevel}</p>
            <p className="text-base text-white/80">
              {new Date(evaluation.evaluatedAt).toLocaleDateString('ko-KR')} 분석
            </p>
          </div>
          <AnalysisBlock title="AI Agent 활용 방식" text={evaluation.agentUsageAnalysis} />
        </div>
      </section>

      <section>
        <SectionHeader id="section-7" index={7} title="AI 컨설트 총평" subtitle="Consultant Review" />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {evaluation.consultCategories.map((c) => (
            <ConsultCategoryCard
              key={c.category}
              item={c}
              fullWidth={c.category === 'token_efficiency'}
            />
          ))}
        </div>
        <div className="mb-4 flex flex-col justify-center gap-3 rounded-3xl bg-black p-8 text-white">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6" />
            <span className="text-base text-white/80">종합 점수 {evaluation.consultTotalScore} / 25</span>
          </div>
          <span className="w-fit rounded-md bg-white/20 px-4 py-1.5 text-2xl font-bold">
            {evaluation.consultLevel}
          </span>
        </div>
        <AnalysisBlock title="총평" text={evaluation.consultSummary} />
      </section>
      </>
      )}
    </div>
  );
}
