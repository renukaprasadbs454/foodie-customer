-- Module 10: Notification
-- Owns: notification_template, notification_log (Phase3 §3.8)
-- title/body denormalized on log so history survives template edits (API 10.1).
-- PUSH is V1 primary channel; SMS channel reserved on template CHECK.

CREATE TABLE notification_template (
    id              UUID PRIMARY KEY,
    event_type      VARCHAR(50) NOT NULL,
    channel         VARCHAR(10) NOT NULL,
    title_template  VARCHAR(255) NOT NULL,
    body_template   VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_notification_template_event_channel UNIQUE (event_type, channel),
    CONSTRAINT chk_notification_channel CHECK (channel IN ('PUSH', 'SMS'))
);

CREATE TABLE notification_log (
    id                  UUID PRIMARY KEY,
    user_credential_id  UUID NOT NULL REFERENCES user_credential(id),
    template_id         UUID NOT NULL REFERENCES notification_template(id),
    title               VARCHAR(255) NOT NULL,
    body                VARCHAR(500) NOT NULL,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivery_status     VARCHAR(20) NOT NULL,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_notification_delivery_status
        CHECK (delivery_status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED'))
);

CREATE INDEX idx_notification_log_user ON notification_log(user_credential_id);
CREATE INDEX idx_notification_log_user_unread
    ON notification_log(user_credential_id) WHERE read_at IS NULL;
CREATE INDEX idx_notification_template_event ON notification_template(event_type);

-- Seed V1 PUSH templates ({{placeholders}} rendered at send time)
INSERT INTO notification_template (id, event_type, channel, title_template, body_template, created_at, updated_at) VALUES
    ('a1000000-0000-4000-8000-000000000001', 'ORDER_PLACED', 'PUSH',
     'New order received', 'Order {{orderNumber}} is waiting for your confirmation.', now(), now()),
    ('a1000000-0000-4000-8000-000000000002', 'ORDER_CONFIRMED', 'PUSH',
     'Order confirmed', 'Your order {{orderNumber}} has been confirmed by the restaurant.', now(), now()),
    ('a1000000-0000-4000-8000-000000000003', 'ORDER_STATUS_CHANGED', 'PUSH',
     'Order update', 'Order {{orderNumber}} is now {{toStatus}}.', now(), now()),
    ('a1000000-0000-4000-8000-000000000004', 'ORDER_CANCELLED', 'PUSH',
     'Order cancelled', 'Order {{orderNumber}} was cancelled.', now(), now()),
    ('a1000000-0000-4000-8000-000000000005', 'ORDER_DELIVERED', 'PUSH',
     'Order delivered', 'Order {{orderNumber}} has been delivered. Enjoy your meal!', now(), now()),
    ('a1000000-0000-4000-8000-000000000006', 'PAYMENT_FAILED', 'PUSH',
     'Payment failed', 'Payment for order {{orderNumber}} failed. You can retry checkout.', now(), now()),
    ('a1000000-0000-4000-8000-000000000007', 'REFUND_PROCESSED', 'PUSH',
     'Refund processed', 'Your refund of {{amount}} has been processed.', now(), now()),
    ('a1000000-0000-4000-8000-000000000008', 'DELIVERY_PARTNER_ASSIGNED', 'PUSH',
     'Delivery partner assigned', 'A delivery partner is on the way for order {{orderNumber}}.', now(), now()),
    ('a1000000-0000-4000-8000-000000000009', 'DELIVERY_OFFER', 'PUSH',
     'Delivery assignment', 'You are assigned to deliver order {{orderNumber}}.', now(), now()),
    ('a1000000-0000-4000-8000-00000000000a', 'RESTAURANT_CREATED', 'PUSH',
     'Restaurant submitted', 'Your restaurant {{restaurantName}} is pending approval.', now(), now()),
    ('a1000000-0000-4000-8000-00000000000b', 'RESTAURANT_APPROVED', 'PUSH',
     'Restaurant approved', 'Your restaurant {{restaurantName}} has been approved.', now(), now()),
    ('a1000000-0000-4000-8000-00000000000c', 'RESTAURANT_SUSPENDED', 'PUSH',
     'Restaurant suspended', 'Your restaurant has been suspended. Reason: {{reason}}', now(), now()),
    ('a1000000-0000-4000-8000-00000000000d', 'PAYOUT_REQUESTED', 'PUSH',
     'Payout requested', 'Your payout request of {{amount}} is being processed.', now(), now());
