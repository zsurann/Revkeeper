---
id: 21
title: "Notifiche push e cron"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [17]
---

## Question

Iscrizione alle push (`/api/push/subscribe`, chiavi VAPID come secret), ora di invio e fuso orario scelti dall'utente, cron orario in un Worker separato che legge D1 e invia con `@block65/webcrypto-web-push` le notifiche a 30 e 7 giorni, il giorno stesso, e il promemoria km dopo 30 giorni senza letture. Handler `push` e `notificationclick` nel service worker (injectManifest). Le scadenze arrivano al server con il sync, quindi niente endpoint `/reminders` a parte. Tetti del piano gratuito: lotti per esecuzione e rimozione delle subscription 404/410.

## Resolution

Fatto e pubblicato.

- **D1**: migrazione `0002_push.sql` (`users.notify_hour`, `users.tz`, tabella `push_subs`), applicata in locale e in remoto.
- **API** (Pages Functions): `POST /api/push/subscribe` (endpoint https, chiavi, ora 0–23, fuso valido, massimo 5 dispositivi per utente), `/api/push/unsubscribe`, `/api/push/test` (notifica di prova immediata).
- **Cron**: Worker `revkeeper-cron` con trigger `0 * * * *`, stesso D1. Ogni ora prende gli utenti la cui ora locale coincide con quella scelta e calcola le scadenze dai record sincronizzati con la stessa logica dell'app (`src/domain/due.ts`). Invia **una sola notifica al giorno per dispositivo** con tutte le scadenze a 30 e 7 giorni e del giorno stesso, più "aggiorna i km" ogni 30 giorni senza letture. Al massimo 40 invii per esecuzione (piano gratuito: 50 subrequest); le subscription 404/410 vengono eliminate.
- **Invio**: `@block65/webcrypto-web-push` 2.0.0 (aes128gcm + VAPID, va bene anche per Apple). Chiavi VAPID generate qui: la pubblica è in `wrangler.toml`, `cron/wrangler.toml` e `.env`; la privata è solo nei secret di Pages e del Worker (`VAPID_PRIVATE_KEY`), non nella repo.
- **Client**: `public/push-sw.js` caricato dal service worker Workbox (`importScripts`), mostra sempre una notifica (iOS revoca chi non lo fa) e al tocco apre l'app. Account → "Notifiche": ora dell'avviso, attiva (permesso chiesto dentro il tocco), invia prova, disattiva; su iPhone fuori dalla Home spiega come installare.

Verifiche: 24 test (promemoria a 30 e 7 giorni, km fermi, ora locale nel fuso), `tsc` di client, server e cron, build; endpoint provati con `wrangler pages dev` (iscrizione non valida, ora 25, fuso sbagliato → 400; iscrizione valida salvata con ora e fuso; disiscrizione). Deploy del Worker riuscito con il trigger orario.

Verificato dall'utente: la notifica di prova arriva su Android, quindi il login Google in produzione funziona. Resta da provare iOS con l'app installata nella schermata Home.
