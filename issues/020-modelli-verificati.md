---
id: 20
title: "Modelli verificati dai libretti ufficiali"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Riempire `models` in `src/data/intervals.json` con i modelli più diffusi in Italia, ognuno con gli intervalli trascritti dal libretto ufficiale e il campo `source` (titolo, edizione, pagina, URL, data di verifica). Partire dai modelli dell'utente (Honda Africa Twin CRF1100L) e dai più venduti (Honda SH, Yamaha MT-07 e Tracer 7, BMW R 1300 GS, Benelli TRK 502, Vespa GTS, Kawasaki Z650, Ducati Monster). Un modello senza fonte verificabile non entra.

## Resolution

Prima tornata: 4 modelli con fonte ufficiale (dettagli e pagine lette in [research/020-modelli-verificati.md](research/020-modelli-verificati.md)).

- **Kawasaki Z650** (la moto dell'utente): tre voci perché Kawasaki ha cambiato il programma: 2017–2019 (filtro aria 18.000 km, pneumatici 12.000 km / 12 mesi), 2020–2021 (filtro aria 12.000), 2022–2023 (filtro aria 24.000). In comune: olio e filtro a 1.000 km e poi ogni 12.000 km o 12 mesi, candele 12.000, valvole 24.000, liquido freni 24.000 km o 24 mesi, liquido di raffreddamento 36.000 km o 36 mesi, catena lubrificata ogni 600 km e regolata ogni 1.000. Fonte: manuali ufficiali su kawasaki-onlinetechinfo.net (edizione US con i km).
- **Honda CRF1100L Africa Twin** dal 2025 (libretto europeo 2025, pagine 253–254).
- Saltati per tempo: Honda SH, Yamaha MT-07 e Tracer 7, BMW R 1300 GS, Vespa GTS 300, Benelli TRK 502, Ducati Monster.

Cambi nel codice: il resolver usa la chiave voce+azione, così una parte può avere più scadenze (catena: lubrificazione e regolazione); l'etichetta aggiunge l'azione quando serve. In "Modifica intervalli" compare "Usa gli intervalli del libretto" per le moto create prima. A parità di stato la home ordina per km mancanti: per una Z650 2017 la prima scadenza è la catena a 600 km. Test: 22 passati (compresi i valori della Z650 e la fonte obbligatoria per ogni modello).
