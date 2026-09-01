-- Module 9: Wallet
-- Owns: wallet_account, ledger_entry, payout (Phase3 §3.6)
-- ledger_entry is APPEND-ONLY — never updated, never deleted, never soft-deleted.
-- wallet_account.balance is a cached/derived field; ledger_entry is the source of truth.
-- Bank settlement / UPI payout execution is out of Module 9 scope (payout stays REQUESTED).

CREATE TABLE wallet_account (
    id          UUID PRIMARY KEY,
    owner_type  VARCHAR(20) NOT NULL,
    owner_id    UUID NOT NULL,
    balance     DECIMAL(10,2) NOT NULL DEFAULT 0,
    version     BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_wallet_owner UNIQUE (owner_type, owner_id),
    CONSTRAINT chk_wallet_owner_type CHECK (owner_type IN ('DELIVERY_PARTNER', 'PLATFORM')),
    CONSTRAINT chk_wallet_balance CHECK (balance >= 0)
);

CREATE TABLE ledger_entry (
    id                  UUID PRIMARY KEY,
    wallet_account_id   UUID NOT NULL REFERENCES wallet_account(id),
    entry_type          VARCHAR(10) NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    reference_type      VARCHAR(30) NOT NULL,
    reference_id        UUID NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ledger_entry_type CHECK (entry_type IN ('CREDIT', 'DEBIT')),
    CONSTRAINT chk_ledger_amount CHECK (amount > 0),
    CONSTRAINT uq_ledger_reference UNIQUE (reference_type, reference_id)
);

CREATE TABLE payout (
    id                  UUID PRIMARY KEY,
    wallet_account_id   UUID NOT NULL REFERENCES wallet_account(id),
    amount              DECIMAL(10,2) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    bank_ref            VARCHAR(100),
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_payout_amount CHECK (amount > 0),
    CONSTRAINT chk_payout_status CHECK (status IN ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idx_ledger_wallet ON ledger_entry(wallet_account_id);
CREATE INDEX idx_ledger_reference ON ledger_entry(reference_type, reference_id);
CREATE INDEX idx_payout_wallet ON payout(wallet_account_id);
CREATE INDEX idx_payout_status ON payout(status);
