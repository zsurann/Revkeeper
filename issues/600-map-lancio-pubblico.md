---
id: 600
title: "Mappa: pronti al lancio pubblico"
labels: [wayfinder:map]
status: closed
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
- [Controlli nei pannelli Cloudflare e Sentry](616-pannelli.md): piano gratuito, avviso di spesa attivo, migrazione applicata; restano Sentry IP, permessi del token, CPU reale (checklist nel ticket).
- [Anteprime dei branch sui dati di produzione](617-anteprime-separate.md): D1 e R2 separati per le anteprime.
- [Copia settimanale che non trascina giù gli altri lavori](618-copia-isolata.md): lavori della domenica separati, avviso oltre 50.000 righe.
- [Statistiche admin senza scansioni complete](619-statistiche-leggere.md): attivi da seen_at, cache di un'ora.
- [Export dei dati senza CRC dei file sul server](620-export-sul-telefono.md): ZIP composto sul telefono.
- [Sentry leggero sulle API](621-sentry-leggero-api.md): niente SDK, un evento per richiesta con errori.

## Not yet specified

- **Copia del DB a pezzi su più giri**: serve quando [Copia settimanale che non trascina giù gli altri lavori](618-copia-isolata.md) comincia ad avvisare.

## Out of scope

- MEDI e BASSI del controllo oltre la destinazione (solo BLOCCANTI e ALTI): pulizia dei tombstone, retry del sync dopo 5xx/429, action GitHub fissate a SHA, e2e su WebKit e `gesture.e2e.ts:168` instabile, `Mark.tsx` con `animate`.

- Nuove funzioni: questa mappa ripara e rinforza, non aggiunge.
- Pubblicazione su Play Store (TWA): resta una PWA; `assetlinks.json` si sistema solo perché oggi risponde con HTML.
