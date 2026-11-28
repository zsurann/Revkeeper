---
id: 613
title: "Accessibilità: focus nei fogli e al cambio pagina"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Fogli dal basso senza trappola del focus (`src/ui.tsx:133-161`, `inert` sullo sfondo); al cambio pagina focus sul body e `<title>` fisso (`src/App.tsx:386-393`); campo "Nuova voce" senza etichetta, Cruscotto senza h1, `role=alert` su un pulsante, focus invisibile sugli input file. Dettagli in [06-a11y-ui-legale.md](../docs/audit-2026-11-28/06-a11y-ui-legale.md).

## Risoluzione

Trappola del Tab nei fogli (`src/ui.tsx`); al cambio pagina `<title>` e focus sul titolo (`src/App.tsx`); h1 nascosto nel Cruscotto; etichetta su "Nuova voce"; niente `role=alert` sul pulsante; anello di focus sui caricamenti di file.
