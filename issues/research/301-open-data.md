# 301 — Registri veicoli europei / open data per un catalogo moto (marca, modello, anni, specifiche)

Data delle prove: 2026-11-20. File scaricati e query fatte davvero da questa sandbox (curl + Python), salvo
dove scritto "non verificato". Script di prova e file scaricati nello scratchpad della sessione (non nel repo).

## Risposta breve

- **La fonte migliore non è RDW ma la Svizzera: ASTRA, dataset `TAS_Motorrad.csv`** (omologazioni di tipo
  svizzere, aggiornato mensilmente, download libero, 12 MB, nessuna chiave). 11 663 omologazioni moto, 603 marche,
  5 465 coppie marca+nome commerciale, dal 1995 al 2026. Ha **tutto tranne il serbatoio**: nome commerciale,
  tipo, data omologazione, cc, kW, peso a vuoto, **misure gomme e cerchi** (es. Z650 2026:
  `v= 120/70ZR17 … h= 160/60ZR17`). Licenza: open data federale "frei verfügbar", senza un testo di licenza
  esplicito sul portale (vedi sotto: da confermare con una mail ad ASTRA prima del rilascio).
- **Seconda fonte, con la licenza più pulita: Finlandia, Traficom "Ajoneuvojen avoin data", CC BY 4.0.**
  Un CSV con tutti i veicoli in circolazione (251 792 righe di categoria L), con marca, nome commerciale,
  cc, kW, massa a vuoto, data di prima immissione: 771 marche, 12 928 coppie marca+nome. Niente gomme.
- **Spagna, DGT microdati mensili di immatricolazione**: un file a larghezza fissa per mese dal 12/2014,
  con `MARCA_ITV`, `MODELO_ITV`, cilindrata, kW, massa in ordine di marcia, categoria UE. Settembre 2026:
  29 823 moto e ciclomotori, 175 marche, 1 428 coppie marca+modello. Riuso libero anche commerciale citando
  la fonte (condizioni di datos.gob.es / Ley 37/2007). Buona per gli anni di vendita in Europa e per il mercato
  del Sud Europa (scooter 125).
- **RDW (Paesi Bassi) non è stato provato**: `opendata.rdw.nl` è **bloccato dalla rete di questa sessione**
  (il proxy risponde 502 / DNS non risolto). La licenza è CC0 (confermata su data.overheid.nl). Le query SoQL
  sono pronte qui sotto, da lanciare quando l'host sarà consentito.
- **No**: KBA (le tabelle FZ per modello coprono solo le auto; l'elenco tipi SV 4.1 per le moto è ottimo ma
  "tutti i diritti riservati"), Italia MIT (il parco circolante ha la marca ma **non il modello**), Francia SDES
  (niente marca/modello), Belgio (nessun dataset per marca/modello trovato), Norvegia (API per singolo veicolo
  con chiave). Wikidata è utile solo per nomi e collegamenti: 2 953 modelli moto, ma la cilindrata c'è solo
  su 30 e la potenza su 13.
- **Il serbatoio non c'è in nessuna fonte aperta.** Resta un dato inserito a mano o dall'utente.

## Fonti a confronto

| Fonte | Accesso | Campi utili | Moto coperte | Licenza | Esito |
|---|---|---|---|---|---|
| **ASTRA (CH) TAS_Motorrad** | CSV/xlsb, download diretto, mensile; JSON per omologazione | marca, nome commerciale, tipo, variante, data omologazione, cc, kW, giri, coppia, peso a vuoto min/max, massa max, **gomme+cerchi**, dimensioni, v max | 11 663 omologazioni, 603 marche, 1995–2026 (tutto ciò che si vende in CH ≈ mercato UE) | "Open Data, frei verfügbar"; nessun testo di licenza trovato, solo "uso accurato e corretto dei dati" | **provato** |
| **Traficom (FI)** | ZIP 206 MB → CSV 956 MB, `;`, latin-1, aggiornamento trimestrale | classe (L1e/L3e…), marca, `kaupallinenNimi`, `mallimerkinta`, cc, kW, massa a vuoto, data prima immissione, n. omologazione | 251 792 veicoli L in circolazione, 771 marche | **CC BY 4.0** | **provato** |
| **DGT (ES) microdati matriculaciones** | ZIP mensile (~16 MB → 120 MB), larghezza fissa, latin-1, dal 12/2014 | marca, modello (22 car.), cc, kW, tara, massa in ordine di marcia, categoria UE, tipo/variante/versione, n. omologazione | 29 823 moto+ciclomotori nel solo 09/2026; 175 marche | Riuso libero anche commerciale, citando la fonte (aviso legal datos.gob.es) | **provato** |
| **RDW (NL)** | API Socrata (SoQL), JSON/CSV | merk, handelsbenaming, datum_eerste_toelating, cilinderinhoud, massa_ledig_voertuig/massa_rijklaar, typegoedkeuringsnummer, variant, uitvoering; nettomaximumvermogen nel dataset carburanti | Tutto il parco NL (non contato) | **CC0** | **non provato** (host bloccato qui) |
| KBA (DE) FZ10 | XLSX mensile | marca + "Modellreihe" | **solo autovetture** (verificato sul file 10/2026) | DL-DE BY 2.0 | inutile per le moto |
| KBA (DE) SV 4.1 | PDF 242 pagine (classe L, stato 15/08/2026) | HSN/TSN, marca, nome commerciale (max 25 car.), data, classe, kW, cc, massa max | tutte le moto tedesche dal dopoguerra | **"Alle Rechte vorbehalten… nur mit vorheriger Zustimmung"** | escluso (licenza) |
| MIT (IT) parco circolante | CSV per regione (dati.mit.gov.it non raggiungibile da qui) | tipo, marca, cilindrata, kW, data immatricolazione, euro… | moto incluse | CC BY 4.0 (estratto Milano) | **niente modello** |
| SDES (FR) immatricolazioni | CSV | motorizzazione, tipo veicolo, comune | aggregati | Licence Ouverte | niente marca/modello |
| Statbel / DIV (BE) | — | — | — | — | nessun dataset per modello trovato |
| Statens vegvesen (NO) | API per targa, con chiave | marca, modello, cc, gomme | per singolo veicolo | da verificare | non adatto a un catalogo |
| Wikidata | SPARQL | etichette, costruttore (2 652/2 953), foto (1 892) | 2 953 "motorcycle model" | CC0 | solo complemento |

## Prove fatte

### ASTRA (Svizzera)

Elenco: `https://opendata.astra.admin.ch/ivzod/4000-Typengenehmigungen_TAS/4300-Datensaetze/`
(file del 2026-10-29: `TAS_Motorrad.csv` 12 MB, `TAS_moto.csv` stessa cosa in francese). Il vecchio formato
TARGA (`2000-Typengenehmigungen_TG_TARGA`) viene rimosso a fine 2026: usare solo TAS.

```
curl -sLo moto.csv https://opendata.astra.admin.ch/ivzod/4000-Typengenehmigungen_TAS/4300-Datensaetze/TAS_Motorrad.csv
```
CSV `;`, UTF-8 con BOM, campi tra virgolette con a capo interni (serve un parser CSV vero). Colonne utili:
`makeName, commercialName, type, variant, version, dateOfApproval, engineCapacity, maximumNetPower,
chEmptyWeightMinimum/Maximum, techPermMaxLadenMassMax, chTyreRims, maximumSpeedTo, typeApprovalNumber`.

Riempimento: `commercialName`, `maximumNetPower`, peso, gomme, data al 100%; `engineCapacity` 10 147/11 663
(le elettriche non hanno cc). Prime marche: Yamaha 981, Honda 845, Harley-Davidson 844, Triumph 576, Suzuki 525.

| Ricerca | Righe | Esempio (ultima omologazione) |
|---|---|---|
| Kawasaki "Z650" | 49 | `Z650`, tipo `ER650S`, 2026-07-08, 649 cc, 50,20 kW, vuoto 263–273, `v= 120/70ZR17 (40U); 3.50x17 / h= 160/60ZR17 (63U); 4.50x17`. Nel 2016: `Z650 ABS` tipo `ER650HA2` 35 kW (versione A2) |
| Honda "SH125" | 15 | `SH125AD`, tipo `JF90`, 2025-09-25, 125 cc, 9,60 kW, `100/80-16 … 120/80-16`; anche `FSH125` (tipo JK01) |
| Piaggio "GTS" | 47 | `Vespa GTS 310` MD3G 2026, 310 cc 18,4 kW; `Vespa GTS 125` MD3F. La marca è `PIAGGIO`, non `VESPA` |
| Benelli "TRK502" | 4 | `TRK502 (X)`, `TRK502`, `TRK502X`, tipo P16, 500 cc, 35 kW; gomme diverse per versione (17" vs 19") |

Nota sul peso: il "Leergewicht" svizzero risulta ~75 kg più alto dei valori UE (Z650: 263 CH contro 188 FI
e 190 ES): probabilmente include il conducente. Va corretto (−75) o non usato come "peso a vuoto".

### Traficom (Finlandia)

```
curl -s 'https://avoindata.suomi.fi/data/api/3/action/package_show?id=ajoneuvojen-avoin-data'
# license_id: cc-by-4.0 ; risorsa: https://opendata.traficom.fi/Content/Ajoneuvorekisteri.zip (215 MB)
```
File `tieliikenteen_avoindata_30_09_2026.csv`, 956 MB, `;`, latin-1. Classi: M1 2,63 M, … L3e 75 366,
L3 70 234, L1e 69 864. Colonne utili: `ajoneuvoluokka, kayttoonottopvm (YYYYMMDD), merkkiSelvakielinen,
mallimerkinta, kaupallinenNimi, iskutilavuus, suurinNettoteho, omamassa, tyyppihyvaksyntanro`.

Risultati (classi L1e, L3e, L3, L1, L4e, L5e: 251 792 righe):

| Ricerca | Veicoli | Combinazione più frequente (marca, nome, cc, kW, kg) |
|---|---|---|
| Z650 | 336 | Kawasaki `Z650` 649 cc 50,2 kW 188 kg (124). Anni 1977–2026: c'è anche la Z650 storica, stesso nome |
| SH125 | 34 | Honda `SH125` 125 cc 10,1 kW 136 kg; varianti `SH125A`, `SH125D` |
| GTS | 307 | Piaggio `VESPA GTS` 278 cc 17,5 kW 160 kg |
| TRK 502 / TRK502 | 36 + 19 | Benelli `TRK 502 X` e `TRK502` 500 cc 35 kW 235 kg (qualche riga 330 = errore o massa diversa) |

Punto debole: 100 713 righe L su 251 792 non hanno `kaupallinenNimi` (moto vecchie, dove c'è solo
`mallimerkinta`, es. `SH 125/JF09A`).

### DGT (Spagna)

Pagina: "Microdatos de Matriculaciones de Vehículos (mensual)" su dgt.es. File:
`https://www.dgt.es/microdatos/salida/AAAA/M/vehiculos/matriculaciones/export_mensual_mat_AAAAMM.zip`
(dal 201412 al 202609). Tracciato nel PDF `MATRICULACIONES_MATRABA.pdf`: 69 campi a larghezza fissa
(MARCA_ITV 30, MODELO_ITV 22, CILINDRADA_ITV 5, KW_ITV 7, MASA_ORDEN_MARCHA_ITV 6, CATEGORÍA…). Moto:
`COD_TIPO` 50 (moto 2 ruote), 51 (con sidecar), 90 (ciclomotore 2 ruote). Dal 1/2/2025 il telaio è troncato
a 8 caratteri (irrilevante per noi).

Settembre 2026: 29 823 righe con tipo 50/90, 175 marche, 1 428 coppie marca+modello. Più immatricolate:
Zontes 125V (1 898), Zontes 125X, Yamaha GPD125-A (NMAX), Honda WW125A (PCX), Honda SH125AD.

| Ricerca | Esempio |
|---|---|
| Z650 | `KAWASAKI` / `Z650`, 649 cc, 35,00 kW (A2) e 50,20 kW, massa in ordine di marcia 190 |
| SH125 | `HONDA` / `SH125AD`, 125 cc, 9,60 kW, 139 kg, categoria `L3E` |
| GTS | `PIAGGIO` / `VESPA GTS 125` 10,3 kW 150 kg; `PIAGGIO` / `VESPA GTS` **310 cc** 18,4 kW 163 kg (il nome non dice la cilindrata) |
| TRK | `BENELLI` / `TRK 902`, `TRK 702X`, `TRK 702 35KW` (la potenza finisce nel nome) |

Attenzione: dopo il campo 41 alcuni offset del tracciato sembrano spostati (categoria letta come `*06`),
quindi il parser va tarato su un campione prima di usare i campi finali. Marca, modello, cc, kW e massa
risultano corretti. Per le moto nuove `FEC_PRIM_MATRICULACION` è vuoto: usare `FEC_MATRICULA`.

### RDW (Paesi Bassi) — non eseguito

```
curl "https://opendata.rdw.nl/resource/m9d7-ebf2.json?$limit=1"
→ CONNECT tunnel failed, response 502 ; WebFetch: getaddrinfo ENOTFOUND opendata.rdw.nl
```
`opendata.rdw.nl` va aggiunto agli host consentiti dell'ambiente per provarlo. Licenza CC0 confermata su
data.overheid.nl ("Open Data RDW: Gekentekende_voertuigen", Licentie CC-0 1.0). Socrata senza app token
applica un limite per IP; con un app token gratuito il limite è più alto (non verificato qui). Query
pronte (non eseguite; nomi dei campi da confermare con `$limit=1`):

```
# conteggio marche/modelli moto
https://opendata.rdw.nl/resource/m9d7-ebf2.json?$select=count(distinct merk)&$where=voertuigsoort='Motorfiets'
# catalogo aggregato: modello + anni + specifiche tipiche
https://opendata.rdw.nl/resource/m9d7-ebf2.json?$select=merk,handelsbenaming,min(datum_eerste_toelating) as dal,
  max(datum_eerste_toelating) as al,max(cilinderinhoud) as cc,avg(massa_ledig_voertuig) as kg,count(*) as n
  &$where=voertuigsoort='Motorfiets'&$group=merk,handelsbenaming&$having=count(*)>=5&$limit=50000
# potenza: dataset carburante 8ys7-d773, join per kenteken (Socrata non fa join: due query e unione nello script)
https://opendata.rdw.nl/resource/8ys7-d773.json?$select=kenteken,nettomaximumvermogen&kenteken=XXXX
```
Le misure gomme non sono nei dataset aperti RDW che conosco (il dataset assi dà numero di assi e carichi,
non le gomme): da verificare.

### KBA (Germania)

- `fz10_2026_10.xlsx` scaricato: "Neuzulassungen von Personenkraftwagen nach Marken und Modellreihen",
  solo auto. Licenza nel foglio Impressum: Datenlizenz Deutschland – Namensnennung 2.0. Per le moto il KBA
  pubblica solo dati per marca, non per modello.
- `sv41_pdf.pdf` (Verzeichnis der Hersteller und Typen, Klasse L, stato 15/08/2026): ottimi dati (es.
  `2299 ABF Kawasaki Z650 06.12.2022 L3e-A3 50 kW 649 cc`; `4038 AAT BENELLI TRK 502 X,TRK502,TRK502X`), ma
  ogni pagina riporta "Vervielfältigung und Verbreitung, auch auszugsweise, nur mit vorheriger Zustimmung
  gestattet". **Non riutilizzabile senza permesso.**

### Italia, Francia, altri

- MIT "parco circolante" (estratto Lombardia-Milano, CC BY 4.0): campi `tipo_veicolo, marca, cilindrata,
  alimentazione, kw, data_immatricolazione, massa_complessiva…`, **nessun campo modello**. `dati.mit.gov.it`
  non è raggiungibile da questa sandbox. ACI non pubblica microdati aperti per modello (non verificato a fondo).
- data.gouv.fr: "Immatriculations de véhicules routiers" (SDES, Licence Ouverte) è per comune, motorizzazione
  e tipo; nessun dataset con marca/modello moto.
- Belgio: nessun dataset aperto per marca/modello trovato. Norvegia: API per singola targa con chiave.

### Wikidata

```
SELECT (COUNT(DISTINCT ?m) AS ?n) WHERE { ?m wdt:P31 wd:Q23866334 . }   → 2953
costruttore P176: 2652 · cilindrata P8628: 30 · potenza P2109: 13 · massa P2067: 46 · inizio P571: 52 · foto P18: 1892
```
Z650 ha due elementi (Q3194354 storica, Q121599201 moderna). Utile per nomi canonici e immagini, non per
le specifiche.

## Raccomandazione

1. **Base: ASTRA TAS_Motorrad** per nome commerciale, anni, cc, kW e **gomme**. È l'unica fonte aperta
   con le gomme, ed è già organizzata per omologazione (una riga per tipo/versione), quindi non serve
   aggregare milioni di targhe. Prima del rilascio: scrivere ad ASTRA (contatto indicato sulla pagina dati veicoli) per avere per scritto che il riuso in un'app gratuita è permesso, con attribuzione.
2. **Conferma e massa: Traficom (CC BY 4.0)**, per la massa a vuoto UE (senza conducente), per gli anni di
   circolazione reali e per i modelli che in Svizzera non ci sono. Attribuzione: "Fonte: Traficom, CC BY 4.0".
3. **Copertura mercato Sud Europa: DGT**, in particolare per gli scooter 125 (Zontes, SYM, Kymco, Voge) e
   per gli anni di vendita in Europa (`FEC_MATRICULA` min/max). Attribuzione richiesta.
4. **RDW (CC0)** quando l'host sarà consentito: stessa funzione di Traficom, licenza ancora più semplice.
5. **Wikidata** solo come opzione per foto/ID canonico. **Serbatoio**: campo manuale.
6. Mantenere vPIC solo per i modelli USA-only, o abbandonarlo.

Il catalogo si genera **offline** (script locale o GitHub Action mensile) e si pubblica come JSON statico
nell'app, come già proposto in 101. L'app non chiama nessuna di queste fonti a runtime.

## Bozza di pipeline

```
fetch/   astra.csv (12 MB) · traficom.zip (206 MB) · dgt_YYYYMM.zip (ultimi 24–36 mesi) · [rdw via SoQL]
parse →  record grezzi {src, make, name, type_code, year, cc, kw, kg, tyres}
norm  →  chiave (make_n, family_n)
group →  una riga per (make_n, family_n, cc_bucket, kw_bucket)
out   →  catalog.json [{make, model, from, to, cc, kw, kg, tyre_f, tyre_r, sources[]}]
```

1. **Parse.** ASTRA: `csv` con `;` e virgolette; `year = dateOfApproval[:4]`, `kw = float(x.replace(',','.'))`,
   gomme da `chTyreRims` con regex `v=\s*([\d/]+Z?R?-?\s?\d+)` e `h=…`; `kg = chEmptyWeightMinimum − 75` (da
   verificare). Traficom: filtro `ajoneuvoluokka` in L1e/L3e/L3/L1, nome = `kaupallinenNimi` o, se vuoto,
   `mallimerkinta` prima della `/`; anno da `kayttoonottopvm`. DGT: parser a larghezza fissa con le
   lunghezze del PDF, filtro `COD_TIPO` 50/51/90; anno da `FEC_MATRICULA`.
2. **Normalizzazione marca:** maiuscolo, togliere suffissi societari, tabella alias piccola e manuale
   (`VESPA`→`PIAGGIO` con modello "Vespa …", `KAWASAKI MOTORS`→`KAWASAKI`, `HARLEY DAVIDSON`→`HARLEY-DAVIDSON`,
   `MOTO GUZZI`/`GUZZI`, `KTM SPORTMOTORCYCLE`→`KTM`). Tenere solo le marche con ≥ N righe.
3. **Normalizzazione modello** (la parte difficile), in quest'ordine:
   - maiuscolo, spazi multipli → uno, togliere la marca ripetuta all'inizio ("VESPA GTS" con marca PIAGGIO resta);
   - separare i nomi multipli (`TRK 502 X,TRK502,TRK502X`, `SH125AD,SH125D`) e tenere il più corto come forma base;
   - togliere i suffissi di allestimento/omologazione in coda: `ABS`, `A2`, `35KW`, `I`, `IE`, `E5`, `E5+`,
     `(X)`, `SE`, `TFT` e le lettere-codice Honda in coda (`A`, `D`, `AD`, `S`) solo se dopo un numero
     (`SH125AD`→`SH125`, `WW125A`→`WW125`);
   - unire lettere e numero: `SH 125 I` → `SH125`, `TRK 502` → `TRK502`, `Z 650` → `Z650`;
   - chiave di confronto senza spazi né punteggiatura; nome mostrato = la forma più frequente vista prima
     della normalizzazione ("Z650", "SH125", "Vespa GTS 300", "TRK 502").
   - I codici interni costruttore (WW125 = PCX, GPD125 = NMAX, NSS125 = Forza 125) non sono nomi commerciali:
     servono una tabella alias manuale delle 30–50 eccezioni più diffuse, o il nome ASTRA/Traficom come
     riferimento (che di solito è il nome commerciale).
4. **Raggruppamento e anni:** stesso nome con cc molto diversi = modelli diversi (Z650 del 1977 e del 2017;
   Vespa GTS 125/278/310): chiave `(make, family, round(cc, −1))`. `from`/`to` = min/max anno; se c'è un
   buco di più di 5 anni, si divide in due generazioni. Le versioni A2 (35 kW) restano come variante dello
   stesso modello (`kw: [35, 50.2]`), non come modello separato.
5. **Valori tipici:** mediana di cc, kW e kg sulle righe del gruppo, con priorità ASTRA > Traficom > DGT per
   cc/kW, Traficom/DGT/RDW > ASTRA−75 per kg. Gomme solo da ASTRA (la combinazione più frequente).
6. **Pulizia:** scartare gruppi con meno di 5 veicoli (FI/ES) o senza nome commerciale; segnalare per
   controllo manuale i gruppi dove le fonti differiscono di più del 10% su cc o kW.
7. **Output:** `catalog.json` con `sources` per riga e un file `ATTRIBUTION` (ASTRA, Traficom CC BY 4.0,
   DGT, RDW CC0) mostrato nella pagina "Informazioni" dell'app.

Esempio atteso di riga:
```json
{"make":"KAWASAKI","model":"Z650","from":2017,"to":2026,"cc":649,"kw":[35,50.2],"kg":188,
 "tyre_f":"120/70ZR17","tyre_r":"160/60ZR17","sources":["astra","traficom","dgt"]}
```

## Sources

- ASTRA, dati veicoli open data: https://opendata.astra.admin.ch/ivzod/ — directory TAS: https://opendata.astra.admin.ch/ivzod/4000-Typengenehmigungen_TAS/4300-Datensaetze/
- ASTRA, panoramica prodotti informativi (01/07/2026): https://www.astra.admin.ch/dam/de/sd-web/BakiDqfaJMx8/01%20%C3%9Cbersicht%20Informationsprodukte%20Fahrzeugdaten-20260701.pdf
- ASTRA FAQ dati veicoli: https://www.astra.admin.ch/de/faq-fahrzeugdaten
- ASTRA Newsletter 2/2026 (fine del formato TARGA): https://www.astra.admin.ch/dam/de/sd-web/YZ5OtKJr5yXO/Newsletter_Fahrzeugdaten_2_2026_DE.pdf
- Traficom, Ajoneuvojen avoin data (CC BY 4.0): https://avoindata.suomi.fi/data/en/dataset/ajoneuvojen-avoin-data — FAQ: https://tieto.traficom.fi/files/media/file/Avoin%20Data%20Usein%20Kysytyimm%C3%A4t%20Kysymykset.pdf — https://tieto.traficom.fi/en/open-data
- DGT, microdati immatricolazioni mensili: https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/dgt-en-cifras-detalle/Microdatos-de-Matriculaciones-de-Vehiculos-mensual/ — tracciato: https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/matraba/MATRICULACIONES_MATRABA.pdf
- datos.gob.es, scheda dataset e aviso legal: https://datos.gob.es/es/catalogo/e00130502-microdatos-de-matriculaciones-de-vehiculos-mensual — https://datos.gob.es/es/aviso-legal
- RDW su data.overheid.nl (CC0): https://data.overheid.nl/dataset/11441-open-data-rdw--gekentekende-voertuigen — RDW, Uitleg voertuigrapport: https://www.rdw.nl/paginas/uitleg-voertuigrapport
- KBA FZ10: https://www.kba.de/DE/Statistik/Produktkatalog/produkte/Fahrzeuge/fz10/fz10_gentab.html — pubblicazioni SV: https://www.kba.de/DE/Themen/Typgenehmigung/CoC_Daten_Fahrzeugtypdaten/Veroeffentlichungen/veroeffentlichungen_tab.html
- MIT parco circolante (notizia): https://www.mit.gov.it/comunicazione/news/pubblicato-open-data-il-parco-circolante-dei-veicoli-su-strada-italia — estratto Milano: https://dati.comune.milano.it/dataset/c4eeffe8-70e5-406b-b858-b561b37bac32/resource/db26f8ab-2f9f-4996-9c40-6e306c2c595f
- data.gouv.fr, Immatriculations de véhicules routiers (SDES): https://www.data.gouv.fr/datasets/immatriculations-de-vehicules-routiers
- Statens vegvesen, API dati tecnici: https://www.vegvesen.no/om-oss/om-organisasjonen/apne-data/et-utvalg-apne-data/api-for-tekniske-kjoretoyopplysninger/
- Wikidata Query Service: https://query.wikidata.org/
