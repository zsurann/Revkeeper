---
id: 17
title: "Worker Cloudflare: login, sync e push"
labels: [wayfinder:task]
status: open
assignee:
blocked_by: []
---

## Question

Un Worker con D1 (giurisdizione eu) e R2: login con Google (ID token di Google Identity Services verificato sul Worker, sessione in cookie `__Host-` HttpOnly, modalità redirect per la PWA su iOS), sync push/pull con la soluzione scelta, allegati su R2, iscrizione alle push con `@block65/webcrypto-web-push` e cron orario per le notifiche a 30 e 7 giorni, il giorno stesso e il promemoria km. Lato app: schermata di accesso, coda di sync, richiesta del permesso per le notifiche.

Tetti per restare nel gratuito: allegato massimo 15 MB e quota di 500 MB per utente su R2, controllata dal Worker prima dell'upload. Sync con debounce di 2 secondi, push a lotti da 50, pull a pagine da 500. Cron orario che legge solo le scadenze dell'ora corrente tramite un indice. Limite di frequenza sulle route del Worker.
