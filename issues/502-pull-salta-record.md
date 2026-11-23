---
id: 502
title: "Correggere il pull che salta record a cavallo di pagina"
labels: [wayfinder:task]
status: closed
assignee: claude
---

## Question

`push` in `server/api.ts` dà lo stesso `rev` a tutto un lotto (fino a 50 record); `pull` legge `LIMIT 500` e passa come cursore l'ultimo `rev`. Se una pagina si chiude a metà di un `rev`, la pagina successiva (`rev > cursore`) salta il resto di quel lotto: in simulazione 30 record persi su 580. Correggere in modo che nessun record venga saltato (per esempio chiudere la pagina all'ultimo `rev` completo, oppure un cursore composto `rev,kind,id`), con un test sul server che crea un lotto a cavallo di pagina. PR e pubblicazione.

## Risoluzione

- `pageOf` in `server/api.ts`: una pagina piena (500 righe) scarta le righe dell'ultimo `rev`, che potrebbe essere incompleto, e mette il cursore sul `rev` precedente; quelle righe arrivano intere nella pagina successiva. Funziona perché un lotto (50) è sempre più piccolo di una pagina (500), quindi una pagina contiene almeno un `rev` completo e non resta mai vuota.
- Nessun cambio al client né al database; il formato della risposta è lo stesso.
- Test: `server/api.test.ts` simula 12 lotti e il pull a pagine. Con la vecchia logica arrivano 550 record su 580, con la nuova tutti.
- I dispositivi che hanno già saltato record restano senza: vedi [Recuperare i record già persi dal pull?](503-recuperare-record-persi.md), ora sbloccato.
