---
id: 303
title: "Scelta delle fonti e della pipeline"
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [301, 302]
---

## Question

Con quello che offrono registri e portali: quali fonti usiamo per modelli e anni, dati tecnici e intervalli; come si integrano con vPIC e il catalogo attuale; cosa è automatico e cosa resta lavoro manuale; quanto lavoro serve per la prima tornata.

## Resolution

- **Fonti per modelli e dati tecnici**: si parte con **Traficom (Finlandia, CC BY 4.0)** e **DGT (Spagna)**, uniti a vPIC e a `catalog-extra.json`. **ASTRA (Svizzera, con le gomme)** entra solo dopo la conferma scritta della licenza, che l'utente chiede ad ASTRA. Le fonti vanno citate nell'app.
- **Peso nell'app**: un file per marca. L'elenco delle marche è nel bundle, i modelli di una marca si scaricano quando la si sceglie e restano in cache offline (service worker).
- **Intervalli**: pipeline semi-automatica per marca sulle 11 marche con libretti accessibili (lister, download lento fuori dal repo, estrazione delle tabelle, verifica di un agente su ogni modello, nel repo solo numeri con fonte). A tornate, partendo dai modelli più venduti. Ducati e Gruppo Piaggio restano fuori finché non arrivano i PDF.
- **Aggiornamento**: ogni 3 mesi un'attività programmata rigenera il catalogo e apre una PR da approvare.
