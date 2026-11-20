---
id: 301
title: "Open data dei registri veicoli europei per le moto"
labels: [wayfinder:research]
status: closed
assignee: claude
blocked_by: []
---

## Question

Quali registri pubblici europei offrono, gratis e con licenza libera, i dati delle moto immatricolate (marca, modello o denominazione commerciale, anno, cilindrata, potenza, massa, misure gomme)? Candidati: RDW Olanda (opendata.rdw.nl), KBA Germania, MIT/Motorizzazione Italia (dati.mit.gov.it), SIV Francia, altri. Per ognuno: accesso (API, file), campi, copertura delle moto, licenza, qualità dei nomi, volume.

## Resolution

Dettagli, query e bozza di pipeline: [research/301-open-data.md](research/301-open-data.md).

- **Svizzera, ASTRA `TAS_Motorrad.csv`** (gratis, aggiornato ogni mese, 12 MB): 11.663 omologazioni moto, 603 marche, dal 1995 al 2026, con nome commerciale, cilindrata, kW, peso e **misure gomme** (Z650 2026: 649 cc, 50,2 kW, 120/70ZR17 e 160/60ZR17). **Licenza non esplicita**: serve una conferma scritta di ASTRA prima di usarlo. Il peso sembra includere il conducente (263 kg contro i 188 UE sulla Z650).
- **Finlandia, Traficom** (CC BY 4.0, licenza più pulita): 251.792 moto, 771 marche, 12.928 coppie marca-modello, con cilindrata, kW, massa a vuoto e anno; niente gomme.
- **Spagna, microdati DGT** (dal 2014, riuso libero citando la fonte): marca, modello, cilindrata, kW, massa; utile per gli scooter 125 e per gli anni di vendita.
- **RDW Olanda** (CC0): non provato perché l'host è bloccato da questa sessione.
- **Esclusi**: KBA (moto "tutti i diritti riservati"), MIT Italia (manca il modello), Francia, Belgio, Norvegia; Wikidata quasi vuoto.
- **Serbatoio**: non c'è in nessuna fonte aperta, resta manuale.
- **Normalizzazione nomi**: separare i nomi multipli, togliere i suffissi (ABS, A2, 35KW…), unire lettere e numero ("SH 125 I" → SH125), raggruppare per marca, famiglia e cilindrata arrotondata (Z650 1977 ≠ 2017), tabella manuale per i codici interni (WW125 = PCX).
