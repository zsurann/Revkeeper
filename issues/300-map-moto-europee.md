---
id: 300
title: "Mappa: tutte le moto europee nel catalogo"
labels: [wayfinder:map]
status: open
---

## Destination

Un metodo scelto, costruito e pubblicato che porta nel catalogo di Revkeeper i modelli venduti in Europa con anni, dati tecnici e intervalli di manutenzione, aggiornabile negli anni, senza costi.

## Notes

- **Solo fonti gratuite** (open data, siti e libretti ufficiali). **Niente contributi degli utenti** al catalogo.
- Costruisce sopra quanto esiste: `scripts/build-catalog.ts` (vPIC + `data/catalog-extra.json`), `src/data/catalog.json`, `src/data/intervals.json`, `specsOf`/`itemsFor`. Regole già decise: varianti unite se i dati tecnici non cambiano, nessun numero senza fonte.
- La mappa porta l'esecuzione: i `task` costruiscono, testano e pubblicano tramite PR.
- Vincoli: piani gratuiti Cloudflare, app offline (peso del catalogo da tenere sotto controllo), ponytail, italiano.

## Decisions so far

- Grilling iniziale: obiettivo "metodo scelto e costruito"; copertura modelli e anni, dati tecnici, intervalli; solo fonti gratuite; nessun dato dagli utenti.

## Not yet specified

- Come unire nomi diversi dello stesso modello tra fonti diverse (es. "Z650" e "Z 650 ABS" e codici di omologazione).
- Peso del catalogo nell'app se passa da 1.300 a molte migliaia di modelli (caricamento per marca?).
- Ogni quanto aggiornare e con quale automazione gratuita.

## Out of scope

- Dati inseriti dagli utenti dell'app.
- Fonti a pagamento (Autodata, HaynesPro, Car2DB…).
