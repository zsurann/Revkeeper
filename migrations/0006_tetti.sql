-- Record per utente (righe in records, tombstone compresi): tetto contro chi riempie D1
ALTER TABLE users ADD COLUMN records INTEGER NOT NULL DEFAULT 0;
UPDATE users SET records = (SELECT COUNT(*) FROM records r WHERE r.user_id = users.id);
-- Interruttori scritti dal cron e letti dall'API (guests_closed: spazio oltre l'80%, niente nuovi ospiti)
CREATE TABLE IF NOT EXISTS flags(name TEXT PRIMARY KEY, value INTEGER NOT NULL);
