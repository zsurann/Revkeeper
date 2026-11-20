# 020 — Modelli verificati dai libretti ufficiali

Data di verifica: 2026-11-20. Dati in `research/020-models.json` (4 voci). Ogni numero è stato letto
sull'immagine della tabella di manutenzione del libretto ufficiale, non su forum o siti di riepilogo.

## Kawasaki Z650 (priorità: moto dell'utente, MY2017)

Fonte: portale ufficiale Kawasaki `kawasaki-onlinetechinfo.net` (sezione Manuals, accesso guest).
Il sito, da guest, propone solo l'edizione **US English**; le tabelle riportano però i km
(`× 1 000 km`) accanto alle miglia, quindi i km vengono direttamente dalla fonte. Le edizioni EU/italiane
non sono raggiungibili da guest (il filtro paese resta su U.S.A.).

Lette le pagine "Periodic Maintenance" di cinque libretti:

| Anno | Libretto | Pagine stampate | Esito |
|---|---|---|---|
| 2017 | 99987-1928-01 (ER650G/H) | 101–105 | letto per intero |
| 2019 | 99987-0072 (ER650G/H) | 103–107 | identico al 2017 |
| 2020 | 99803-0033 (ER650K/L) | 121–125 | letto per intero |
| 2021 | 99803-0142 (ER650K/L) | 122–125 | come il 2020, ma senza le righe gomme e catena |
| 2022 | 99803-0231 (ER650K/L) | 121–124 | letto per intero |
| 2023 | 99803-0344-01 (ER650N/P) | 124–127 | identico al 2022 |

URL: `https://www.kawasaki-onlinetechinfo.net/dispeBook?file=<n. libretto>&mark=<codice>&manual_kind=OM&model_year=<anno>&lang_code=EN`
(es. 2017: `file=99987-1928&mark=ER650GHF&model_year=2017`). Il 2018 (99987-1993) non l'ho letto:
sta tra due edizioni identiche.

Le tabelle **non sono uguali** tra gli anni, per questo le voci sono tre:

- `kawasaki.z650.2017` (2017–2019). Filtro aria sostituito ogni **18 000 km**. Ruote/gomme ispezionate ogni 12 000 km / 1 anno.
- `kawasaki.z650.2020` (2020–2021). Filtro aria ogni **12 000 km**. Il 2020 riporta anche ruote/gomme
  ogni 12 000 km / 1 anno; nel 2021 la riga è sparita dalla tabella. Per tenere la voce valida per
  entrambi gli anni, `tyres` l'ho omesso.
- `kawasaki.z650.2022` (2022–2023). Filtro aria ogni **24 000 km**. Nella tabella non ci sono gomme né
  catena (lubrificazione e gioco). La catena compare nei "Daily Checks" (2023, p. 121): "Slack: every
  1000 km, Lubricate: every 600 km". Nel 2022 ho trovato la stessa frase nel testo, ma non ho
  guardato l'immagine della pagina.

Uguale in tutte le edizioni:
- olio motore + filtro: il primo a 1 000 km, poi ogni 12 000 km o 1 anno;
- candele ogni 12 000 km;
- gioco valvole ogni 24 000 km;
- liquido freni ogni 24 000 km o 2 anni;
- refrigerante ogni 36 000 km o 3 anni.

Ambiguità:
- Kawasaki indica la catena come "inspection" (condizione di lubrificazione ogni 600 km, gioco ogni
  1 000 km). Nel JSON l'ho resa come `lube` 600 e `adjust` 1 000, cioè lubrificare o regolare se serve.
- Il filtro aria ha la nota *C: va fatto più spesso in condizioni gravose.
- Il 2024–2025 (ER650N/P) non l'ho verificato, per questo `yearTo` vale 2023. Il 2026 è un modello
  nuovo (ER650W).

## Honda CRF1100L Africa Twin

Fonte: PDF ufficiale Honda Motopub,
`https://2rom-prd-data.hondamotopub.com/om/HMEE/CRF1100/2025/CRF1100%20OM%2032MLN610_eng_WEB.pdf`,
edizione 2025 (32MLN610, inglese). Ho letto la tabella "ED, II ED, III ED type" (versione europea),
pagine stampate 253–254 (pagine 259–260 del PDF).
- olio: il primo a 1 000 km, poi ogni 12 000 km, più il cambio annuale;
- filtro olio a 1 000, 24 000 e 48 000 km, quindi ogni 24 000 con il primo a 1 000;
- filtro aria ogni 24 000 km;
- candele: ispezione a 24 000 e sostituzione a 48 000 km;
- valvole ogni 24 000 km;
- catena: ispezione e lubrificazione ogni 1 000 km;
- liquido freni ogni 2 anni;
- refrigerante ogni 3 anni;
- ruote/gomme ogni 6 000 km più il controllo annuale.

Ambiguità:
- Ho verificato solo l'edizione 2025, per questo `yearFrom` vale 2025. Il 2020–2024 manca: il PDF
  `honda-moto.ro` del 2020 è una brochure di 10 pagine, non il libretto.
- Il filtro olio frizione (solo DCT) non è un item previsto, quindi non l'ho incluso.
- Per le candele ci sono due righe (inspect 24 000, replace 48 000).

## Modelli saltati

Li ho saltati per tempo (budget di circa 25 minuti, con Kawasaki passato davanti in corsa):
Honda SH125/150, Yamaha MT-07, Yamaha Tracer 7, BMW R 1300 GS, Vespa GTS 300, Benelli TRK 502 e
Ducati Monster. Nessuna fonte ufficiale letta per questi, quindi nessuna voce.

Per Honda, il prossimo modello si estrae allo stesso modo, dal PDF Motopub HMEE con `pdftoppm` sulla
pagina "Maintenance Schedule". Le icone della tabella sono immagini: `pdftotext` non basta.
