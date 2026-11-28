---
id: 702
title: "Migrazioni del database nella pipeline"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 700
blocked_by: []
---

## Question

Oggi `d1 migrations apply` si lancia a mano: se il codice arriva prima della migrazione, l'API dà 500 (audit 04, n. 17). Applicarle da sole in GitHub Actions prima del deploy del cron, o restare a mano con un controllo che blocca il merge?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: **automatiche in GitHub Actions** al merge su main, prima della pubblicazione del cron. Il token `CLOUDFLARE_API_TOKEN` deve avere anche D1:Edit.
