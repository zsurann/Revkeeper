---
id: 610
title: "Input del server: 400 invece di 500, quota atomica"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: [601]
---

## Question

Corpo `null` o `credential` non stringa danno 500 e un evento Sentry (`server/api.ts:71,610`, `server/google.ts:10,35`); chiavi ignote accettate nei record (`server/schema.ts:160-166`); `reserve` fa UPDATE e INSERT separati e `users.bytes` può scendere (`server/api.ts:276-287`). Validare e rendere atomica la quota; i tetti vengono da [Gli ospiti sul server](601-ospiti-e-tetti.md). Test.

Con le decisioni di [Gli ospiti sul server](601-ospiti-e-tetti.md): `PUT` file vietato agli ospiti, tetto di record 500 / 20.000, nessun nuovo ospite oltre l'80% di D1 o R2.
