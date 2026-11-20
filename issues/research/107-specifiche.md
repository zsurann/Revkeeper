# 107 – Specifiche tecniche ufficiali

Dati in `107-specs.json`. Solo pagine ufficiali dei costruttori (lette il 2026-11-20); nessun forum, Wikipedia o rivista come fonte di un numero. Campo omesso = la fonte ufficiale non lo riporta.

## Regole applicate
- `hp`: CV/PS dichiarati arrotondati all'intero (es. 73,4 CV → 73; 16,9 CV → 17). Dove c'è solo kW: round(kW × 1,36) (XMAX 300: 20,6 kW → 28).
- `cc`: intero (Honda SH125i 124,5 cc → 125; KTM 398,7 cm³ → 399).
- Pneumatici: misura copiata dalla fonte, **senza** indice di carico/velocità, "M/C", "Tubeless" o marca (es. "120/70 ZR17 M/C (58W)" → "120/70 ZR17"). La grafia della misura è quella della fonte, quindi non è uniforme tra marchi (es. Yamaha "120/70ZR17", Tracer 7 "120/70 ZR 17", Honda CB650R "120/70-ZR17"). Se l'app vuole un formato unico, normalizzare a valle.
- `from` (anno di inizio generazione): **le pagine ufficiali attuali NON indicano l'anno di inizio generazione**; l'ho messo io in base alla storia nota dei modelli. È il dato meno affidabile del file, da verificare.
- Olio/liquido freni: quasi nessuna pagina li riporta; i libretti uso e manutenzione Kawasaki non sono scaricabili gratis (in vendita su kawasaki.com), quelli Honda/Yamaha non li ho cercati per mancanza di tempo.

## Kawasaki
### Z650
- 2024+: https://www.kawasaki.it/it_it/Motorcycles/Supernaked/Z650_2026.html – 649 cm³, 50,2 kW {68 CV}, "Peso in ordine di marcia*" 188 kg, serbatoio 15,0 L, 120/70 ZR17 – 160/60 ZR17.
- 2020–2023: https://www.kawasaki.com/en-us/products/ProductSpecSheetPDF/2023-z650 (anche 2020, 2021, 2022 con gli stessi valori) – scheda USA: curb weight 412,3 lb (ABS) = 187 kg; 4,0 gal; 649 cc; stessi pneumatici.
- 2017–2019: https://www.kawasaki.com/en-us/products/ProductSpecSheetPDF/2019-z650-abs – curb weight 410,1 lb (ABS) = 186 kg (405,7 lb = 184 kg senza ABS).
- Peso: "curb weight" USA = moto con tutti i liquidi, serbatoio pieno oltre il 90% e kit attrezzi, cioè la stessa definizione del "peso in ordine di marcia" UE. Ho convertito da libbre e arrotondato; ho usato la versione con ABS (l'unica venduta in UE).
- Serbatoio delle generazioni precedenti: 4,0 gal USA = 15,1 L; ho messo 15 L, il valore della pagina UE attuale.
- Dubbi: (1) per il 2017–2023 manca `hp`, perché le schede USA non riportano la potenza e le vecchie pagine UE non sono più online (archive.org bloccato dal proxy). (2) Il peso sale a 414,5 lb (188 kg) nella scheda USA 2025; quella 2024 (OldVersionProductSpecSheetPDF) è un PDF a immagini e non sono riuscito a leggerlo, quindi non so se il passaggio a 188 kg avvenga nel 2024 o nel 2025. Ho scelto il 2024, perché è l'anno in cui arriva il KTRC. La pagina IT dice anche che la potenza è "invariata rispetto al modello precedente" (aggiornamento Euro5+). (3) Le schede USA 2017 e 2018 sono vuote (solo un modello di pagina), quindi la generazione 2017–2019 si basa sulla scheda 2019.
- Le schede australiane (kawasaki.com.au, ProductSpecSheetPDF) sono vuote per gli anni prima del 2025; quella 2025 è la versione LAMS da 51 PS, quindi non è utile.

### Z900
- https://www.kawasaki.it/it_it/Motorcycles/Supernaked/Z900_2026.html (stessi valori su Z900_2025.html): 948 cm³, 91,0 kW {124 CV}, 213 kg in ordine di marcia, 17,0 L. Generazione aggiornata dal 2025 (`from` 2025, a mia stima).

### Versys 650
- https://www.kawasaki.it/it_it/Motorcycles/Adventure_Tourer/Versys_650_2026.html (stessi valori su Versys650_2025.html): 649 cm³, 49,0 kW {67 CV}, 219 kg in ordine di marcia, 21,0 L. `from` 2022 (restyling con TFT e KTRC): è una mia stima, non verificata su fonte ufficiale.

## Honda (honda.it, schede "specifications")
Il peso indicato è "Peso con il pieno (kg)". Le pagine elencano più varianti e anni modello; ho scelto la variante base.
- SH125i – .../scooter/sh125i/specifications-and-price.html: variante "SH125i 2024 con Smart Top Box, parabrezza e paramani di serie": 124,5 cc, 13 CV (9,6 kW), 137 kg, 7 L, olio 1 L, 100/80-16 – 120/80-16. Le varianti 2026 e HRC riportano 125 cc e 138 kg; la Vetro 133,9 kg. Il peso comprende quindi il top box di serie.
- SH150i – .../sh150i/specifications-and-price.html: 157 cc (una variante 156,6), 16,9 CV (12,4 kW), 138 kg (una variante 134,1 kg), 7 L, olio 1 L.
- SH350i – .../sh350i/specifications.html: 330 cc, 29,4 CV (21,5 kW), 172 kg, 9,1 L, olio 1,85 L, 110/70-R16 – 130/70-R16. La stessa pagina scrive anche "110/70/R16".
- X-ADV – .../x-adv/specifications.html: 745 cc, 58,6 CV (43,1 kW), 237 kg (solo DCT), 13,2 L, olio 4 L, 120/70 R17 – 160/60 R15.
- NC750X – .../nc750x/specifications.html: 745 cc, 58,6 CV, 216 kg col cambio manuale (226 kg DCT), 14,1 L, olio 4,0 L.
- CB650R – .../street/cb650r/specifications-and-price.html: 649 cc, 95 CV (70 kW), 207 kg (stesso valore per tutte le varianti, E-Clutch inclusa), 15,4 L; la capacità olio non è indicata. Esiste anche una versione 35 kW.
- Forza 350 – .../forza-350/specifications.html: 330 cc, 29,2 CV (21,5 kW), 186 kg, 11,7 L, olio 1,8 L, 120/70 R15 – 140/70 R14. Un'altra variante scrive "120/70-15" e "140/70-14MC".
- Dubbio: la capacità olio Honda non dice se comprende il cambio filtro.

## Yamaha (yamaha-motor.eu/it, pagina renderizzata con browser)
Il peso indicato è "Peso in ordine di marcia (compresi serbatoi olio e carburante pieni)".
- MT-07 – https://www.yamaha-motor.eu/it/it/motorcycles/hyper-naked/pdp/mt-07/: 689 cc, 54,0 kW (73,4 CV), 183 kg col cambio manuale (186 kg Y-AMT), 14 L, "Quantità olio motore" 3,0 L. `from` 2025 (quarta generazione, come dice la pagina).
- Tracer 7 – .../sport-touring/pdp/tracer-7/: 689 cc, 54,0 kW → 73 CV, 203 kg col cambio manuale (206 kg Y-AMT), 18 L, olio 3,0 L. Dubbio su `from` 2025: anno in cui ho collocato la versione con Y-AMT; la generazione Tracer 7 nasce nel 2020/2021.
- XMAX 300 – .../scooters/sport/pdp/xmax-300-2025/: 292 cc, 20,6 kW (→ 28 CV), 183 kg, 13,2 L. `from` 2023, a mia stima. La scheda pro-user Yamaha indica invece 179 kg: non l'ho usata.
- NMAX 125 – factsheet ufficiale PDF 2021: https://cdn2.yamaha-motor.eu/prod/product-assets/2021/G125YM/Factsheets/2021-G125YM_it-IT.pdf: 125 cc, 9,0 kW (12,2 PS), 131 kg, 7,1 L. La gamma IT attuale ha solo la Tech MAX (132 kg secondo la pagina 2026, non letta direttamente).

## BMW
- R 1300 GS – https://www.bmw-motorrad.it/it/models/adventure/r1300gs/technicaldata.html: "1.300 cc" (come da fonte), 107 kW (145 CV), "Peso in ordine di marcia con pieno di benzina" 237 kg (nota 1), 19 L utili, 120/70 R19 – 170/60 R17. `from` 2024.

## KTM
- 390 Duke – https://www.ktm.com/it-it/models/naked-bike/2025-ktm-390-duke/specifiche-tecniche.html: 398,7 cm³, 45 PS, "Peso con pieno di carburante" 165 kg, olio "Motorex Formula 4T 15W/50". La pagina non riporta serbatoio né pneumatici. `from` 2024 (terza generazione).

## Modelli saltati
- **Honda Africa Twin (CRF1100L)**: honda.it ora presenta solo la CRF1150L (1.131 cc, 119 CV), un'altra generazione; la pagina ufficiale della CRF1100L non esiste più. Non inserita.
- **Ducati Monster (2021+)**: ducati.com/it/it/moto/monster/monster rimanda a "monster-v2", la nuova generazione con motore V2. La pagina della Monster 937 non esiste più. Saltato.
- **Vespa GTS 300, Vespa Primavera 125, Piaggio Beverly 300, Piaggio Liberty 125**: vespa.com e piaggio.com rispondono 403 "Access Denied" sia a curl sia al browser automatico.
- **Triumph Trident 660**: triumphmotorcycles.it risponde 403 Forbidden.
- **Benelli TRK 502, Leoncino 500**: benelli.com non risponde (connessione fallita, timeout del browser).
