-- Pulizia delle sessioni scadute a ogni login senza leggere tutta la tabella
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);
