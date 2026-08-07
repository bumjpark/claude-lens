import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, ApiError } from '../lib/api';
import { saveSession } from '../lib/auth';
import UsageGuide from '../components/UsageGuide';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      saveSession(res.accessToken, res.name);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4 py-16">
      <div className="flex w-full max-w-4xl flex-col items-center gap-14 lg:flex-row lg:items-start lg:justify-between lg:gap-20">
        <div className="hidden lg:block lg:pt-2">
          <UsageGuide />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-base font-bold text-white">
              CL
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">claude-lens</h1>
            <p className="mt-2 text-sm text-gray-500">AI 협업 성숙도를 측정하는 근거 기반 리포트</p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                required
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
              <input
                type="password"
                required
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-semibold text-gray-900 underline underline-offset-2">
              회원가입
            </Link>
          </p>

          <div className="mt-10 lg:hidden">
            <UsageGuide />
          </div>
        </div>
      </div>
    </div>
  );
}
