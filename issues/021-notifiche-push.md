---
id: 21
title: "Notifiche push e cron"
labels: [wayfinder:task]
status: open
assignee:
blocked_by: [17]
---

## Question

Iscrizione alle push (`/api/push/subscribe`, chiavi VAPID come secret), ora di invio e fuso orario scelti dall'utente, cron orario in un Worker separato che legge D1 e invia con `@block65/webcrypto-web-push` le notifiche a 30 e 7 giorni, il giorno stesso, e il promemoria km dopo 30 giorni senza letture. Handler `push` e `notificationclick` nel service worker (injectManifest). Le scadenze arrivano al server con il sync, quindi niente endpoint `/reminders` a parte. Tetti del piano gratuito: lotti per esecuzione e rimozione delle subscription 404/410.
