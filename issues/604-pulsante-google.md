---
id: 604
title: "Pulsante Google: caricarlo al tocco o dichiararlo"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Lo script di Google Identity Services si carica alla prima schermata, prima di ogni scelta: Google riceve IP e user-agent anche da chi tocca "Più tardi". Si carica solo dopo un tocco (un passo in più per l'utente) o si dichiara nell'informativa?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: **si dichiara nell'informativa**. Il pulsante resta caricato subito; `src/Legal.tsx` dice che alla prima schermata il browser contatta Google per mostrare il pulsante (IP e user-agent), anche senza accesso.
