---
id: 404
title: "Costruire il benvenuto al primo avvio"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [402]
---

## Question

Al primo avvio dell'app: accesso con Google o "più tardi", poi notifiche, poi la prima moto, come nel prototipo approvato; non si ripresenta ai successivi avvii. Test, PR e pubblicazione.

## Risoluzione

- `src/Welcome.tsx`: al primo avvio senza moto (flag `revkeeper.welcomed`). Accesso con il pulsante ufficiale Google (estratto in `src/GoogleButton.tsx`, usato anche da Account) o "Più tardi"; promemoria solo dopo l'accesso (li calcola il server) e se il browser li supporta, con `enablePush` estratta da Notifications; ultima tappa "Aggiungi moto" → scheda moto, saltata se l'accesso ha portato moto già salvate.
- Il quadrante è ora il componente `Dial`, condiviso da cruscotto, installazione e benvenuto.
- E2E: benvenuto → Più tardi → Aggiungi moto → scheda moto; ricaricando il benvenuto non torna.
