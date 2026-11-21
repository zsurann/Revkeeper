---
id: 309
title: "Aggiungere ASTRA al catalogo"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [304, 305]
---

## Question

Se ASTRA conferma la licenza: importare TAS_Motorrad.csv (soprattutto le misure delle gomme), con il peso corretto (verificare se include il conducente).

## Risoluzione

Fatto su richiesta dell'utente prima della risposta scritta di ASTRA. La panoramica ufficiale dei prodotti informativi ASTRA (01 Overview vehicle data information products, 01/07/2026) elenca i "Type approval data" tra gli "Information products available free of charge (open data)"; resta senza un testo di licenza esplicito, quindi la conferma per email rimane consigliata.

- `scripts/import-eu.ts` scarica `TAS_Motorrad.csv` (12 MB) e prende per omologazione: marca, nome commerciale, anno modello, cc, kW, **gomme**. Solo classi L1e/L3e (e le vecchie senza codice), niente omologazioni annullate.
- **Peso escluso**: il peso a vuoto svizzero include il conducente (Z650: 262 kg contro 187 reali) e resta a Traficom e DGT.
- Anno modello: un'omologazione da luglio in poi vale per l'anno dopo (Z650 10/2016 → 2017).
- Gomme: misura più frequente del modello, normalizzata come nell'elenco dell'app ("120/70 ZR17", "100/80-16"); "v+h=" o senza prefisso = stessa misura davanti e dietro; misure in pollici saltate.
- Un'omologazione basta da sola a creare il modello (dato ufficiale), con la soglia di 50 righe per marca.
- Anni per fonte: i 12 mesi di DGT non cancellano più gli anni vecchi (SH125 torna 2001–oggi).
- Filtro auto DGT più stretto: senza massa serve un modello già noto da Traficom/ASTRA, o una marca di moto e meno di 1900 cc. Escono BMW Z4/Serie Z, Mini, furgoni Peugeot e Renault. BMW Z3 escluso a mano in `catalog-extra.json` (l'elenco `exclude` ora vale anche per i registri).
- Risultato: da 2.848 a 5.401 modelli dai registri; 3.175 con le gomme. Catalogo da 3.758 a 6.187 modelli, da 0,5 a 1 MB in tutto, sempre un file per marca (il più grande: Harley-Davidson, 105 KB).
- Fonte mostrata nella scheda: "registri ufficiali: ASTRA, DGT, Traficom (CC BY 4.0)"; attribuzione in Account e nel README.
