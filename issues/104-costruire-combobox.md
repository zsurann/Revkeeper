---
id: 104
title: "Costruire i menu a tendina della scheda moto"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [102, 106]
---

## Question

Componente combobox accessibile (ARIA combobox/listbox, tastiera, testo libero), usato per marca, modello, anno, misure gomme, olio, liquido freni e candele; caricamento modelli da catalogo + vPIC; precompilazione dei dati tecnici modificabili. Test, prova a 390 px, deploy.

## Resolution

Fatto (in PR verso `main`).

- `src/Combobox.tsx`: menu a tendina con ricerca come nel prototipo approvato. ARIA combobox/listbox, `aria-activedescendant`; si apre al tocco, filtra mentre scrivi anche sugli alias, nome evidenziato in un solo blocco, «Usa …» solo senza risultati, frecce/Invio/Esc, scelta su `pointerdown` (prima del blur). Il valore resta nel form con `name`, quindi `bikeFromForm` non cambia.
- `src/domain/catalog.ts`: `brands()` (popolari prima), `modelsOf(marca)` con gli anni come suggerimento, `yearsOf(marca, modello)` dal più recente (dal 1970 se il modello non è nel catalogo), `specsOf(marca, modello, anno)` per generazione. Maiuscole, spazi e trattini non contano.
- `src/domain/parts.ts`: misure gomme comuni, gradazioni e tipi d'olio, liquidi freni.
- Scheda moto: marca → modello (disattivato finché manca la marca) → anno (disattivato finché manca il modello); gomme, olio, gradazione e liquido freni sono menu; scelto modello o anno, `specsOf` precompila gomme, gradazione e quantità d'olio, liquido freni, cilindrata, potenza, peso e serbatoio, tutti modificabili (gruppi rimontati con `key`). Tolto il vecchio elenco `BRANDS`.

Verifiche: 30 test, build ok. E2E in Chromium a 390 px: "kawa" → solo Kawasaki; il modello è disattivato finché non si sceglie la marca; "z65" → Z650 (2017–oggi), Z650 S, Z650RS; anni da 2026 a 2017; gomma scelta dal menu; testo libero «Usa 999/99»; salvataggio e riapertura conservano tutti i valori; nessun errore.

Non provato: la precompilazione dei dati tecnici, perché il catalogo non ha ancora specifiche (ticket "Specifiche tecniche dei 21 modelli").
