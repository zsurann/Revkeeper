ALTER TABLE users ADD COLUMN notify_hour INTEGER; -- ora locale di invio; NULL = notifiche spente
ALTER TABLE users ADD COLUMN tz TEXT NOT NULL DEFAULT 'Europe/Rome';

CREATE TABLE push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL
);
CREATE INDEX push_subs_user ON push_subs(user_id);
