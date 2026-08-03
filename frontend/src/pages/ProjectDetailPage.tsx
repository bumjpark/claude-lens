import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProject, regenerateApiKey, ApiError, type Project } from '../lib/api';
import { getName } from '../lib/auth';
import EvaluationPanel from '../components/EvaluationPanel';
import SectionHeader from '../components/SectionHeader';
import ReportNav, { type ReportSection } from '../components/ReportNav';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(
    (location.state as { freshApiKey?: string } | null)?.freshApiKey ?? null,
  );
  const [regenerating, setRegenerating] = useState(false);
  const [evalSections, setEvalSections] = useState<ReportSection[]>([]);
  const sections = useMemo<ReportSection[]>(
    () => [{ id: 'section-0', title: '평가 개요' }, ...evalSections],
    [evalSections],
  );

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then(setProject)
      .catch((err) => setError(err instanceof ApiError ? err.message : '프로젝트를 불러오지 못했습니다'));
  }, [projectId]);

  async function handleRegenerate() {
    if (!project) return;
    const ok = window.confirm(
      '재발급하면 기존 API Key는 즉시 무효화됩니다. 이미 연결된 CLI는 다시 설정해야 합니다. 계속할까요?',
    );
    if (!ok) return;
    setRegenerating(true);
    try {
      const updated = await regenerateApiKey(project.id);
      setProject(updated);
      setRevealedKey(updated.apiKey);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'API Key 재발급에 실패했습니다');
    } finally {
      setRegenerating(false);
    }
  }

  if (error) {
    return (
      <div className="w-full px-10 py-10">
        <p className="text-base text-red-600">{error}</p>
        <Link to="/dashboard" className="text-base text-gray-500 underline">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="w-full px-10 py-10 text-base text-gray-500">불러오는 중...</div>;
  }

  const command = `npx claude-lens-cli init --project-id ${project.id} --api-key ${revealedKey ?? project.apiKey}`;

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(command);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = command;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('클립보드 복사에 실패했습니다. 직접 선택해서 복사해주세요.');
    }
  }

  return (
    <div className="w-full px-10 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-lg font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        대시보드
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-gray-900">{project.name}</h1>
      <p className="text-lg text-gray-500">
        {project.language ?? '언어 미지정'} · {project.framework ?? '프레임워크 미지정'}
      </p>

      <div className="mt-8 flex gap-8">
        <ReportNav sections={sections} />
        <div className="min-w-0 flex-1">
          <SectionHeader id="section-0" index={0} title="평가 개요" subtitle="Executive Summary" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-xl font-semibold text-gray-900">분석 대상</h3>
              <ul className="flex flex-col gap-2 text-lg text-gray-600">
                <li>
                  <span className="font-medium text-gray-900">프로젝트:</span> {project.name}
                </li>
                <li>
                  <span className="font-medium text-gray-900">사용자:</span> {getName() ?? '-'}
                </li>
                <li>
                  <span className="font-medium text-gray-900">언어:</span>{' '}
                  {project.language ?? '미지정'}
                </li>
                <li>
                  <span className="font-medium text-gray-900">프레임워크:</span>{' '}
                  {project.framework ?? '미지정'}
                </li>
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">평가 목적</h3>
              <p className="text-lg leading-relaxed text-white/90">
                이 리포트는 Claude Code와 협업한 프롬프트 행동 데이터를 기반으로, AI를 어떤 방식으로
                활용하고 있는지와 그 활용 방식이 개발 생산성·품질에 미치는 영향을 분석해 개선 방향을
                제시합니다.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-md border border-gray-200 p-6">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">이 프로젝트에 CLI 연결하기</h2>

            {revealedKey ? (
              <>
                <p className="mb-3 text-lg text-gray-500">
                  아래 명령어를 프로젝트 루트에서 실행하면 이 프로젝트의 Claude Code 대화 기록을 자동으로 수집합니다.
                </p>
                <div className="flex items-start gap-2 rounded-md bg-gray-100 p-3">
                  <code className="flex-1 whitespace-pre-wrap break-all text-base text-gray-800">{command}</code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-base font-medium text-white"
                  >
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
                <p className="mt-3 text-base font-medium text-red-600">
                  이 API Key는 지금만 표시됩니다. 다시 볼 수 없으니 지금 복사해서 저장하세요.
                </p>
                <p className="mt-1 text-base text-gray-400">
                  이후 <code className="rounded bg-gray-100 px-1 py-0.5">claude-lens sync</code>를 실행하면 대화 기록이
                  업로드됩니다.
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 text-lg text-gray-500">
                  API Key는 최초 생성 시에만 전체가 표시됩니다. 이미 CLI에 설정해두셨다면 그대로 사용하시고,
                  분실하셨다면 재발급하세요 (재발급 시 기존 키는 즉시 무효화됩니다).
                </p>
                <div className="flex items-center justify-between rounded-md bg-gray-100 p-3">
                  <code className="text-base text-gray-500">{project.apiKey}</code>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-base font-medium text-gray-700 disabled:opacity-50"
                  >
                    {regenerating ? '재발급 중...' : '재발급'}
                  </button>
                </div>
              </>
            )}
          </div>

          <EvaluationPanel projectId={project.id} onSectionsReady={setEvalSections} />
        </div>
      </div>
    </div>
  );
}
