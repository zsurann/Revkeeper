---
id: 400
title: "Mappa: Revkeeper solo come app installata"
labels: [wayfinder:map]
status: open
---

## Destination

Sul telefono Revkeeper si usa solo dalla schermata Home: il sito mostra una pagina di installazione (Android: "Scarica app" apre il popup di installazione; iPhone: riconosce il browser e dà le istruzioni giuste), e al primo avvio dell'app c'è il benvenuto (accesso con Google o più tardi, notifiche, prima moto). Costruito, testato e pubblicato.

## Notes

- **Design e animazioni coerenti con "Cruscotto"** (`design/tokens.css`, lo strumento a lancetta, Saira/Saira Condensed, ambra su scuro). Skill: frontend-design, ui-design-review per la revisione.
- Decisioni dal grilling iniziale: **da computer** l'app resta usabile nel browser (il blocco vale solo sui telefoni); **iPhone**: istruzioni per ogni browser che sa aggiungere alla Home (Safari, Chrome, Edge…), solo i browser che non possono (app chiuse come Instagram/Facebook/Gmail) chiedono di aprire Safari; **nessun trasferimento dati** dal browser all'app; benvenuto con **accesso Google / più tardi**, poi **notifiche**, poi **prima moto**.
- La mappa porta l'esecuzione: i `task` costruiscono, testano e pubblicano tramite PR. Vincoli: piani gratuiti, ponytail, italiano.
- Serve una via d'uscita per i test (E2E nel browser) che non sia visibile agli utenti.

## Decisions so far

- [Come riconoscere browser e app installata, e come installare su ogni telefono](401-come-riconoscere-e-installare.md): standalone + UA per il telefono (iPad = computer); Android popup con riserva manuale sempre presente; iPhone istruzioni per browser, Safari solo dai browser interni con "Copia link"; "già installata" rilevabile solo su Android.

- Grilling iniziale: computer = sito normale; iPhone = istruzioni per browser, Safari solo se il browser non può; niente migrazione dati; benvenuto = accesso, notifiche, prima moto.

## Not yet specified

- Firefox/Edge/Opera Android creano una scorciatoia che si apre come scheda: va accettata come "installata" o servono le istruzioni per Chrome? Da provare su telefono.
- Come tenere aggiornate le istruzioni iPhone quando Apple cambia le voci del menu Condividi.

## Out of scope

- Pubblicazione sugli store (Play Store tramite TWA, App Store).
- Trasferire i dati dal browser all'app installata (deciso: non serve).
