---
id: 200
title: "Mappa: più intervalli dai libretti ufficiali"
labels: [wayfinder:map]
status: closed
---

## Destination

`src/data/intervals.json` contiene gli intervalli di manutenzione ufficiali (con fonte) per Honda SH125i/SH150i/SH350i, Yamaha MT-07 e Tracer 7, BMW R 1300 GS, Vespa GTS 300, Benelli TRK 502, Ducati Monster; le moto create con questi modelli ricevono i valori del libretto. Online tramite PR.

## Notes

- Stesse regole della prima tornata (ticket "Modelli verificati dai libretti ufficiali", `issues/020-modelli-verificati.md`): nessun numero senza fonte ufficiale; schema e chiavi delle voci di `intervals.json`; più scadenze per la stessa parte sono ammesse.
- I nomi dei modelli devono corrispondere a quelli del catalogo (`src/data/catalog.json`) o averli come alias, altrimenti `findModel` non li trova.
- Solo piani gratuiti, ponytail, UI in italiano.

## Decisions so far

- [Intervalli ufficiali di 9 modelli](201-ricerca-intervalli.md): 6 trovati (SH125i/150i/350i, MT-07 2021–24, Tracer 7, R 1300 GS); Vespa GTS, Ducati Monster, Benelli TRK 502 senza fonte ufficiale raggiungibile.
- [Integrare gli intervalli e pubblicare](202-integrare-intervalli.md): 6 modelli in intervals.json, test e prova E2E; pubblicati tramite PR.

## Not yet specified

- Vespa GTS 300, Ducati Monster, Benelli TRK 502 e MT-07 dal 2025: nessuna fonte ufficiale raggiungibile da qui; restano ai valori tipici finché l'utente non fornisce il PDF del libretto.

## Out of scope

- Dati tecnici dei modelli (mappa "Selezione moto guidata ed editor foto").
