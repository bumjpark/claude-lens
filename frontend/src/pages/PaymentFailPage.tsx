import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const message = searchParams.get('message');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">결제가 취소되었습니다</h1>
        <p className="mt-2 text-sm text-gray-500">{message ?? '결제가 완료되지 않았습니다.'}</p>
        <Link
          to={projectId ? `/projects/${projectId}` : '/dashboard'}
          className="mt-6 inline-block text-sm font-semibold text-gray-900 underline"
        >
          돌아가기
        </Link>
      </div>
    </div>
  );
}
