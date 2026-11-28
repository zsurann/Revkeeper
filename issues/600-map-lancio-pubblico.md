---
id: 600
title: "Mappa: pronti al lancio pubblico"
labels: [wayfinder:map]
status: open
---

## Destination

Revkeeper si può aprire a tutti: nessun problema BLOCCANTE o ALTO del [controllo pre-lancio del 28/11/2026](../docs/audit-2026-11-28/README.md) resta aperto, ognuno chiuso con un test o deciso con lo sviluppatore, e i controlli nei pannelli Cloudflare e Sentry sono fatti.

## Notes

- Come le mappe 300, 400 e 500, **la mappa porta l'esecuzione**: i `task` correggono, testano e pubblicano tramite PR. Vincoli: ponytail, italiano, piano Cloudflare secondo [Piano Cloudflare: restare sul gratuito?](602-piano-cloudflare.md).
- Ogni bug lascia un test in vitest che prima falliva (`npm test`); `npm run build` verde.
- Stato di partenza: 121 test verdi, build verde, main a `9234a1d`.
- I ticket `grilling` si risolvono solo parlando con lo sviluppatore: l'agente non risponde al posto suo.
- Per i dettagli di ogni problema: i sei report in `docs/audit-2026-11-28/`.

## Decisions so far

<!-- una riga per ticket chiuso -->

## Not yet specified

- **Pulizia dei record cancellati** (dalla mappa 500): i tombstone restano in D1 per sempre; con i tetti di [Gli ospiti sul server](601-ospiti-e-tetti.md) potrebbe servire.
- **Statistiche admin ed export ZIP pesanti**: 4 scansioni complete di `records`, CRC32 in JS tutto in memoria. Quanto servono dipende dal piano e dal numero di utenti.
- **SDK Sentry completo su ogni `/api`**: sostituirlo con la versione leggera del cron dipende dalla CPU misurata in [Controlli nei pannelli Cloudflare e Sentry](616-pannelli.md).
- **Retry del sync dopo 5xx/429**: oggi nessuno; forma da decidere dopo i limiti per IP.
- **Test e2e su WebKit e il test instabile `gesture.e2e.ts:168`**.

## Out of scope

- Nuove funzioni: questa mappa ripara e rinforza, non aggiunge.
- Pubblicazione su Play Store (TWA): resta una PWA; `assetlinks.json` si sistema solo perché oggi risponde con HTML.
