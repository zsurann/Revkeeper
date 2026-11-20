---
id: 4
title: "Modello dati del garage"
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [1]
---

## Question

Quali entità e campi servono: Moto (scheda completa), Rilevazione km, Voce di manutenzione (intervallo km/mesi, origine preset o modello), Intervento (data, km, costo, officina, note, foto), Documento/Scadenza (assicurazione, bollo, revisione)? Come si calcola "prossima scadenza" (prima tra km e data) e come si stimano i km futuri per prevederla?

## Resolution

Entità (IndexedDB, una store per tipo, id stringa casuale, `bikeId` sui figli):

- **Moto**: marca, modello, anno, targa, telaio, foto, km e data iniziali, `modelRef` facoltativo (id nel dataset intervalli), `category`. In più: **gomme** (misure anteriore e posteriore, pressioni da solo e in due), **liquidi** (olio: tipo, gradazione, quantità; liquido freni; candele), **dati tecnici** (cilindrata, potenza, peso, serbatoio, consumo medio). Ricambi preferiti: no.
- **Lettura km**: data, km totali letti sul cruscotto. Nessun rifornimento e nessun viaggio. Vincolo: i km non scendono rispetto alla lettura precedente.
- **Voce di manutenzione**: `item`, `action`, `km?`, `months?` (almeno uno), `firstKm?`, `origin` (`model`, `preset` o `user`), soglie modificabili.
- **Intervento**: data, km, una o più voci fatte, note, costo totale più ricambi e manodopera, allegati (foto e scontrini). Chi l'ha fatto: no.
- **Documento**: tipo `assicurazione`, `bollo` o `revisione`, scadenza, allegati (foto o PDF). Le scadenze libere sono escluse (l'utente non le ha scelte).

Calcoli:

- **Prossima scadenza** di una voce = ultimo intervento che la contiene + intervallo (km e/o mesi); se non c'è, partono i km e la data iniziali della moto. Vale quella che arriva prima tra km e data.
- **Stima della data** per km = oggi + (km mancanti ÷ media km al giorno degli ultimi 90 giorni). Con meno di 2 letture in 90 giorni non c'è stima: vale solo la data fissa.
- **Stato**: ok, *in scadenza* (ambra) entro 500 km o 30 giorni, *scaduta* (rosso) oltre. Soglie modificabili.

Da confermare: se l'utente vuole anche scadenze libere. Assunzione: no.
