CREATE TABLE IF NOT EXISTS fundora_donation_campaigns (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  categories TEXT[] NOT NULL CHECK (cardinality(categories) > 0),
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  description TEXT NOT NULL,
  image_file_name TEXT NOT NULL,
  image_content_type TEXT NOT NULL CHECK (image_content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  image_data BYTEA NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES fundora_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fundora_donation_campaigns_published_idx
  ON fundora_donation_campaigns (is_published, created_at DESC);
