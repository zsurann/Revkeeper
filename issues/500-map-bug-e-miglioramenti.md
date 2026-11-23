---
id: 500
title: "Mappa: bug e miglioramenti dall'analisi del codice"
labels: [wayfinder:map]
status: closed
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

- [Correggere gli importi in euro moltiplicati per 100](501-importi-in-euro-x100.md): punto decimale accettato, punti seguiti da gruppi di 3 cifre letti come migliaia; nessuna correzione automatica dei dati vecchi.
- [Correggere il pull che salta record a cavallo di pagina](502-pull-salta-record.md): la pagina piena si chiude all'ultimo `rev` completo; nessun cambio al client.
- [Recuperare i record già persi dal pull?](503-recuperare-record-persi.md): no, deciso dallo sviluppatore.
- [Cosa succede quando si esce dall'account](504-cosa-succede-uscendo.md): notifiche spente e dati locali cancellati, con conferma se ci sono modifiche non ancora online.
- [Usare la data locale invece di quella UTC](505-data-locale-non-utc.md): un solo `today()` locale in `src/format.ts`.
- [Allineare client e server sul pareggio di orario nel sync](506-pareggio-sync.md): a pari orario il client segue la scelta del server (`deviceId` più grande).
- [Rinforzi piccoli: file scaricati e clic sulla notifica](507-rinforzi-piccoli.md): `nosniff` sempre, `inline` solo immagini raster e PDF; il clic porta la finestra alla pagina della notifica.
- [Togliere dal repo i file generati](508-pulizia-repo.md): `.playwright-mcp/` e `*.tsbuildinfo` ignorati e tolti dall'indice; `.env` resta.

## Not yet specified

- **Notifiche con più utenti**: il cron invia al massimo 40 notifiche all'ora, sempre agli utenti nello stesso ordine, quindi oltre i 40 iscritti alla stessa ora gli ultimi non le ricevono mai. Va affrontato quando gli utenti crescono: rotazione, code, piano a pagamento?
- **Pulizia dei record cancellati**: i record cancellati restano in D1 per sempre. Per eliminarli bisogna sapere per quanto tempo un dispositivo può restare offline e risincronizzarsi senza far ricomparire record cancellati.
- **Accorgersi dei guasti in produzione**: oggi si scoprono solo per caso, come le pagine del pull che saltano record. Servono log o avvisi del cron e del sync?

## Out of scope

- Nuove funzioni: questa mappa ripara e rinforza, non aggiunge.
