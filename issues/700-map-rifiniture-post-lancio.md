---
id: 700
title: "Mappa: rifiniture post-lancio"
labels: [wayfinder:map]
status: closed
---

## Destination

I punti MEDI e BASSI del [controllo pre-lancio del 28/11/2026](../docs/audit-2026-11-28/README.md) ancora aperti sono corretti con un test, o esclusi con una decisione dello sviluppatore.

## Notes

- Come la mappa 600, **la mappa porta l'esecuzione**: i `task` correggono, testano e pubblicano tramite PR. Vincoli: piano gratuito Cloudflare, ponytail, italiano.
- Ogni correzione lascia un test che prima falliva (`npm test`); `npm run build` verde.
- I ticket `grilling` si risolvono solo parlando con lo sviluppatore.
- Dettagli di ogni punto: i sei report in `docs/audit-2026-11-28/`.

## Decisions so far

<!-- una riga per ticket chiuso -->

- [Pulizia dei record cancellati: dopo quanto tempo?](701-pulizia-tombstone.md): 180 giorni, la domenica.
- [Migrazioni del database nella pipeline](702-migrazioni-pipeline.md): automatiche in GitHub Actions prima del cron; token con D1:Edit.
- [Spazio file: tetto per utente e copie](703-spazio-file.md): 100 MB per utente.
- [Test e2e su Safari (WebKit)](704-e2e-webkit.md): in CI su Chrome e WebKit.
- [Sync: nuovi tentativi e aggiornamento al rientro](705-sync-retry.md): attesa crescente da 30 s a 15 min, sync in primo piano.
- [Server: piccoli rinforzi](706-server-rinforzi.md): indice sessioni, niente id a Sentry, tetto agli eventi, pulizia tombstone.
- [Accessibilità: ultimi punti](707-a11y-ultimi.md): A-04…A-14 corretti.
- [Privacy: registro e informativa allineati](708-privacy-allineata.md): ospite, Sentry, art. 13 e 22.
- [PWA e interfaccia: rifiniture](709-pwa-ui-rifiniture.md): maskable, screenshots, CSP, conferme in un foglio.
- [Test e2e instabile: gesture.e2e.ts:168](710-e2e-instabile.md): l'app era corretta, il test ora verifica l'invariante.

## Not yet specified

- **Scritture D1 a 10k utenti attivi** (audit 04, n. 9): ~30 righe per utente al giorno; conta solo se si cresce.

## Out of scope

- Crescita oltre i 1.000 utenti (copia del DB a pezzi, Workers Paid): sarà una mappa a parte.
- Play Store (TWA) e nuove funzioni.
- `Mark.tsx` con `animate`: dopo il caricamento a parte di `App` pesa solo nel blocco dell'app.
