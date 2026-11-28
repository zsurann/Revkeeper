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

- [Gli ospiti sul server: cosa possono fare e con quali tetti](601-ospiti-e-tetti.md): allegati degli ospiti solo sul telefono; tetto di 500 record per l'ospite e 20.000 per l'account Google; nessun nuovo ospite oltre l'80% di D1 o R2.
- [Piano Cloudflare: restare sul gratuito?](602-piano-cloudflare.md): sì, il codice si adatta ai limiti.
- [Dopo un ripristino del DB: cosa fanno i telefoni](603-ripristino-e-telefoni.md): tengono i dati e li reinviano al nuovo accesso.
- [Pulsante Google: caricarlo al tocco o dichiararlo](604-pulsante-google.md): si dichiara nell'informativa.
- [Limiti per IP e operatori mobili (CGNAT)](605-limiti-ip-cgnat.md): sync per utente, login 60 ogni 10 minuti per IP.
- [Sync: pagine bloccate e lotti oltre 50 query](606-sync-pagine-e-lotti.md): un rev per blocco, rev interi nel pull, allegati in un batch.
- [Non perdere le modifiche non inviate su un 401](607-401-senza-perdite.md): dati tenuti, sessione scorrevole, cursore oltre il server riparte da zero.
- [Allegati dell'ospite persi passando a Google](608-allegati-ospite-google.md): ricaricati al login.
- [Togliere l'interruttore EPOCH](609-togliere-epoch.md): tolto.
- [Input del server: 400 invece di 500, quota atomica](610-input-e-quota.md): corpi validati, campi ignoti scartati, tetti e flag.
- [Cron promemoria che regge tutti gli utenti](611-cron-promemoria.md): ogni 10 minuti, query fisse, remind_at prima degli invii.
- [Ospiti: scaricare ed eliminare i propri dati](612-ospiti-export-elimina.md): sezione in Account e informativa.
- [Accessibilità: focus nei fogli e al cambio pagina](613-a11y-focus.md): fatto.
- [Peso al primo caricamento e PWA](614-peso-e-pwa.md): 515 → 299 kB.
- [SECURITY.md, security.txt e action fissate](615-security-txt.md): file aggiunti, SHA delle action no.

## Not yet specified

- **Pulizia dei record cancellati** (dalla mappa 500): i tombstone restano in D1 per sempre; con i tetti di [Gli ospiti sul server](601-ospiti-e-tetti.md) potrebbe servire.
- **Copia settimanale del DB a pezzi** (`cron/backup.ts`): tutta in memoria in una sola esecuzione; serve verso 1k utenti.
- **Action GitHub fissate a uno SHA**.
- **Statistiche admin ed export ZIP pesanti**: 4 scansioni complete di `records`, CRC32 in JS tutto in memoria. Quanto servono dipende dal piano e dal numero di utenti.
- **SDK Sentry completo su ogni `/api`**: sostituirlo con la versione leggera del cron dipende dalla CPU misurata in [Controlli nei pannelli Cloudflare e Sentry](616-pannelli.md).
- **Retry del sync dopo 5xx/429**: oggi nessuno; forma da decidere dopo i limiti per IP.
- **Test e2e su WebKit e il test instabile `gesture.e2e.ts:168`**.

## Out of scope

- Nuove funzioni: questa mappa ripara e rinforza, non aggiunge.
- Pubblicazione su Play Store (TWA): resta una PWA; `assetlinks.json` si sistema solo perché oggi risponde con HTML.
