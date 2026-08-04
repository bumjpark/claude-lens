import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPayment, ApiError } from '../lib/api';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    const orderId = searchParams.get('orderId');
    const paymentKey = searchParams.get('paymentKey');
    const amount = searchParams.get('amount');

    if (!projectId || !orderId || !paymentKey || !amount) {
      setError('결제 정보가 올바르지 않습니다.');
      return;
    }

    confirmPayment(projectId, { orderId, paymentKey, amount: Number(amount) })
      .then(() => navigate(`/projects/${projectId}`, { replace: true }))
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : '승인 처리 중 문제가 발생했습니다. 결제 자체는 완료됐을 수 있으니, 프로젝트 페이지에서 열람 가능 여부를 다시 확인해주세요.',
        ),
      );
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">확인이 필요해요</h1>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <Link to="/dashboard" className="mt-6 inline-block text-sm font-semibold text-gray-900 underline">
              대시보드로 돌아가기
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">결제 승인 중...</h1>
            <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요.</p>
          </>
        )}
      </div>
    </div>
  );
}
