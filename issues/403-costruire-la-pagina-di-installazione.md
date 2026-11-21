---
id: 403
title: "Costruire la pagina di installazione e il blocco sui telefoni"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [401, 402]
---

## Question

Sul telefono, fuori dall'app installata, l'app mostra solo la pagina di installazione del prototipo approvato; da computer resta il sito. Con via d'uscita per i test, test E2E sui casi Android/iPhone/computer, PR e pubblicazione.

## Risoluzione

- `src/domain/platform.ts`: telefono, browser e browser interni dall'UA (iPad e tablet = computer); `isInstalled()` (standalone / `navigator.standalone`); via d'uscita `?browser=1`, ricordata su quel browser.
- `src/main.tsx`: sui telefoni fuori dall'app mostra solo `Install`; il service worker si registra comunque (serve al popup di Chrome).
- `src/installPrompt.ts`: `beforeinstallprompt` catturato prima di React, `prompt()` dal pulsante, `appinstalled`.
- `src/Install.tsx`: Android ("Scarica app": popup, se manca si aprono i passi del menu; Firefox/Edge vanno a Chrome); iPhone (passi per Safari 26, Safari precedente, Chrome, Edge, Firefox, accesi a turno con l'anello di tocco); browser interni ("Apri in Safari"/"Apri in Chrome" + "Copia link").
- Test: 2 unitari sull'UA; E2E con Playwright (iPhone Safari 26, iPhone Chrome, Instagram, iPhone installata, Android con e senza popup, computer).
