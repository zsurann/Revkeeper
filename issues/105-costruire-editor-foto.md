---
id: 105
title: "Costruire l'editor della foto"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [102]
---

## Question

Editor a schermo intero dopo la scelta della foto: pizzica/trascina con Pointer Events (e rotella/slider per chi non ha il touch), riquadro 16:9 con anteprima, conferma che ritaglia su canvas e comprime in JPEG 1600 px (`compressImage`), annulla. Test della matematica del ritaglio, prova a 390 px, deploy.

## Resolution

Fatto (deploy con la PR verso `main`).

- `src/domain/crop.ts`: la foto copre sempre il riquadro, zoom limitato tra 1 e 4×, spostamento nei limiti; `drawRect` usa la stessa posa per l'anteprima e per l'export a 1600 px. 2 test.
- `src/PhotoEditor.tsx`: dialogo a schermo intero con trascina e pizzica (Pointer Events, `touch-none`), rotella, barra di zoom, doppio tocco per ripartire, griglia dei terzi, Conferma che esporta JPEG 1600×900 (qualità 0,82), Annulla.
- `BikeForm`: scegliendo la foto si apre l'editor; il file input si azzera, così si può riscegliere la stessa foto. `compressImage` non serve più qui, perché l'export è già a 1600 px.

Verifiche: 26 test, build ok. E2E in Chromium a 390 px con una foto verticale: zoom 2×, trascinamento, Conferma → foto in scheda 1600×900; Annulla chiude; nessun errore in console.
