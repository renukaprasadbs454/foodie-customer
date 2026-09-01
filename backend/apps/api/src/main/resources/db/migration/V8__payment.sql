-- Module 7: Payment
-- Owns: payment, refund_request (Phase3 §3.6)
-- Never soft-deleted. Wallet tables intentionally omitted (out of Module 7 scope).

CREATE TABLE payment (
    id                   UUID PRIMARY KEY,
    order_id             UUID NOT NULL UNIQUE REFERENCES "order"(id),
    razorpay_order_id    VARCHAR(100) NOT NULL,
    razorpay_payment_id  VARCHAR(100),
    amount               DECIMAL(10,2) NOT NULL,
    status               VARCHAR(20) NOT NULL,
    idempotency_key      VARCHAR(100) NOT NULL UNIQUE,
    captured_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_payment_status CHECK (status IN ('PENDING', 'CAPTURED', 'FAILED', 'REFUNDED')),
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

CREATE TABLE refund_request (
    id                  UUID PRIMARY KEY,
    payment_id          UUID NOT NULL REFERENCES payment(id),
    amount              DECIMAL(10,2) NOT NULL,
    reason              VARCHAR(500) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    razorpay_refund_id  VARCHAR(100),
    initiated_by        UUID NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_refund_amount CHECK (amount > 0),
    CONSTRAINT chk_refund_status CHECK (status IN ('INITIATED', 'PROCESSED', 'FAILED'))
);

CREATE INDEX idx_payment_order ON payment(order_id);
CREATE INDEX idx_payment_razorpay_order ON payment(razorpay_order_id);
CREATE INDEX idx_refund_request_payment ON refund_request(payment_id);
CREATE INDEX idx_refund_razorpay_refund ON refund_request(razorpay_refund_id);
