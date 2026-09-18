CREATE TABLE IF NOT EXISTS community_grants (
  operation_id uuid PRIMARY KEY,
  secret_hash text NOT NULL UNIQUE,
  owner_id text NOT NULL,
  session_id text NOT NULL,
  author_name text NOT NULL,
  intent jsonb NOT NULL,
  snapshot jsonb,
  approved_at timestamptz,
  receipt jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
CREATE INDEX IF NOT EXISTS community_grants_owner_created ON community_grants (owner_id, created_at);
CREATE TABLE IF NOT EXISTS community_publications (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  author_name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  state text NOT NULL CHECK (state IN ('published', 'withdrawn')),
  snapshot jsonb,
  portrait_id uuid,
  artwork_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_publications_public ON community_publications (created_at DESC, id DESC) WHERE state = 'published';
CREATE TABLE IF NOT EXISTS community_media (
  id uuid PRIMARY KEY,
  operation_id uuid NOT NULL REFERENCES community_grants(operation_id),
  slot text NOT NULL CHECK (slot IN ('portrait', 'artwork')),
  input_hash text NOT NULL,
  output_hash text NOT NULL,
  provider_key text,
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= 3000000),
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading', 'ready', 'retiring', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operation_id, slot)
);
CREATE INDEX IF NOT EXISTS community_media_cleanup ON community_media (state, updated_at);
ALTER TABLE community_grants ADD COLUMN IF NOT EXISTS snapshot jsonb;
ALTER TABLE community_grants ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE community_grants ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE TABLE IF NOT EXISTS community_cancellations (
  secret_hash text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE community_cancellations ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour';
CREATE INDEX IF NOT EXISTS community_cancellations_expiry ON community_cancellations (expires_at);
