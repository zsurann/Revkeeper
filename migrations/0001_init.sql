CREATE TABLE users (
  id TEXT PRIMARY KEY,            -- sub di Google
  email TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0, -- spazio usato su R2, per la quota
  rev INTEGER NOT NULL DEFAULT 0,   -- cursore di sync
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE records (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT,
  updated_at INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, id)
);
CREATE INDEX records_pull ON records(user_id, rev);

CREATE TABLE files (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  size INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
