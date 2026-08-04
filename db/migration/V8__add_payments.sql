-- PAYMENT (리포트 전체 열람 결제 — 토스페이먼츠)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id VARCHAR(100) NOT NULL UNIQUE,
    amount INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    toss_payment_key VARCHAR(200),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_project_id ON payments(project_id);
