import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, ApiError } from '../lib/api';
import { saveSession } from '../lib/auth';

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('backend');
  const [experienceLevel, setExperienceLevel] = useState('junior');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signup({ email, password, name, role, experienceLevel });
      saveSession(res.accessToken, res.name);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-base font-bold text-white">
            CL
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">claude-lens 시작하기</h1>
          <p className="mt-2 text-sm text-gray-500">몇 가지 정보만 입력하면 바로 시작할 수 있어요</p>
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
            <input
              type="text"
              required
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none"
            >
              <option value="backend">Backend</option>
              <option value="frontend">Frontend</option>
              <option value="fullstack">Fullstack</option>
            </select>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none"
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-semibold text-gray-900 underline underline-offset-2">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
