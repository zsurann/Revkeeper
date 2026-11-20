---
id: 103
title: "Forma e contenuto del catalogo curato"
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [101]
---

## Question

Con quello che vPIC copre e non copre: quali marche e modelli entrano nel catalogo curato, con quali campi (anni di produzione, cilindrata, potenza, peso, serbatoio, gomme, categoria, legame con `src/data/intervals.json`), come si fondono catalogo e vPIC nel menu (duplicati, ordine) e chi verifica i dati.

## Resolution

- **Ampiezza**: vPIC ripulito + aggiunte europee. Si tengono le circa 40 marche vendute in Italia (vPIC le ha in massima parte; marche doppie unite, es. PIAGGIO/VESPA, KTM/KTMMEX). Si tolgono ATV, UTV, quad e voci aggregate. Si aggiungono a mano i modelli solo europei (Honda SH, scooter Piaggio, Kymco, SYM e simili).
- **Varianti**: un modello unico quando le varianti non cambiano i dati tecnici mostrati in scheda (cilindrata, potenza, peso, serbatoio, gomme, olio): "Z650" e "Z650 ABS" sono una voce. Se cambiano, voci separate (SH125 e SH150). I nomi con le varianti restano come alias per la ricerca.
- **Dati tecnici precompilati**: Kawasaki Z650 dell'utente + i 20 modelli più venduti in Italia, dalle schede ufficiali dei costruttori con l'URL della fonte. Gli altri modelli si compilano a mano.
- **Forma**: un file `src/data/catalog.json` generato da uno script (`scripts/build-catalog`) che fonde l'estrazione da vPIC e un file curato a mano (`data/catalog-extra.json`, con aggiunte, unioni e specifiche). Ogni modello ha marca, nome, alias, anni (da–a), categoria, specifiche facoltative con fonte e un `intervalsRef` facoltativo verso `intervals.json`. Ordine: marche popolari in Italia prima, poi alfabetico; modelli alfabetici.
