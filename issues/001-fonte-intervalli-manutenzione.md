---
id: 1
title: "Fonte dati intervalli manutenzione per modello"
labels: [wayfinder:research]
status: closed
assignee:
blocked_by: []
---

## Question

Esiste una fonte (API, dataset aperto, scraping lecito) con gli intervalli ufficiali di manutenzione per marca/modello/anno di moto (olio, filtri, candele, valvole, catena, liquido freni/raffreddamento)? Copertura, licenza, costo, formato. Se non c'è, qual è il fallback migliore (dataset curato a mano per i modelli più diffusi in Italia + preset generici)?

## Resolution

Nessuna fonte aperta di intervalli ufficiali: Autodata, HaynesPro e MOTOR hanno licenze B2B che non si possono ridistribuire. Decisione: JSON curato nella repo con circa 30 modelli diffusi in Italia presi dai libretti ufficiali (fonte obbligatoria per ogni modello), più preset per categoria (`extends`). Intervalli sempre modificabili. Selettore: elenco di marche curato e modello come testo libero, nessuna API durante l'uso. La voce di manutenzione porta `origin` (`model`, `preset` o `user`). Dettagli e schema: [research/001-fonte-intervalli-manutenzione.md](research/001-fonte-intervalli-manutenzione.md). I numeri nello schema di esempio sono segnaposto.
