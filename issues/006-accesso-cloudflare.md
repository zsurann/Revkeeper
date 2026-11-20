---
id: 6
title: "Verificare accesso account Cloudflare"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Il connettore Cloudflare di questa sessione ha accesso a un account utilizzabile per Pages, Workers, D1 e KV? Annotare l'account, i limiti e cosa manca (token per il deploy da CLI/CI).

## Resolution

Il connettore Cloudflare della sessione vede un account già in uso: 8 Worker (tra cui `turni-push` e `turni-sync`, un precedente simile di push e sync) e 2 database D1 (`lavori`, `cubo-facile` in giurisdizione `eu`). Il server MCP è deprecato e può creare D1, KV e R2, ma **non può fare il deploy** di Worker o Pages.

Cosa manca:
- **R2 non è attivo**: l'utente deve abilitarlo dalla dashboard Cloudflare (R2, piano gratuito; può chiedere una carta). Serve per gli allegati.
- **Token API per `wrangler`**: nessuna credenziale nella sessione; `api.cloudflare.com` è raggiungibile. Al momento del deploy si chiede con il modulo sicuro un token con i permessi Workers Scripts, Pages, D1 e R2 in modifica.
- Il D1 di Revkeeper va creato in giurisdizione `eu`, come `cubo-facile`.
