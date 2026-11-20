---
id: 16
title: "Interventi, documenti e allegati"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Registrare un intervento (data, km, più voci, note, costi totale/ricambi/manodopera, foto e scontrini) e i documenti (assicurazione, bollo, revisione con scadenza e allegati). Foto compresse sul telefono in JPEG, lato lungo 1600 px; PDF fino a 15 MB; controllo della quota del browser.

## Resolution

Fatto. Tre schede in basso: Cruscotto, Interventi, Documenti.

- **Interventi** (`src/Services.tsx`): data (non futura), km, più voci con checkbox, ricambi, manodopera e totale (il totale scritto vince, altrimenti è la somma; importi all'italiana come `1.120,50`), note, allegati. Storico dal più recente, totale speso, eliminazione logica. Se i km dell'intervento superano quelli attuali, diventano anche una lettura del contachilometri.
- **Documenti** (`src/Documents.tsx`): assicurazione, bollo e revisione, ciascuno con scadenza, stato e allegati; si aggiungono file senza perdere quelli già salvati.
- **Allegati** (`src/Attachments.tsx`, `prepareAttachment` in `src/image.ts`): foto in JPEG a 1600 px, PDF così com'è, solo foto o PDF, massimo 15 MB, blocco se l'uso arriva al 90% della quota del browser. Si aprono in una nuova scheda.
- Correzione emersa dalla prova: quando la scadenza più urgente è un documento, la scheda grande della home mostra comunque la manutenzione più urgente e il documento resta nell'elenco.

Verifiche: 19 test (form intervento, importi, limiti dei file), build ok. In Chromium a 390 px: intervento con 2 voci, costi e foto; revisione con PDF segnata "in scadenza" e ripresa nell'elenco della home; catena azzerata dopo l'intervento; nessun errore in console.
