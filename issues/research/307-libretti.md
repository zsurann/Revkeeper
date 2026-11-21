# 307 — Libretti ufficiali → intervalli (primo giro Honda e Yamaha)

Data di verifica: 2026-11-21. Dati in `research/307-models.json` (7 voci, stesso formato di 201). Ogni numero è
stato letto sull'**immagine** della tabella (`pdftoppm`), non solo sul testo: nei PDF Honda i simboli I/R/C sono
grafici e in quelli Yamaha i segni √ spariscono da `pdftotext`. `src/data/intervals.json` non è stato toccato.

## Come usare lo script

```
node scripts/manuals/fetch-manual.ts <url-pdf> [.cache/manuals]
pdftoppm -f N -l N -r 180 -png .cache/manuals/<nome>.pdf .cache/manuals/png/<nome>   # poi guardare l'immagine
```

- Scarica il PDF una volta sola (GET singolo con User-Agent, verifica `%PDF-`), poi `pdftotext -q -layout` in un `.txt`
  accanto, e stampa le pagine PDF che contengono le parole chiave (manutenzione periodica, programma di manutenzione,
  periodic maintenance, maintenance schedule, km, mesi) e molti numeri "N 000". Le pagine di seguito della tabella
  hanno solo "km": per questo il filtro è `parole chiave ≥ 2` oppure `≥ 1 e ≥ 5 numeri-km`. Qualche falso positivo
  (indice, specifiche) è normale: si guarda l'immagine.
- Tutto resta in `.cache/manuals/` (in `.gitignore`): i PDF non vanno mai committati.
- poppler-utils era già installato (`pdftotext`, `pdftoppm`); altrimenti `apt-get install -y poppler-utils`.
- Per ritagliare le pagine Honda (A5, molto piccole) ho usato PIL a 180 dpi; per Yamaha basta 100 dpi pagina intera.

### Trovare gli URL

- **Honda Motopub (HMEI = Italia)**, tutto via GET, senza login:
  1. `https://www.hondamotopub.com/ajax/get_model_names/HMEI/all` → nomi interni (es. `NSS125AD`, `ADV750`);
  2. `.../ajax/get_model_years/HMEI/<nome>` → anni;
  3. `https://www.hondamotopub.com/om/HMEI/<nome>/<anno>` → la pagina contiene il link al PDF
     `2rom-prd-data.hondamotopub.com/om/HMEI/...pdf`. Per molti anni la pagina **non** ha il PDF italiano (link assente).
- **Yamaha**: nessun indice. L'URL è `cdn2.yamaha-motor.eu/prod/owner-manuals/{Motorcycles|Scooters}/P<tipo><28199|F8199><edizione>H.PDF`
  (`H` = italiano, edizione `H0`, `H1`, `HA`…). Ho provato con `HEAD` alcuni codici tipo: esistono `B7N` (MT-09 2021),
  `B74` (XMAX 300 / CZD300-A, Scooters, F8199), `BAL` e `BW5` (scooter di produzione Indonesia/Vietnam, non identificati).
  Non risponde nulla per `BME` (MT-09 2024, codice visto su un PDF australiano), `BAP`, `BW3`, `BPW`, `BKN`, `BC3`.

## Honda (tutte: libretto italiano HMEI, tabella "Programma di manutenzione")

| Modello (catalogo) | Nome Motopub | PDF | Pagine (stampata / PDF) |
|---|---|---|---|
| Forza 125 | NSS125AD 2025 (3LK40L60) | `.../om/HMEI/NSS125AD/2025/NSS125AD_OM_3LK40L60_ita_WEB.pdf` | 110–111 / 114–115 |
| Forza 350 | NSS250A_350A 2025 (3LK1BF300) | `.../om/HMEI/NSS250A_350A/2025/NSS250A_3LK1BF300_ita_WEB.pdf` | 107–108 / 111–112 |
| X-ADV | ADV750 2025 (3LMKT700) | `.../om/HMEI/ADV750/2025/ADV750-S_3LMKT700_ita_WEB.pdf` | 136–137 / 140–141 |
| NC750X | NC750X 2025 (3LMKW620) | `.../om/HMEI/NC750X/2025/NC750_OM_3LMKW620_ita_WEB.pdf` | 110–111 / 116–117 |
| CB650R | CB650R 2024 (3LMKYB20) | `.../om/HMEI/CB650R/2024/CB650RA_CBR650RA-R%20OM%203LMKYB20_ita_WEB.pdf` | 103–104 / 109–110 |
| PCX | WW125_A (PCX) 2025 (3LK1YC20) | `.../om/HMEI/WW125_A%20%28PCX%29/2025/WW125A_OM_3LK1YC20_ita_WEB.pdf` | 88–89 / 92–93 |

Nel JSON `page` = prima pagina **stampata** (come per gli SH in 201). Le pagine stampate di Forza 350, X-ADV, NC750X,
CB650R e PCX le ho ricavate dal numero in fondo al testo della pagina; quella del Forza 125 l'ho vista sull'immagine.

Valori:
- **Forza 125 e PCX** (identici, tabella da 6 000 km): olio 1 000 poi ogni 6 000 + annuale; filtro aria 18 000;
  candela controllo 6 000 / sostituzione 12 000; gioco valvole controllo 6 000; cinghia controllo 12 000 / sostituzione
  24 000; olio trasmissione finale 2 anni; liquido freni controllo 6 000 + annuale, sostituzione 2 anni; refrigerante
  controllo 12 000 + annuale, sostituzione 3 anni; ruote/pneumatici controllo 6 000 + annuale.
- **Forza 350** (tabella da 12 000 km, come SH350): olio 1 000 poi 12 000 + annuale; filtro olio 1 000, 24 000, 48 000;
  filtro aria 24 000; candela sostituzione 12 000; valvole controllo 24 000; cinghia controllo 12 000 / sostituzione
  24 000; olio trasmissione finale 2 anni; freni e refrigerante come sopra ma controllo a 12 000; pneumatici 12 000 + annuale.
- **X-ADV e NC750X** (identici): olio 1 000 poi 12 000 + annuale; filtro olio 1 000/24 000/48 000; filtro aria 24 000;
  candela controllo 24 000 / sostituzione 48 000; valvole controllo 24 000; catena controllare e lubrificare ogni 1 000 km;
  liquido freni controllo 12 000 + annuale, sostituzione 2 anni; refrigerante controllo 12 000 + annuale, sostituzione
  3 anni; pneumatici 12 000 + annuale.
- **CB650R**: come X-ADV/NC750X ma il **gioco valvole** è segnato solo nella colonna 36 000 km → `inspect` ogni 36 000.

Dubbi:
- `yearFrom` è l'anno dell'edizione letta (2025, CB650R 2024). Per Forza 350 2021–2024, X-ADV 2021–2024 e NC750X
  2021–2023 Motopub non offre il PDF italiano: probabilmente la tabella è la stessa, ma non l'ho letta.
- Forza 125 e PCX: il "filtro olio a reticella" va pulito (C) a 12/24/36 000 km e il "filtro aria carter cinghia"
  del Forza 350 ogni 12 000: non c'è l'azione "clean", omessi (come in 201).
- X-ADV/NC750X: il "filtro olio frizione" (DCT, R a 1 000/24 000/48 000) non ha chiave: omesso.
- X-ADV e CB650R: ho usato la tabella "Versioni ED…" (Europa); le altre (GS, LA, PH, TH) sono per altri mercati.
- CB650R: il PDF 2024 vale per CB650RA e CBR650RA; la CB650R **E-Clutch** (`CB650RAC`) ha un libretto a parte
  (`.../CB650RAC/2024/Non-index_rev3_3LMKY7000_web.pdf`) non letto, quindi niente alias `CB650RAC`.
- PCX: il PDF italiano esiste solo per il 2025 (WW125_A); per 2021–2024 (`WW125A (PCX)`) nessun PDF italiano.
  L'alias `PCX125` coincide con una voce di catalogo del 2011: da valutare prima dell'import.

## Yamaha MT-09 (MTN890, generazione 2021–2023)

Fonte: `https://cdn2.yamaha-motor.eu/prod/owner-manuals/Motorcycles/PB7N28199H1H.PDF` (B7N-28199-H1, 1a ed. agosto 2021,
italiano), pagine PDF 64–69 (stampate 7-3 … 7-8; nel JSON `page` = 64, pagina PDF, come per MT-07 in 201).
Esiste anche `PB7N28199H0H.PDF` (prima edizione), non confrontata.

Valori (stessa struttura dell'MT-07): olio 1 000 poi ogni 10 000 + annuale; cartuccia filtro olio a 1 000, 20 000, 40 000;
filtro aria 40 000; candele controllo a 10 000/30 000, sostituzione 20 000/40 000; gioco valvole "controllare e
regolare" ogni 40 000; catena "controllare, regolare e lubrificare" ogni 1 000 km; liquido freni ogni 2 anni;
refrigerante controllo 10 000 + annuale, cambio ogni 3 anni; pneumatici 10 000 + annuale. Da 50 000 km si riparte da 10 000.
Dubbio: `yearTo` = 2023 perché la MT-09 2024 è una nuova versione (codice BME) e il suo libretto UE non l'ho trovato.

## Modelli saltati

- **MT-07 2025+, Tracer 9, Ténéré 700, TMAX, NMAX 125**: codice libretto sul CDN Yamaha non trovato (vedi sopra).
  `PBALF8199H0H.PDF` è un libretto italiano ©2021 di PT Yamaha Indonesia, forse l'NMAX 125 2021: non verificato, saltato.
- **XMAX 300**: trovato solo `Scooters/PB74F8199H0H.PDF` (CZD300-A, prima generazione 2017): non letto per mancanza
  di tempo; per la versione attuale (2023+) codice non trovato.
- Le ricerche web restituiscono soprattutto copie di terzi (manualslib, bike-parts-yam.it, yamahacity.com.au): non usate.

## Prossimi passi

- Yamaha: chiedere a un umano il codice libretto dalla ricerca su yamaha-motor.eu (la pagina risponde 404 da qui) oppure
  leggerlo sull'adesivo/libretto cartaceo; poi basta lo script.
- Leggere XMAX 300 (B74) e confrontare Honda 2025 con le edizioni inglesi degli anni precedenti per allargare `yearFrom`.
