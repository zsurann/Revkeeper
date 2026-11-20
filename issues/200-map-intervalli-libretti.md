---
id: 200
title: "Mappa: più intervalli dai libretti ufficiali"
labels: [wayfinder:map]
status: open
---

## Destination

`src/data/intervals.json` contiene gli intervalli di manutenzione ufficiali (con fonte) per Honda SH125i/SH150i/SH350i, Yamaha MT-07 e Tracer 7, BMW R 1300 GS, Vespa GTS 300, Benelli TRK 502, Ducati Monster; le moto create con questi modelli ricevono i valori del libretto. Online tramite PR.

## Notes

- Stesse regole della prima tornata (ticket "Modelli verificati dai libretti ufficiali", `issues/020-modelli-verificati.md`): nessun numero senza fonte ufficiale; schema e chiavi delle voci di `intervals.json`; più scadenze per la stessa parte sono ammesse.
- I nomi dei modelli devono corrispondere a quelli del catalogo (`src/data/catalog.json`) o averli come alias, altrimenti `findModel` non li trova.
- Solo piani gratuiti, ponytail, UI in italiano.

## Decisions so far

## Not yet specified

- Modelli il cui libretto non è consultabile (siti Piaggio/Vespa e Benelli bloccati nella ricerca precedente): fonte alternativa o esclusione.

## Out of scope

- Dati tecnici dei modelli (mappa "Selezione moto guidata ed editor foto").
