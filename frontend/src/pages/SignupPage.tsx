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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold text-gray-900">claude-lens 회원가입</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        <input
          type="text"
          required
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="backend">Backend</option>
          <option value="frontend">Frontend</option>
          <option value="fullstack">Fullstack</option>
        </select>
        <select
          value={experienceLevel}
          onChange={(e) => setExperienceLevel(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
      <p className="text-sm text-gray-500">
        이미 계정이 있으신가요? <Link to="/login" className="text-gray-900 underline">로그인</Link>
      </p>
    </div>
  );
}
