---
id: 508
title: "Togliere dal repo i file generati"
labels: [wayfinder:task]
status: open
---

## Question

Sono committati `.playwright-mcp/` (26 log e snapshot dei test E2E) e `tsconfig.tsbuildinfo`: rimuoverli e aggiungerli a `.gitignore`. `.env` contiene solo valori pubblici (client ID Google, chiave pubblica VAPID, già presenti in `wrangler.toml`): può restare. PR.
