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

- [Catalogo diviso per marca nell'app](306-catalogo-diviso-per-marca-nellapp.md): un chunk per marca caricato alla scelta e tenuto offline; bundle principale da 711 a 305 KB.

- [Importare Traficom e DGT nel catalogo](305-importare-traficom-e-dgt-nel-catalogo.md): 3.758 modelli di 121 marche con dati tecnici dai registri; le specifiche ufficiali restano prioritarie; nomi normalizzati e testati.

- [Scelta delle fonti e della pipeline](303-scelta-pipeline.md): Traficom + DGT subito, ASTRA dopo la conferma della licenza; un file per marca nell'app; libretti semi-automatici a tornate; aggiornamento ogni 3 mesi con PR.

- [Open data dei registri veicoli europei per le moto](301-open-data-registri.md): ASTRA Svizzera (con gomme, licenza da confermare), Traficom Finlandia (CC BY 4.0) e DGT Spagna coprono migliaia di modelli con cc, kW e massa; RDW da provare; serbatoio solo manuale.

- [Portali ufficiali dei libretti per marca](302-portali-libretti.md): libretti scaricabili da script per 11 marche (API per KTM/Husqvarna/GasGas e MV Agusta); Ducati e Gruppo Piaggio bloccati, Kawasaki/H-D/Benelli/SYM senza accesso libero; estrazione semi-automatica con verifica.

- Grilling iniziale: obiettivo "metodo scelto e costruito"; copertura modelli e anni, dati tecnici, intervalli; solo fonti gratuite; nessun dato dagli utenti.

## Not yet specified

- Pulizia dei nomi poco leggibili e delle marche doppie per maiuscole; alias per i codici interni (WW125 = PCX, GPD125 = NMAX).


## Out of scope

- Dati inseriti dagli utenti dell'app.
- Fonti a pagamento (Autodata, HaynesPro, Car2DB…).
