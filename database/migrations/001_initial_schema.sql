CREATE TABLE IF NOT EXISTS fundora_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('admin', 'applicant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS fundora_users_email_lower_idx
  ON fundora_users (LOWER(email));

CREATE TABLE IF NOT EXISTS fundora_applications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES fundora_users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('donation', 'loan')),
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  amount_requested NUMERIC(12, 2) NOT NULL CHECK (amount_requested >= 0),
  amount_approved NUMERIC(12, 2) CHECK (amount_approved IS NULL OR amount_approved >= 0),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fundora_applications_status_created_idx
  ON fundora_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS fundora_applications_email_idx
  ON fundora_applications (LOWER(email));

CREATE TABLE IF NOT EXISTS fundora_application_documents (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES fundora_applications(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  storage_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_correction')),
  review_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fundora_documents_application_idx
  ON fundora_application_documents (application_id, created_at);

ALTER TABLE fundora_application_documents
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'application/octet-stream';

CREATE TABLE IF NOT EXISTS fundora_application_tasks (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES fundora_applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  fee_currency CHAR(3) NOT NULL DEFAULT 'EUR',
  fee_status TEXT NOT NULL DEFAULT 'pending' CHECK (fee_status IN ('pending', 'paid', 'waived')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'submitted', 'approved', 'needs_correction')),
  published_file_name TEXT,
  published_storage_key TEXT,
  review_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fundora_tasks_application_idx
  ON fundora_application_tasks (application_id, created_at);

ALTER TABLE fundora_application_tasks
  ADD COLUMN IF NOT EXISTS published_file_data BYTEA,
  ADD COLUMN IF NOT EXISTS published_content_type TEXT NOT NULL DEFAULT 'application/octet-stream';

CREATE TABLE IF NOT EXISTS fundora_task_submissions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES fundora_application_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  storage_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'needs_correction')),
  review_note TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fundora_task_submissions_task_idx
  ON fundora_task_submissions (task_id, submitted_at DESC);

ALTER TABLE fundora_task_submissions
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'application/octet-stream';

CREATE TABLE IF NOT EXISTS fundora_virtual_cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES fundora_users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'ocean' CHECK (theme IN ('ocean', 'jade', 'coral', 'midnight', 'slate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fundora_virtual_cards
  ADD COLUMN IF NOT EXISTS card_number TEXT,
  ADD COLUMN IF NOT EXISTS expiry_month TEXT NOT NULL DEFAULT '12',
  ADD COLUMN IF NOT EXISTS expiry_year TEXT NOT NULL DEFAULT '29',
  ADD COLUMN IF NOT EXISTS cvv TEXT NOT NULL DEFAULT '123',
  ADD COLUMN IF NOT EXISTS withdrawal_method TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS withdrawal_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS iban TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bic TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS paypal_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mobile_money_provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mobile_money_phone TEXT NOT NULL DEFAULT '';

ALTER TABLE fundora_virtual_cards DROP COLUMN IF EXISTS balance;

CREATE UNIQUE INDEX IF NOT EXISTS fundora_virtual_cards_card_number_idx
  ON fundora_virtual_cards (card_number)
  WHERE card_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS fundora_card_withdrawals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES fundora_users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES fundora_virtual_cards(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  beneficiary_name TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  iban TEXT NOT NULL DEFAULT '',
  bic TEXT NOT NULL DEFAULT '',
  withdrawal_method TEXT NOT NULL DEFAULT '',
  paypal_email TEXT NOT NULL DEFAULT '',
  mobile_money_provider TEXT NOT NULL DEFAULT '',
  mobile_money_phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE fundora_card_withdrawals
  ADD COLUMN IF NOT EXISTS withdrawal_method TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS paypal_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mobile_money_provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mobile_money_phone TEXT NOT NULL DEFAULT '';

UPDATE fundora_virtual_cards
SET withdrawal_method = 'bank_transfer'
WHERE withdrawal_method = '' AND (bank_name <> '' OR iban <> '');

UPDATE fundora_card_withdrawals
SET withdrawal_method = 'bank_transfer'
WHERE withdrawal_method = '' AND (bank_name <> '' OR iban <> '');

CREATE INDEX IF NOT EXISTS fundora_card_withdrawals_user_idx
  ON fundora_card_withdrawals (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fundora_card_credits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES fundora_users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES fundora_virtual_cards(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  transfer_reference TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  credited_by UUID NOT NULL REFERENCES fundora_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fundora_card_credits_user_idx
  ON fundora_card_credits (user_id, created_at DESC);