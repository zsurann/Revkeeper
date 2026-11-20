---
id: 14
title: "Schermate garage e scheda moto"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Costruire il garage (più moto, cambio della moto attiva con il BikeSwitcher, aggiunta e modifica) e la scheda moto completa (dati base, foto, gomme e pressioni, liquidi, dati tecnici), nello stile di `design/SPEC.md`. Selettore: elenco di marche curato e modello come testo libero.

## Resolution

Fatto.

- `src/Garage.tsx`: elenco delle moto con foto, anno e km; la moto attiva è evidenziata; "+ Aggiungi moto".
- `src/BikeForm.tsx`: crea e modifica la scheda completa (foto, dati base, gomme e pressioni, liquidi, dati tecnici) a sezioni richiudibili. Marche da elenco curato (`datalist`), modello libero.
- `src/domain/bikeForm.ts`: lettura del form con virgola decimale e gruppi vuoti scartati, testata.
- `src/image.ts`: foto in JPEG a 1600 px, riusabile per gli allegati.
- Moto attiva ricordata per dispositivo in `localStorage`, con fallback alla prima moto.

I campi numerici sono `type="text"` con `inputMode`, perché `type="number"` rifiuta la virgola. Verifiche: 11 test passati, build ok. In Chromium a 390 px: due moto create (una con foto), cambio moto, persistenza dopo il reload, modifica che conserva gomme e pressioni, nessun errore in console.
