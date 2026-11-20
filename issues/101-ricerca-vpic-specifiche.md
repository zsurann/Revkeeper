---
id: 101
title: "vPIC per le moto e fonti gratuite delle specifiche"
labels: [wayfinder:research]
status: closed
assignee: claude
blocked_by: []
---

## Question

Come usare vPIC (vpic.nhtsa.dot.gov) per marche, modelli e anni delle moto: endpoint esatti (GetMakesForVehicleType/motorcycle, GetModelsForMakeYear con vehicletype), CORS dal browser, limiti, formato, copertura reale dei modelli europei (Kawasaki Z650, Honda SH, Vespa GTS, Benelli TRK, Ducati Monster, Aprilia). Serve passare dal Worker con cache? E per i dati tecnici (cilindrata, potenza, peso, serbatoio, misure gomme): esistono fonti gratuite con licenza che ne permetta l'uso, o vanno raccolte a mano dalle schede ufficiali dei costruttori?

## Resolution

vPIC funziona: niente chiave, CORS aperto, 1.703 marche moto (quasi tutte custom USA), una chiamata per ogni anno, latenza 0,3–2 s. Copre Z650 (2017–2025), Africa Twin, Monster, TRK, MT-07 e R 1250 GS; **manca Honda SH** e mancano scooter e modelli solo europei. Nessuna variante ABS né codice telaio; ci sono nomi sporchi e marche doppie. **Raccomandazione: non chiamarlo dall'app.** Uno script lo legge una volta e genera un JSON statico pulito, servito come asset (gratis e offline), unito al catalogo curato; la tendina accetta sempre testo libero. **Specifiche:** nessuna fonte libera utilizzabile (Wikidata CC0 è quasi vuoto, il resto ha licenze incompatibili o è a pagamento): si inseriscono a mano dalle schede ufficiali, con URL, solo per i modelli del catalogo; per gli altri l'utente compila. Dettagli: [research/101-vpic-specifiche.md](research/101-vpic-specifiche.md).
