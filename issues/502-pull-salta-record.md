---
id: 502
title: "Correggere il pull che salta record a cavallo di pagina"
labels: [wayfinder:task]
status: open
---

## Question

`push` in `server/api.ts` dà lo stesso `rev` a tutto un lotto (fino a 50 record); `pull` legge `LIMIT 500` e passa come cursore l'ultimo `rev`. Se una pagina si chiude a metà di un `rev`, la pagina successiva (`rev > cursore`) salta il resto di quel lotto: in simulazione 30 record persi su 580. Correggere in modo che nessun record venga saltato (per esempio chiudere la pagina all'ultimo `rev` completo, oppure un cursore composto `rev,kind,id`), con un test sul server che crea un lotto a cavallo di pagina. PR e pubblicazione.
