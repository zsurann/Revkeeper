---
id: 305
title: "Importare Traficom e DGT nel catalogo"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Script che scarica i dati Traficom e DGT delle moto, normalizza i nomi (regole della ricerca sugli open data), raggruppa per marca, famiglia e cilindrata, ricava gli anni e i dati tecnici (cc, kW → CV, massa a vuoto) e li fonde con vPIC e catalog-extra.json, rispettando le specifiche verificate già presenti. Test su casi noti (Z650, SH125, codici interni come WW125 = PCX).

## Resolution

Fatto: **3.758 modelli di 121 marche** (prima 1.331 di 33).

- `scripts/import-eu.ts` scarica Traficom (zip da 206 MB, letto in streaming, solo classi L1/L3 con nome commerciale) e gli ultimi 12 mesi dei microdati DGT, e scrive `data/eu-models.json`. Posizioni DGT tarate su un campione: data 0–8, marca 17–47, modello 47–69, cilindrata 94–100, massa 105–111, kW 224–235, posti 236 (2 = moto). Le auto a 2 posti si scartano per massa (oltre 400 kg) o, se la massa manca, perché la marca non è tra le moto finlandesi.
- `src/domain/euImport.ts` (testato): nomi normalizzati (nome multiplo → il più corto, suffissi ABS/A2/35KW/E5…, lettere Honda dopo il numero, nome commerciale tra parentesi, "SH 125 I" → SH125); gruppi per marca, nome e cilindrata, divisi se ci sono più di 5 anni di buco (Z650 1978 ≠ Z650 2017); anni senza l'1% di code; potenza piena (le versioni A2 non la abbassano); massa mediana; gruppi con almeno 5 veicoli; marche con almeno 50.
- `build-catalog.ts` unisce vPIC, registri europei e `catalog-extra.json`. Le aggiunte manuali vincono, quindi le specifiche ufficiali (Z650) restano; gli altri modelli ricevono le specifiche dai registri, citando la fonte. Le Vespa registrate come "Piaggio VESPA …" passano alla marca Vespa.
- App: la nota sotto i dati tecnici indica la fonte ("scheda ufficiale" oppure "dati di immatricolazione Traficom/DGT"); in Account c'è l'attribuzione delle fonti (Traficom CC BY 4.0).

Verifiche: 35 test; E2E: Zontes → modelli 125/350 con dati precompilati; Kawasaki Z650 conserva la scheda ufficiale (68 CV).

Limiti: catalogo da 483 KB in un solo file (bundle da 139 KB compressi) finché non arriva il ticket "Catalogo diviso per marca nell'app"; ci sono nomi poco leggibili ("Granturismo 200L-M3"), qualche marca doppia per maiuscole ("SKYTeam"/"Skyteam") e modelli Traficom senza nome commerciale esclusi (moto vecchie).
