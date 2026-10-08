CREATE TABLE IF NOT EXISTS fundora_support_messages (
  id UUID PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES fundora_users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES fundora_users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fundora_support_messages_conversation_idx
  ON fundora_support_messages (applicant_id, created_at);

CREATE INDEX IF NOT EXISTS fundora_support_messages_unread_idx
  ON fundora_support_messages (applicant_id, sender_id, read_at);
