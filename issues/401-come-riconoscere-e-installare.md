---
id: 401
title: "Come riconoscere browser e app installata, e come installare su ogni telefono"
labels: [wayfinder:research]
status: closed
assignee: claude
blocked_by: []
---

## Question

Fatti su cui si basano pagina di installazione e blocco:
- come capire se la pagina gira come app installata (Android e iPhone) e se è un telefono;
- Android: quando arriva `beforeinstallprompt` (Chrome, Samsung Internet, Edge, Firefox, Opera), cosa serve al manifest/service worker attuale, cosa succede se l'utente rifiuta, e i passi manuali dove il popup non c'è;
- iPhone: riconoscere Safari, Chrome, Edge, Firefox e i browser interni delle app (Instagram, Facebook, Gmail, Google, Telegram, WhatsApp…); quali possono aggiungere alla Home (iOS 16.4+, iOS 26) e i passi esatti con le voci in italiano ("Condividi", "Visualizza altro", "Aggiungi alla schermata Home"…); come aprire il sito in Safari da un browser interno;
- se da browser si può sapere che l'app è già installata.

## Risoluzione

Dettagli e fonti: [research/401-installazione-pwa.md](research/401-installazione-pwa.md).

- **App installata**: `matchMedia('(display-mode: standalone)')` (Android e iOS 12.2+), con `navigator.standalone` come riserva su iOS.
- **Telefono**: UA (`Android.*Mobile|iPhone|iPod`), più `userAgentData.mobile` dove esiste. iPad e tablet Android si trattano come computer (sito normale).
- **Android**: `beforeinstallprompt` in Chrome, Samsung Internet e Opera (non Firefox), da catturare in `main.tsx` prima di React, con `preventDefault()` e poi `prompt()` dal pulsante. Al primo accesso può non arrivare (serve un tocco e 30 s), e dopo un rifiuto non è garantito: serve sempre la riserva con i passi del menu (Chrome: ⋮ → "Installa e crea scorciatoia" → "Installa"). Firefox, Edge e Opera creano spesso una scorciatoia che si apre come scheda: da verificare.
- **iPhone**: Safari, Chrome, Edge, Firefox e Orion aggiungono alla Home dal 16.4. Su iOS 26 Safari: "…" → Condividi → "Aggiungi alla schermata Home" (se manca, "Modifica azioni") → "Apri come app web" acceso → Aggiungi. Gli altri browser cambiano solo come si arriva a Condividi.
- **Browser interni** (Instagram, Facebook, TikTok, LinkedIn, app Google…): non possono. Si apre Safari con `x-safari-https://` (non documentato) più il pulsante "Copia link". Il mini-Safari interno non si distingue da Safari, quindi le istruzioni Safari dicono sempre "se non vedi la voce, apri in Safari".
- **App già installata**: si rileva solo su Android (Chrome e Samsung), con `getInstalledRelatedApps` più `id` e `related_applications` nel manifest. Su iOS è impossibile: la pagina dice "Già aggiunta? Aprila dall'icona".
- **Notifiche su iOS**: solo nell'app installata, con il permesso chiesto da un tocco. Il passo notifiche va quindi nel benvenuto.
- **Da verificare su telefono vero**: le voci in italiano di Chrome, Edge e Firefox iOS e di Samsung Internet, e gli UA dei browser interni.
