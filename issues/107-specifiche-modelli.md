---
id: 107
title: "Specifiche tecniche dei 21 modelli"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Raccogliere dalle schede ufficiali dei costruttori cilindrata, potenza, peso, serbatoio, misure gomme, gradazione e quantità dell'olio, liquido freni, con URL e data, per la Kawasaki Z650 (per generazione: 2017–2019, 2020–2023, 2024+) e i 20 modelli più venduti in Italia negli ultimi anni (fonte delle immatricolazioni: ANCMA/UNRAE). Scrivere in `data/catalog-extra.json`.

## Resolution

Fatto in parte: **Z650 (3 generazioni) + 15 modelli** con dati letti dalle pagine ufficiali (URL in ogni voce). Dettagli in [research/107-specifiche.md](research/107-specifiche.md).

- **Inclusi**: Kawasaki Z650 2017–2019 (186 kg), 2020–2023 (187 kg), 2024+ (188 kg, 68 CV), tutte 649 cc, 15 l, 120/70 ZR17 – 160/60 ZR17; Kawasaki Z900, Versys 650; Honda SH125i, SH150i, SH350i, X-ADV, NC750X, CB650R, Forza 350; Yamaha MT-07, Tracer 7, XMAX 300, NMAX 125; BMW R 1300 GS; KTM 390 Duke.
- **Saltati**: Africa Twin CRF1100L e Ducati Monster 2021 (il sito mostra solo la nuova generazione); Vespa GTS 300 e Primavera 125, Piaggio Beverly 300 e Liberty 125, Triumph Trident 660 (403); Benelli TRK 502 e Leoncino 500 (sito non raggiungibile).
- **Limiti**: gli anni d'inizio delle generazioni sono stimati dalla storia dei modelli (le pagine ufficiali non li riportano); la Z650 prima del 2024 non ha la potenza (le schede USA non la dicono); olio e liquido freni quasi assenti (i libretti Kawasaki sono a pagamento). Le misure delle gomme sono normalizzate al formato dei menu (es. `120/70 ZR17`).

Integrazione: specifiche in `data/catalog-extra.json`, catalogo rigenerato con `node scripts/build-catalog.ts --offline` (nuova modalità che riusa la copia di vPIC in `.cache/`). `specsOf` senza anno usa la generazione più recente; con l'anno usa quella giusta oppure nessuna (le generazioni non verificate non precompilano). Verificato: 31 test; E2E: Kawasaki → Z650 compila 649 cc, 68 CV, 188 kg, 15 l e le gomme; scegliendo 2017 passa a 186 kg e svuota la potenza; una modifica a mano (190 kg) viene salvata.
