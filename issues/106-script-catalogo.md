---
id: 106
title: "Generare il catalogo da vPIC e aggiunte europee"
labels: [wayfinder:task]
status: open
assignee:
blocked_by: []
---

## Question

Script `scripts/build-catalog` che legge vPIC (una chiamata per marca e anno, con pause; marche italiane), ripulisce (via ATV/UTV, marche unite, varianti senza differenze tecniche unite con alias) e fonde `data/catalog-extra.json` (modelli europei mancanti). Produce `src/data/catalog.json`, controllato da un test (nessuna marca doppia, anni validi, peso del file ragionevole). Da rilanciare ogni anno.
