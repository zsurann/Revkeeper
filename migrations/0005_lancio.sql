-- Indici contro le scansioni complete (sessions per utente, pulizia dei contatori)
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS rate_limits_window ON rate_limits(window);
-- Prossimo promemoria (UTC, ms): il cron legge solo chi è in scadenza
ALTER TABLE users ADD COLUMN remind_at INTEGER;
CREATE INDEX IF NOT EXISTS users_remind_at ON users(remind_at);
-- Ultimo accesso (al massimo una scrittura al giorno) e avviso prima della cancellazione per inattività
ALTER TABLE users ADD COLUMN seen_at INTEGER;
ALTER TABLE users ADD COLUMN warned_at INTEGER;
