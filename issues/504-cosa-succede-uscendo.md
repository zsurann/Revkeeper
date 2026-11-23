---
id: 504
title: "Cosa succede quando si esce dall'account"
labels: [wayfinder:grilling]
status: open
---

## Question

Oggi "Esci" (`logout` in `src/sync.ts`) chiude la sessione ma lascia l'iscrizione alle notifiche sul server: il telefono continua a ricevere gli avvisi di quell'account. I dati locali restano e alla prossima entrata con un **altro** account vengono caricati su quello (`startAccount` segna tutto come da inviare). Uscendo: disattivare le notifiche (sembra ovvio), e i dati locali restano, vengono cancellati o si chiede all'utente? E accedere con un account diverso deve unire i dati locali o no?
