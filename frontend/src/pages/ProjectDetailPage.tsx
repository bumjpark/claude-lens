import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, ApiError, type Project } from '../lib/api';
import EvaluationPanel from '../components/EvaluationPanel';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then(setProject)
      .catch((err) => setError(err instanceof ApiError ? err.message : '프로젝트를 불러오지 못했습니다'));
  }, [projectId]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/dashboard" className="text-sm text-gray-500 underline">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-gray-500">불러오는 중...</div>;
  }

  const command = `npx claude-lens init --project-id ${project.id} --api-key ${project.apiKey}`;

  function handleCopy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-gray-500 underline">
        ← 대시보드
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{project.name}</h1>
      <p className="text-sm text-gray-500">
        {project.language ?? '언어 미지정'} · {project.framework ?? '프레임워크 미지정'}
      </p>

      <div className="mt-8 rounded-md border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">이 프로젝트에 CLI 연결하기</h2>
        <p className="mb-3 text-sm text-gray-500">
          아래 명령어를 프로젝트 루트에서 실행하면 이 프로젝트의 Claude Code 대화 기록을 자동으로 수집합니다.
        </p>
        <div className="flex items-start gap-2 rounded-md bg-gray-100 p-3">
          <code className="flex-1 whitespace-pre-wrap break-all text-xs text-gray-800">{command}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white"
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          이후 <code className="rounded bg-gray-100 px-1 py-0.5">claude-lens sync</code>를 실행하면 대화 기록이
          업로드됩니다. 이 API Key는 이 프로젝트 전용이니 외부에 공유하지 마세요.
        </p>
      </div>

      <EvaluationPanel projectId={project.id} />
    </div>
  );
}
