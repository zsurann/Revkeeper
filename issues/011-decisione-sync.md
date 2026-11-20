---
id: 11
title: "Scelta della soluzione di sync e degli allegati"
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [10]
---

## Question

Con le opzioni della ricerca sulla strategia di sync: quale approccio adottiamo, come si risolvono i conflitti (es. km inseriti da due telefoni) e cosa succede al primo login con dati già presenti in locale?

## Resolution

- **Sync scritto a mano, last-write-wins per record**, con il protocollo della ricerca sulla strategia di sync (tabella `records`, cursore `rev`, push a lotti, pull a pagine). Rischio accettato: una modifica offline sullo stesso record da due telefoni può perdersi.
- **Primo login**: si fa il push di tutto il locale, poi il pull completo. Se due moto hanno la stessa marca, lo stesso modello e la stessa targa (targa vuota = nessun confronto), l'app chiede "Unisci?". Unire significa spostare i record figli sulla moto che resta e marcare l'altra come cancellata.
- **Sync automatico**: dopo ogni modifica (attesa di 2 secondi), all'apertura dell'app e all'evento `online`.
- **Allegati**: copia locale in IndexedDB più copia su R2. Sugli altri dispositivi si scaricano su richiesta, quando li apri, e restano in cache.
