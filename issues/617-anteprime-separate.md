---
id: 617
title: "Anteprime dei branch sui dati di produzione"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 600
blocked_by: [616]
---

## Question

Ogni push su un branch pubblica un'anteprima di Pages collegata a D1 e R2 di produzione: codice non approvato può scrivere sui dati veri. Database separati, anteprime spente o lasciare così?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: **database e file separati**. Creati il D1 `revkeeper-preview` (migrazioni 0001–0006 applicate) e il bucket R2 `revkeeper-files-preview` (UE); `[env.preview]` in `wrangler.toml` li collega alle anteprime, con le stesse variabili pubbliche. Le anteprime non hanno la chiave VAPID privata, quindi niente notifiche vere da lì (come prima).
