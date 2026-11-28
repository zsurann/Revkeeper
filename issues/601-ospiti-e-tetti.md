---
id: 601
title: "Gli ospiti sul server: cosa possono fare e con quali tetti"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Oggi un ospite (nessun login) ha gli stessi tetti di un account Google: 500 MB di file e sync senza limite di record. Un solo IP crea 20 ospiti ogni 10 minuti e può riempire D1 e R2 per tutti (BLOCCANTE 1 del [controllo](../docs/audit-2026-11-28/README.md)). Cosa deve poter salvare un ospite sul server: niente file? un tetto di record? un tetto globale per tutta l'app? E per gli account Google: tetto di record per utente?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026:

- **Allegati degli ospiti solo sul telefono.** Il server rifiuta i `PUT` di file dagli ospiti (403) e `src/sync.ts` non li prova nemmeno; i file restano `uploaded: 0` e partono da soli al login Google.
- **Tetto di record per utente:** 500 per l'ospite, 20.000 per l'account Google, contati sui record non cancellati. Oltre il tetto il push risponde con un errore chiaro e il client lo mostra.
- **Freno globale:** quando D1 o R2 superano l'80% del piano, il server non crea più nuovi ospiti (gli utenti esistenti continuano) e arriva un avviso a Sentry. Il controllo passa nel giro orario del cron.
