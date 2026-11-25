-- Ultimo invio di promemoria: il cron serve prima chi aspetta da più tempo
ALTER TABLE users ADD COLUMN last_reminded_at INTEGER;
