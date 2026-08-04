import { loadTossPayments } from '@tosspayments/payment-sdk';
import { getName } from './auth';

// 비워두면 토스가 공식 문서에 공개해둔 테스트 클라이언트 키로 동작한다
// (회원가입 없이 결제 테스트 가능, 실제 승인은 가상).
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

export async function startReportPayment(
  projectId: string,
  order: { orderId: string; amount: number; orderName: string },
) {
  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
  await tossPayments.requestPayment('카드', {
    amount: order.amount,
    orderId: order.orderId,
    orderName: order.orderName,
    customerName: getName() ?? undefined,
    successUrl: `${window.location.origin}/payments/success?projectId=${projectId}`,
    failUrl: `${window.location.origin}/payments/fail?projectId=${projectId}`,
  });
}
