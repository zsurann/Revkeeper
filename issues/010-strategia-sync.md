---
id: 10
title: "Strategia di sync local-first su Cloudflare"
labels: [wayfinder:research]
status: closed
assignee:
blocked_by: []
---

## Question

Come sincronizzare i dati di IndexedDB (moto, letture km, voci, interventi, documenti, allegati) con D1 e R2 su Cloudflare per più dispositivi dello stesso utente: sync fatto a mano (last-write-wins per record con `updatedAt` e tombstone) oppure librerie (Replicache, TinyBase, RxDB, Dexie Cloud, PowerSync, ElectricSQL...); compatibilità con Workers e D1, costo, peso nel bundle. Allegati: upload su R2 con URL firmati e limiti del piano gratuito.

## Resolution

Nessuna libreria di sync funziona con D1 senza un server suo o senza riscrivere lo storage. Raccomandazione: **sync fatto a mano**, senza dipendenze. Una tabella `records` con i dati in JSON, last-write-wins per record su `updatedAt` (spareggio su `deviceId`), tombstone permanenti, cursore `rev` assegnato dal server. `POST /sync/push` a lotti di 50 in un `DB.batch`, `GET /sync/pull?since=rev` a pagine da 500. Id UUID; letture km solo inserimenti. Allegati: passano dal Worker con il binding R2 (`PUT`/`GET /files/:id`), tetto 15 MB, foto compresse sul telefono in JPEG (lato lungo 1600 px, circa 300 KB). Rischio: last-write-wins sul record intero può perdere una modifica offline fatta da due telefoni sullo stesso record. Dettagli: [research/010-strategia-sync.md](research/010-strategia-sync.md).
