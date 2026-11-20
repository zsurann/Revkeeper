# 101 — vPIC (NHTSA) per marca/modello/anno e fonti per le specifiche tecniche

Data delle prove: 2026-11-20. Tutte le chiamate vPIC sono state fatte davvero con `curl` da questa sandbox.

## Risposta breve

- **vPIC funziona per marca → modello → anno**, è gratuito, senza chiave, con `Access-Control-Allow-Origin: *`
  (anche sul preflight `OPTIONS`). Ma è il **registro del mercato USA**: i modelli venduti solo in Europa
  mancano (Honda **SH** 125/150/350 assente, c'è solo `SH150i` del 2010; nessun `CRF1100L`, solo "Africa Twin").
- La lista marche "motorcycle" è **sporca**: 1703 marche, la maggior parte piccoli costruttori custom USA
  ("BACKROAD CHOPPERS", "JEFF NICKLUS CUSTOMS"…), e include ATV/UTV (Kawasaki MULE, Teryx) fra i modelli.
  I nomi dei modelli **cambiano da un anno all'altro** (Vespa: "GTS/GTV" → "GTS RST / SEI GIORNI" → "GTS / GTV" → "GTS").
- **vPIC non dà specifiche** (cc, CV, peso, serbatoio, gomme): solo nomi.
- Per le specifiche **non esiste una fonte gratuita e aperta utilizzabile**: Wikidata ha i dati su meno
  dell'1–2% dei modelli moto; i dataset su GitHub/Kaggle sono GPL, senza licenza chiara o di riuso dubbio;
  le API serie (API Ninjas, Apify, car2db) sono a pagamento o vietano l'uso commerciale nel tier free.
- **Raccomandazione:** non chiamare vPIC a runtime. Usare vPIC **offline, in fase di build**, per generare
  un JSON statico curato (solo le ~20–30 marche rilevanti, nomi normalizzati, anni compressi in intervalli),
  servito come asset statico di Pages (gratis, nessun limite). Le specifiche si inseriscono **a mano dalla
  scheda ufficiale del costruttore** (i fatti tecnici non sono protetti da copyright, la presentazione sì)
  solo per i modelli del catalogo verificato (vedi 020), con campo libero/modificabile per l'utente.

## Endpoint vPIC provati

Base: `https://vpic.nhtsa.dot.gov/api/vehicles/`. Tutti con `?format=json`.

| Endpoint | Esito | Dimensione | Latenza |
|---|---|---|---|
| `GetMakesForVehicleType/motorcycle` | 200, `Count: 1703` (1703 nomi unici) | 163 KB (27 KB gzip) | 0,67 s |
| `GetModelsForMakeYear/make/kawasaki/vehicletype/motorcycle` (tutti gli anni) | 200, 196 modelli | 25 KB | 2,1 s |
| `GetModelsForMakeYear/make/kawasaki/modelyear/2023/vehicletype/motorcycle` | 200, 54 modelli | 7 KB | 0,57 s |
| `GetModelsForMake/kawasaki` (senza filtro tipo) | 200, 223 modelli | 18 KB | — |
| `GetModelsForMakeYear/make/honda/vehicletype/motorcycle` | 200, 306 modelli | 39 KB | 1,6 s |
| idem per anno, altre marche | 200 | 0,5–9 KB | 0,3–0,6 s |

Latenze tipiche: 0,3–0,6 s con anno, 1–2 s senza anno.

Esempio, marche (`GetMakesForVehicleType/motorcycle`):
```json
{"Count":1703,"Message":"Response returned successfully","SearchCriteria":"Vehicle Type: motorcycle",
 "Results":[{"MakeId":446,"MakeName":"BUELL (EBR)","VehicleTypeId":1,"VehicleTypeName":"Motorcycle"}, ...]}
```
Esempio, modelli (`GetModelsForMake/kawasaki`):
```json
{"Make_ID":510,"Make_Name":"Kawasaki","Model_ID":3161,"Model_Name":"Vulcan 2000"}
```

**Anni:** non esiste un endpoint "anni per modello". Gli anni si ricavano solo chiamando
`GetModelsForMakeYear/.../modelyear/{y}` per ogni anno (qui: 9 marche × 23 anni = 207 chiamate, in parallelo,
nessun errore né rallentamento). Gli anni sono **model year USA**, quindi possono essere avanti di un anno
(già presenti 2027) e non coincidono con l'immatricolazione in Italia.

**Header di risposta** (estratto):
```
HTTP/2 200
content-type: application/json
access-control-allow-origin: *
cache-control: no-cache
expires: -1
```
Il preflight `OPTIONS` risponde `200` con `access-control-allow-origin: *`. Supporta `gzip`.

**Limiti/termini:** la pagina ufficiale dice solo "Users/Applications attempting to use vPIC APIs will be
controlled by an automated traffic rate control mechanism", senza soglie numeriche. Nessuna chiave. I dati
sono del governo USA (pubblico dominio di fatto, nessuna clausola di licenza nella pagina). `cache-control:
no-cache`: il browser non li mette in cache da solo.

Nomi alternativi accettati: le marche vanno passate per nome (`kawasaki`, `vespa`, `piaggio`); vPIC ha però
marche duplicate: `PIAGGIO`, `VESPA`, `PIAGGIO AND VESPA`; `BENELLI`, `BENELLI Q.J. SRL`; `KTM`, `KTMMEX`;
`HONDA`, `SUNDIRO  HONDA MOTORCYCLE CO. LTD` (doppio spazio nell'originale).

## Copertura

Anni scansionati: 2005–2027, per anno.

| Marca | Modello cercato | Nome in vPIC | Anni presenti | Note |
|---|---|---|---|---|
| Kawasaki | Z650 | `Z650` | 2017–2025 | 2026–27 diventa `Z650 S`; `Z650RS` 2022–27 a parte. Nessun codice telaio (`ER650`), nessuna variante "ABS" |
| Kawasaki | Ninja 650 | `Ninja 650` | 2006–2027 | più `Ninja 650R` solo 2011 |
| Honda | SH | `SH150i` | solo 2010 | **SH 125/350 assenti** (non venduti in USA) |
| Honda | Africa Twin / CRF1100L | `Africa Twin`, `Africa Twin Adventure Sports` | 2016–2027, 2018–2027 | nessuna distinzione CRF1000L/CRF1100L |
| Vespa | GTS | `GTS`, `GTS/GTV`, `GTS / GTV`, `GTS / GTV, VESPA GTS / GTV`, `GTS RST / SEI GIORNI`, `GTS 250` | 2005–2027, con nome diverso secondo l'anno | stessi modelli anche sotto `PIAGGIO` |
| Benelli | TRK | `TRK` | 2021–2027 | nessuna cilindrata (TRK 502 / 702 indistinte) |
| Ducati | Monster | `Monster` | 2006–2027 | più `Monster 797`, `Monster 1200` (solo 2017) e `MONSTER(NAKED STANDARD BIKE)` |
| Aprilia | RS / Tuono / Tuareg | `RS` (2021–24), poi `RS 457`, `RS 660` (2025–27); `Tuono` 2010–25, poi `Tuono 660/457/V4` | sì | 2023: solo 3 nomi generici (`RS`, `Tuareg`, `Tuono`) |
| KTM | Duke | `390 Duke` (2014–22), `790 Duke`, `990 Duke`, `790/890 Duke, R`, `Duke` (generico, 2005–27)… | sì | molte voci generiche/di categoria: `Competition`, `Minis`, `Racer`, `E` |
| Yamaha | MT-07 | `MT-07` 2018–2027; `FZ-07` 2015–2017 | sì | in USA si chiamava FZ-07 fino al 2017 |
| BMW | R 1250 GS | `R 1250 GS` 2019–2023; `R 1250 GS Adventure` 2024 | sì | `R 1200 GS` 2005–2021; l'R 1300 GS non compare come tale nei dati cercati |

Qualità dei nomi:
- **niente varianti tecniche** (ABS, codici telaio come `ER650`/`EX650`, cilindrata nel nome solo a volte);
- **voci aggregate** con barre/virgole (`790/890 Adv R, Rally`, `Diavel/XDiavel`, `LX / LXV / S / FLY`);
- **voci spazzatura/categorie** (`Race Only`, `Closed Course Competition`, `Minis`, `U`, `E`);
- **ATV/UTV mescolati** anche col filtro `motorcycle` (Kawasaki `MULE PRO-FX`, `Teryx`; Yamaha `Grizzly`, `Wolverine`);
- maiuscole incoerenti fra marche (`KAWASAKI` nella lista marche, `Kawasaki` nei modelli);
- doppioni con spazi (`FLY  50`).

## CORS e chiamata diretta vs Worker

| | Chiamata diretta dal client | Worker/Pages Function con Cache API | JSON statico generato in build |
|---|---|---|---|
| CORS | ok (`*`) | non serve | non serve |
| Peso | lista marche 163 KB / 27 KB gzip, sporca | si può filtrare e ridurre | solo marche curate, pochi KB |
| Latenza | 0,3–2 s per chiamata, più chiamate per gli anni | prima chiamata uguale, poi cache edge | istantanea, funziona offline (precache PWA) |
| Costo free tier | 0 | ogni richiesta conta nelle 100 000/giorno di Workers (le Pages Functions rientrano in quel limite) | 0: gli asset statici di Pages sono illimitati |
| Rischi | rate limit non documentato, servizio USA che può cambiare/cadere, niente offline | codice in più da mantenere | dati "congelati": si rigenerano con uno script quando serve |

La Cache API funziona nelle Pages Functions anche su `*.pages.dev` (doc Cloudflare); non in anteprima
dashboard né dietro Cloudflare Access.

**Conclusione:** né diretta né Worker. Uno script (Node, eseguito a mano o in CI) scarica da vPIC le sole
marche utili, filtra ATV/voci spazzatura, normalizza i nomi, comprime gli anni in `yearFrom/yearTo`, e scrive
`public/data/models.json`. Il catalogo è piccolo e cambia una volta l'anno: non vale una dipendenza a runtime.
Se un giorno servisse la lista completa "live", allora Worker con cache (TTL lungo, es. 30 giorni) per
non dipendere dal rate limit, mai la chiamata diretta.

In ogni caso la tendina deve permettere **testo libero** ("modello non in elenco"): Honda SH, molti scooter
EU e le moto cinesi vendute in Italia non ci sono.

## Fonti specifiche

| Fonte | Cosa ha | Licenza | Utilizzabile? |
|---|---|---|---|
| vPIC NHTSA | solo nomi marca/modello/anno | dati governo USA, nessuna restrizione | sì, ma **niente specifiche** |
| Wikidata (SPARQL) | 2953 elementi "motorcycle model" (Q23866334); con `engine displacement` solo **30**, `mass` **46**, `nominal power output` **13**, `number of cylinders` 17 | CC0 | licenza perfetta, **dati quasi assenti**. Z650 moderna (Q121599201): solo marca/produttore; Q3194354 è la Z650 del 1976. Africa Twin (Q23807849, Q19856881 CRF1000L): solo produttore/serie/sito. MT-07 (Q17061060): 700 cc, 2 cilindri, nient'altro |
| Wikipedia / DBpedia (infobox) | spesso cc, CV, peso, serbatoio, ma per generazione e non per anno | CC BY-SA 4.0 (attribuzione + share-alike sui dati estratti) | possibile ma scomodo: parsing fragile, obbligo di attribuzione e share-alike |
| lowsideio/data (GitHub) | 13 447 modelli, 463 marche, CSV; il README dice che i dati possono essere sbagliati | GPL-3.0; archiviato (sola lettura) | sconsigliato: GPL sui dati, qualità non garantita, colonne non verificate |
| Kaggle (es. "Biking Thrills India", dataset scraped da bikez.com) | specifiche parziali, mercato indiano o scraping | licenza assente o non chiara; scraping soggetto ai termini del sito di origine | no |
| MotoDB (motodb.org) | ~2800 schede con cc/CV/peso | nessuna licenza dichiarata, "for reference only" | no |
| API Ninjas Motorcycles | ~40 campi (cc, potenza, peso, serbatoio, gomme…) | chiave obbligatoria; **uso commerciale vietato nel tier free**; endpoint marche/modelli solo a pagamento | no (o a pagamento) |
| Apify / AWS Marketplace "Motorcycle Specs Database", car2db | 40 000 modelli, 20+ campi | a pagamento, EULA | no (budget zero) |
| Schede ufficiali dei costruttori | dati esatti per anno/mercato EU | testo e impaginazione protetti; **i singoli fatti tecnici (cc, kW, kg, litri, misure gomme) non sono protetti da copyright** | sì, trascrivendo a mano i valori (non copiando testi/immagini), con link alla fonte |

## Raccomandazione

1. **Tendine marca → modello → anno:** JSON statico generato da uno script che legge vPIC una tantum
   (marche curate: Aprilia, Benelli, BMW, Ducati, Harley-Davidson, Honda, Kawasaki, KTM, Moto Guzzi, MV Agusta,
   Piaggio/Vespa, Royal Enfield, Suzuki, Triumph, Yamaha, ecc.), con normalizzazione e alias manuali
   (`Z650` ↔ `ER650`, `MT-07` ↔ `FZ-07`, `Africa Twin` ↔ `CRF1000L/CRF1100L`). Aggiungere a mano i modelli
   EU assenti (Honda SH 125/150/350, ecc.). Servito da Pages come asset, precache nella PWA. Ricerca nel
   client con un semplice filtro `includes` sui nomi normalizzati.
2. **Specifiche auto-compilate:** solo per i modelli del catalogo verificato (`020-models.json`), aggiungendo
   campi `specs` (cc, kW, kg in ordine di marcia, litri serbatoio, misure gomme) presi a mano dalla scheda
   ufficiale del costruttore o dal libretto già letto, con `source` URL. Per tutti gli altri: campi vuoti
   che l'utente compila. Wikidata non vale l'integrazione oggi (copertura < 2%).
3. Niente Worker, niente chiamate a runtime: zero richieste contate sul free tier e funziona offline.

## Sources

- [vPIC API, documentazione ufficiale](https://vpic.nhtsa.dot.gov/api/)
- Chiamate effettive: `https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/motorcycle?format=json`,
  `.../GetModelsForMakeYear/make/{make}[/modelyear/{y}]/vehicletype/motorcycle?format=json`, `.../GetModelsForMake/kawasaki?format=json`
- [Wikidata Query Service](https://query.wikidata.org/) — elementi [Q121599201](https://www.wikidata.org/wiki/Q121599201),
  [Q3194354](https://www.wikidata.org/wiki/Q3194354), [Q23807849](https://www.wikidata.org/wiki/Q23807849),
  [Q19856881](https://www.wikidata.org/wiki/Q19856881), [Q17061060](https://www.wikidata.org/wiki/Q17061060)
- [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [API Ninjas Motorcycles API](https://api-ninjas.com/api/motorcycles)
- [lowsideio/data su GitHub](https://github.com/lowsideio/data)
- [MotoDB](https://motodb.org/en)
- [Apify Motorcycle Specs Database](https://apify.com/making-data-meaningful/motorcycle-specs-database)
- [AWS Marketplace, Motorcycle Specs Database](https://aws.amazon.com/marketplace/pp/prodview-73oqhfiuvlotc)
- [Car2DB moto](https://moto.car2db.com)
- [Kaggle "Biking Thrills India" (via Baselight)](https://baselight.app/u/kaggle/dataset/willianoliveiragibin_biking_thrills_india)
- [Gigasheet, motorcycle data scraped da bikez](https://www.gigasheet.com/data-community/motorcycle-data)
