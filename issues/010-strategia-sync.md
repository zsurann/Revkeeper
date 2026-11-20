---
id: 10
title: "Strategia di sync local-first su Cloudflare"
labels: [wayfinder:research]
status: open
assignee:
blocked_by: []
---

## Question

Come sincronizzare i dati di IndexedDB (moto, letture km, voci, interventi, documenti, allegati) con D1 e R2 su Cloudflare per più dispositivi dello stesso utente: sync fatto a mano (last-write-wins per record con `updatedAt` e tombstone) oppure librerie (Replicache, TinyBase, RxDB, Dexie Cloud, PowerSync, ElectricSQL...); compatibilità con Workers e D1, costo, peso nel bundle. Allegati: upload su R2 con URL firmati e limiti del piano gratuito.
