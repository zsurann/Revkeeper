---
id: 504
title: "Cosa succede quando si esce dall'account"
labels: [wayfinder:grilling]
status: closed
---

## Question

Oggi "Esci" (`logout` in `src/sync.ts`) chiude la sessione ma lascia l'iscrizione alle notifiche sul server: il telefono continua a ricevere gli avvisi di quell'account. I dati locali restano e alla prossima entrata con un **altro** account vengono caricati su quello (`startAccount` segna tutto come da inviare). Uscendo: disattivare le notifiche (sembra ovvio), e i dati locali restano, vengono cancellati o si chiede all'utente? E accedere con un account diverso deve unire i dati locali o no?

## Risoluzione

Deciso dallo sviluppatore (23/11/2026): **uscendo, i dati locali vengono cancellati**.

- `logout` in `src/sync.ts`: disattiva le notifiche di questo telefono (server e browser), chiude la sessione, poi svuota tutti gli store locali, `meta` compreso (account, cursore, `deviceId`). Se la rete manca si ferma prima di cancellare, così non resta un telefono vuoto con la sessione aperta.
- `Account.tsx`: prima di uscire prova un sync; se restano modifiche non inviate (`unsynced`) chiede conferma, perché andrebbero perse. Dopo l'uscita ricarica l'app, che riparte vuota. Testo sotto "Esci" aggiornato.
- Accesso con un altro account: il telefono è vuoto, quindi non si mescola nulla. Restano caricati solo i dati creati da disconnessi, come già fa il primo accesso.
- Test `src/logout.test.ts` (falliva prima).
