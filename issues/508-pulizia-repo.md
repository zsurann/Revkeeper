---
id: 508
title: "Togliere dal repo i file generati"
labels: [wayfinder:task]
status: closed
---

## Question

Sono committati `.playwright-mcp/` (26 log e snapshot dei test E2E) e `tsconfig.tsbuildinfo`: rimuoverli e aggiungerli a `.gitignore`. `.env` contiene solo valori pubblici (client ID Google, chiave pubblica VAPID, già presenti in `wrangler.toml`): può restare. PR.

## Risoluzione

- `.gitignore` ora contiene `.playwright-mcp/` e `*.tsbuildinfo`.
- Va tolto dall'indice git: `.playwright-mcp/` (25 file) e `tsconfig.tsbuildinfo`, con `git rm -r --cached .playwright-mcp tsconfig.tsbuildinfo`. L'API usata per pubblicare non può cancellare file, quindi questo comando lo lancia lo sviluppatore sul branch della PR.
- `.env` resta: contiene solo valori pubblici.
- 51 test verdi, typecheck verde.
