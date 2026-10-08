CREATE TABLE IF NOT EXISTS fundora_withdrawal_details (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES fundora_users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'paypal', 'mobile_money')),
  beneficiary_name TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT '',
  iban TEXT NOT NULL DEFAULT '',
  bic TEXT NOT NULL DEFAULT '',
  paypal_email TEXT NOT NULL DEFAULT '',
  mobile_money_provider TEXT NOT NULL DEFAULT '',
  mobile_money_phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fundora_withdrawal_details_user_idx
  ON fundora_withdrawal_details (user_id, created_at DESC);

INSERT INTO fundora_withdrawal_details (
  id, user_id, method, beneficiary_name, bank_name, iban, bic,
  paypal_email, mobile_money_provider, mobile_money_phone
)
SELECT
  md5(card.user_id::text || ':' || card.withdrawal_method || ':' || card.withdrawal_name)::uuid,
  card.user_id,
  card.withdrawal_method,
  card.withdrawal_name,
  card.bank_name,
  card.iban,
  card.bic,
  card.paypal_email,
  card.mobile_money_provider,
  card.mobile_money_phone
FROM fundora_virtual_cards AS card
WHERE card.withdrawal_name <> ''
  AND (
    (card.withdrawal_method = 'bank_transfer' AND card.bank_name <> '' AND card.iban <> '' AND card.bic <> '')
    OR (card.withdrawal_method = 'paypal' AND card.paypal_email <> '')
    OR (card.withdrawal_method = 'mobile_money' AND card.mobile_money_provider <> '' AND card.mobile_money_phone <> '')
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE fundora_card_withdrawals
  ADD COLUMN IF NOT EXISTS withdrawal_details_id UUID
  REFERENCES fundora_withdrawal_details(id) ON DELETE SET NULL;

UPDATE fundora_card_withdrawals AS withdrawal
SET withdrawal_details_id = detail.id
FROM fundora_withdrawal_details AS detail
WHERE withdrawal.withdrawal_details_id IS NULL
  AND withdrawal.user_id = detail.user_id
  AND withdrawal.withdrawal_method = detail.method
  AND withdrawal.beneficiary_name = detail.beneficiary_name
  AND withdrawal.bank_name = detail.bank_name
  AND withdrawal.iban = detail.iban
  AND withdrawal.bic = detail.bic
  AND withdrawal.paypal_email = detail.paypal_email
  AND withdrawal.mobile_money_provider = detail.mobile_money_provider
  AND withdrawal.mobile_money_phone = detail.mobile_money_phone;
