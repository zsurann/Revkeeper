---
id: 500
title: "Mappa: bug e miglioramenti dall'analisi del codice"
labels: [wayfinder:map]
status: open
---

## Destination

I bug trovati nell'analisi del 23/11/2026 sono corretti, coperti da un test ciascuno e pubblicati tramite PR; le scelte che toccano l'utente (recupero dati persi, cosa succede all'uscita) sono decise con lo sviluppatore prima di costruirle.

## Notes

- Come le mappe 300 e 400, **la mappa porta l'esecuzione**: i `task` correggono, testano e pubblicano tramite PR. Vincoli: piani gratuiti Cloudflare, ponytail, italiano.
- Ogni bug lascia un test in vitest che prima falliva (`npm test`); typecheck verde (`npm run build`).
- Stato di partenza: 45 test verdi, typecheck verde, main a `16f1f05`.
- I ticket `grilling` si risolvono solo parlando con lo sviluppatore: l'agente non risponde al posto suo.

## Decisions so far

<!-- una riga per ticket chiuso -->

## Not yet specified

- **Notifiche con più utenti**: il cron invia al massimo 40 notifiche all'ora, sempre agli utenti nello stesso ordine, quindi oltre i 40 iscritti alla stessa ora gli ultimi non le ricevono mai. Va affrontato quando gli utenti crescono: rotazione, code, piano a pagamento?
- **Pulizia dei record cancellati**: i record cancellati restano in D1 per sempre. Per eliminarli bisogna sapere per quanto tempo un dispositivo può restare offline e risincronizzarsi senza far ricomparire record cancellati.
- **Accorgersi dei guasti in produzione**: oggi si scoprono solo per caso, come le pagine del pull che saltano record. Servono log o avvisi del cron e del sync?

## Out of scope

- Nuove funzioni: questa mappa ripara e rinforza, non aggiunge.
