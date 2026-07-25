import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProjects, createProject, ApiError, type Project } from '../lib/api';
import { clearSession, getName } from '../lib/auth';

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
      navigate(`/projects/${project.id}`);
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">내 프로젝트</h1>
          <p className="text-sm text-gray-500">{getName()}님, 안녕하세요</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          로그아웃
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {projects.length === 0 && (
            <li className="text-sm text-gray-500">아직 프로젝트가 없습니다.</li>
          )}
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className="block rounded-md border border-gray-200 px-4 py-3 text-sm hover:border-gray-400"
              >
                <span className="font-medium text-gray-900">{p.name}</span>
                {p.language && <span className="ml-2 text-gray-500">{p.language}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          + 새 프로젝트
        </button>
      ) : (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
          <input
            type="text"
            required
            placeholder="프로젝트 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <input
            type="text"
            placeholder="언어 (선택, 예: Java)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <input
            type="text"
            placeholder="프레임워크 (선택, 예: Spring Boot)"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? '생성 중...' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-2 text-sm text-gray-500"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
