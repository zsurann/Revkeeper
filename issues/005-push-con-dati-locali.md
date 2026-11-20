---
id: 5
title: "Push con dati locali: cosa va al server"
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [2, 4]
---

## Question

Con i dati in locale, cosa invia il telefono al Worker per ricevere le push: solo le date di scadenza anonime con la subscription, o un account? Privacy, cosa succede quando l'utente aggiorna i km e se questo anticipa il cloud sync.

## Resolution

- **Account con login tramite link via email**, senza password. Il server conosce i dati dell'utente: il sync completo entra nell'MVP (vedi i nuovi ticket).
- Il telefono reinvia l'elenco delle scadenze **a ogni modifica** (km aggiornati, intervento registrato, documento cambiato). Le scadenze in km si convertono in data con la stima a 90 giorni.
- Notifiche: **30 giorni prima, 7 giorni prima, il giorno della scadenza**, più un **promemoria km** se non li aggiorni da 30 giorni.
- **Ora di invio scelta dall'utente**, con fuso orario salvato: un cron **orario** invia a chi ha quell'ora locale. Supera il limite di circa 40-50 push per esecuzione emerso nella ricerca: per un uso personale basta.
- Ogni notifica dice cosa scade e quando (es. "Revisione Africa Twin tra 7 giorni").
