ALTER TABLE fundora_task_submissions
  ADD COLUMN IF NOT EXISTS submission_type TEXT NOT NULL DEFAULT 'work';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fundora_task_submissions_type_check'
      AND conrelid = 'fundora_task_submissions'::regclass
  ) THEN
    ALTER TABLE fundora_task_submissions
      ADD CONSTRAINT fundora_task_submissions_type_check
      CHECK (submission_type IN ('work', 'payment_proof'));
  END IF;
END $$;
