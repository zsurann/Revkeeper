---
id: 7
title: "Design system Strumentazione: token, icone, manifest"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Trasformare la variante Strumentazione in token Tailwind (colori, tipi, raggi, ombre), in specifiche dei componenti con le animazioni (contachilometri a rulli, arco, barra di avanzamento, pulsante principale) e in icona dell'app, manifest e splash screen. Skill: `mobile-design-system`, `hzblj-skills:tailwind`, `hzblj-skills:ui-motion`, `codesign` per l'icona.

## Resolution

Fatto. Token Tailwind v4 in [design/tokens.css](../design/tokens.css), specifiche di componenti e motion in [design/SPEC.md](../design/SPEC.md), icona in [design/icon.svg](../design/icon.svg) con PNG 192, 512 e 180 in `design/icons/`, manifest nella SPEC. Contrasti verificati (minimo 5,2:1). Scelte: niente GSAP nell'MVP, bastano transizioni CSS; niente immagini splash per ogni dispositivo, bastano icona e colore di sfondo.
