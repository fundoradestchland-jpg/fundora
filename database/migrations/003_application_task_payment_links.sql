ALTER TABLE fundora_application_tasks
  ADD COLUMN IF NOT EXISTS payment_url TEXT NOT NULL DEFAULT '';
