---
id: 2
title: "Web Push per PWA con backend Cloudflare"
labels: [wayfinder:research]
status: closed
assignee:
blocked_by: []
---

## Question

Come si fanno notifiche Web Push affidabili da una PWA (Android Chrome, iOS Safari ≥16.4 da home screen) con un backend su Cloudflare Workers: VAPID, libreria compatibile con Workers, Cron Triggers per controllare le scadenze, storage (D1/KV), limiti del piano gratuito. Cosa deve sapere il server delle scadenze se i dati vivono sul telefono?

## Resolution

Un Worker con `/subscribe`, `/reminders`, `/unsubscribe` e un Cron Trigger giornaliero; dati su D1 (KV no). Libreria `@block65/webcrypto-web-push@2.0.0` (aes128gcm, va bene per iOS); in alternativa `@pushforge/builder`. Sul server: `deviceId` anonimo, subscription e lista `{dueDate, label?}`. Limite del piano gratuito: circa 40-50 push per esecuzione del cron. iOS: push solo con la PWA installata sulla Home e permesso chiesto da un gesto dell'utente. Dettagli: [research/002-web-push-pwa-cloudflare.md](research/002-web-push-pwa-cloudflare.md). Da verificare con un primo test: formato delle chiavi VAPID e CPU usata per ogni push.
