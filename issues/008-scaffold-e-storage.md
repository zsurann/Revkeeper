---
id: 8
title: "Scaffold PWA e storage locale"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [7]
---

## Question

Creare il progetto Vite + React + TypeScript + Tailwind con il plugin PWA (service worker, manifest, uso offline), lo storage IndexedDB secondo il modello del ticket "Modello dati del garage" e i calcoli di scadenza e stima, con i test. Skill: `hzblj-skills:type-safety`, `hzblj-skills:tailwind`, `perf-profiler`.

## Resolution

Fatto. Vite 8, React 19, TypeScript, Tailwind 4 con i token Strumentazione e vite-plugin-pwa 2 (manifest, service worker, font in cache). Dipendenze runtime: solo `react`, `react-dom`, `idb`.

- `src/domain/types.ts`: il modello del ticket "Modello dati del garage", con `updatedAt` e `deletedAt` pronti per il sync.
- `src/domain/due.ts`: `nextDue` (dall'ultimo intervento, `firstKm` per il primo, prima tra km e data, stima a 90 giorni), `documentStatus`, soglie 500 km / 30 giorni.
- `src/db.ts`: IndexedDB con 6 store, `save` (UUID e `updatedAt`), cancellazione logica, `addReading` che rifiuta km in calo.
- `src/App.tsx` + `src/Odometer.tsx`: scheletro funzionante (prima moto, aggiorna km, contachilometri a rulli).

Verifiche: 9 test passati (calcoli e storage su fake-indexeddb), `tsc` e build ok, provato in Chromium a 390 px (salvataggio, rulli, errore sui km in calo, service worker registrato, nessun errore in console). `npm audit`: 4 vulnerabilità moderate solo negli strumenti di build (glob e minimatch dentro workbox-build); nessuna nel codice che finisce nell'app.
