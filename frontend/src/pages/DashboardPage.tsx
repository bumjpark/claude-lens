import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProjects, createProject, ApiError, type Project } from '../lib/api';
import { clearSession, getName } from '../lib/auth';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('');
  const [framework, setFramework] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : '프로젝트 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const project = await createProject({
        name,
        language: language || undefined,
        framework: framework || undefined,
      });
      navigate(`/projects/${project.id}`, { state: { freshApiKey: project.apiKey } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '프로젝트 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  const activeCount = projects.filter((p) => !p.endedAt).length;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-8 py-14">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-medium text-white/60">claude-lens</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">{getName()}님, 안녕하세요</h1>
              <p className="mt-2 text-lg text-white/70">
                AI Agent 협업 데이터를 기반으로 프로젝트별 성숙도를 확인하세요.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              로그아웃
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-6 sm:max-w-xl">
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-sm text-white/60">전체 프로젝트</p>
              <p className="mt-2 text-4xl font-bold">{projects.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-sm text-white/60">진행 중</p>
              <p className="mt-2 text-4xl font-bold">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-12">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">내 프로젝트</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              + 새 프로젝트
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6"
          >
            <input
              type="text"
              required
              placeholder="프로젝트 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="언어 (선택, 예: Java)"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
              <input
                type="text"
                placeholder="프레임워크 (선택, 예: Spring Boot)"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {creating ? '생성 중...' : '생성'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <p className="text-lg font-medium text-gray-900">아직 프로젝트가 없습니다</p>
            <p className="mt-2 text-base text-gray-500">
              새 프로젝트를 만들고 CLI를 연결하면 Claude Code 협업 데이터를 분석할 수 있어요.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-7 transition hover:-translate-y-0.5 hover:border-gray-900"
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <span className="text-lg font-semibold text-gray-900">{p.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.endedAt ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.endedAt ? '종료' : '진행 중'}
                    </span>
                  </div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {p.language && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {p.language}
                      </span>
                    )}
                    {p.framework && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {p.framework}
                      </span>
                    )}
                    {!p.language && !p.framework && (
                      <span className="text-sm text-gray-400">언어/프레임워크 미지정</span>
                    )}
                  </div>
                  <p className="mt-auto text-sm text-gray-400">{formatDate(p.createdAt)} 생성</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
