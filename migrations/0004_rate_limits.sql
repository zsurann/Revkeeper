-- Contatori a finestra fissa per limitare login, notifiche di prova e upload (vedi server/ratelimit.ts)
CREATE TABLE rate_limits (
  key TEXT NOT NULL,      -- azione + utente, o azione + hash dell'IP (mai l'IP in chiaro)
  window INTEGER NOT NULL, -- inizio della finestra, in secondi
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window)
);
