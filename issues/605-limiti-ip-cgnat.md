---
id: 605
title: "Limiti per IP e operatori mobili (CGNAT)"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 600
blocked_by: [601]
---

## Question

20 login ogni 10 minuti e 1500 sync al giorno per IPv4 colpiscono utenti veri dietro lo stesso IP dell'operatore. Su cosa contare: IP /24, sessione, cookie dispositivo, Turnstile di Cloudflare per creare ospiti?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: la **sincronizzazione si conta per utente** (sessione), non più per IP; il **login per IP sale a 60 ogni 10 minuti**. Il freno globale e il tetto di record di [Gli ospiti sul server](601-ospiti-e-tetti.md) coprono l'abuso. Niente Turnstile.
