---
id: 306
title: "Catalogo diviso per marca nell'app"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [305]
---

## Question

Il build produce un file JSON per marca più l'elenco delle marche; l'app scarica i modelli della marca scelta, li tiene in cache offline e il menu funziona come oggi. Peso del bundle e prova offline verificati.

## Resolution

Fatto.

- `build-catalog.ts` scrive `src/data/catalog/_brands.json` (marche e slug, 4 KB) e un file `b-<marca>.json` per ognuna delle 121 marche (il più grande, Honda, è 59 KB); `catalog.json` è eliminato.
- `src/domain/catalog.ts` usa `import.meta.glob`: ogni marca diventa un chunk JS separato, caricato da `loadBrand(marca)`; `modelsOf`, `yearsOf` e `specsOf` lavorano sulle marche già caricate. `BikeForm` carica la marca scelta (anche quella di una moto in modifica) e ridisegna i menu quando arriva.
- Service worker: i chunk delle marche **non** sono precaricati (`globIgnores`), si mettono in cache `CacheFirst` alla prima scelta. Precache da 129 voci (792 KB) a 8 (330 KB); bundle principale da 711 KB a 305 KB (93 KB gzip).

Verifiche: 35 test (indice piccolo, nessun file di marca oltre 150 KB, slug unici). E2E: all'avvio nessun file di marca; scegliendo Kawasaki si scarica solo `b-kawasaki` e la Z650 compila 649 cc e 68 CV; poi offline, dopo un ricaricamento, i modelli Kawasaki sono ancora disponibili.
