# Ricerca 001: fonte degli intervalli di manutenzione per modello

Data: 2026-11-20. Ticket: [001](../001-fonte-intervalli-manutenzione.md).

## Risposta breve

- **Non esiste una fonte aperta e gratuita** di intervalli ufficiali per marca/modello/anno di moto. Le uniche fonti strutturate sono **commerciali e pensate per officine** (Autodata, HaynesPro WorkshopData MotoSET, MOTOR): costano decine o centinaia di euro al mese, la licenza vieta di ridistribuirle in un'app per utenti finali e i prezzi per un uso via API si trattano caso per caso.
- I **dati ufficiali veri** stanno nei **libretti uso e manutenzione dei costruttori** (Honda Motopub, Ducati, ecc.), in PDF scaricabili. Sono gratis da consultare ma coperti da copyright e non strutturati. Va bene leggerli e riportare i *fatti* (km/mesi); non va bene copiarli in blocco o fare scraping.
- **maintenanceschedule.com** ha tabelle per centinaia di modelli, ma le compila a mano un privato, non ha API né licenza e riporta "© tutti i diritti". Si può usare per un controllo incrociato, non come fonte da importare.
- Per il **selettore marca/modello**: NHTSA vPIC è gratuito, pubblico e funziona (testato), ma copre il **mercato USA** e mancano i modelli solo europei (es. Honda SH). lowside.io (GPL-3.0) ha 13.447 modelli ma è fermo al 2017 e senza anni. I dataset commerciali (Car2DB moto 72 $ una tantum, Teoalida) sono più completi.
- **Raccomandazione**: un **JSON curato a mano**, nel repo, con circa 30 modelli tra i più diffusi in Italia, presi dai libretti ufficiali e con la fonte citata per ogni voce, più **preset generici per categoria** (scooter, naked/stradale, sportiva, enduro/adventure, Desmo/Ducati, boxer BMW) usati quando il modello manca. Per il selettore: un elenco di marche curato, il modello come testo libero con suggerimenti presi dal JSON, e nessuna API chiamata a runtime.

## Fonti valutate

### A. Intervalli di manutenzione

| Fonte | Tipo | Copertura (marche IT) | Licenza / uso in app | Costo | Formato | Affidabilità |
|---|---|---|---|---|---|---|
| **Autodata Motorcycles** | Commerciale, per officine | 79 costruttori, oltre 9.000 modelli (dichiarati); include i principali marchi europei e giapponesi | Abbonamento per officina; la ridistribuzione agli utenti finali non è prevista | Da 38 €/mese (UE, IVA esclusa) a 129 $/mese (USA) | Web app; nessuna API pubblica | Alta (dati OEM) |
| **HaynesPro WorkshopData MotoSET** | Commerciale, per officine | "Ampia gamma" (numeri non pubblicati) | Licenza annuale; esiste uno scambio dati via API "per soluzioni su misura", da trattare | Su preventivo | Web app, API su contratto | Alta (dati OEM) |
| **MOTOR Maintenance Schedules** | Commerciale (DaaS/API/bulk) | Orientato al mercato USA, soprattutto auto; copertura moto non pubblicata | Contratto B2B | Su preventivo | API, bulk | Alta, ma coprirebbe poco l'Italia |
| **Libretti ufficiali dei costruttori** (Honda Motopub, Ducati, Yamaha, BMW, KTM, Triumph, Piaggio) | Ufficiale, PDF | Totale per i modelli venduti in UE | Copyright del costruttore; Motopub chiede di accettare una licenza al download. Si possono estrarre a mano i fatti (km, mesi); niente copia integrale né scraping | Gratis | PDF, tabelle diverse per ogni marca | **Massima** (è la fonte primaria) |
| **maintenanceschedule.com** | Sito privato, compilato a mano | Centinaia di modelli (101 voci solo per Honda), con Ducati, BMW, Triumph, Yamaha | Nessuna licenza, "© 2026", nessuna API. Non va importato | Gratis | HTML | Media: è trascritto a mano dai PDF, utile come controllo incrociato |
| **API Ninjas Motorcycles** | API commerciale | Oltre 20.000 modelli, 600 marche | Uso commerciale solo a pagamento | Freemium | JSON | **Non ha intervalli**: solo specifiche tecniche |
| Portale service Harley-Davidson | Ufficiale, web | Solo H-D | Riservato | Gratis | HTML | Alta, ma fuori target |

### B. Elenchi marca/modello (per il selettore)

| Fonte | Copertura | Licenza | Costo | Formato | Note dai test |
|---|---|---|---|---|---|
| **NHTSA vPIC** `GetModelsForMakeYear/.../vehicletype/motorcycle` | 1.703 marche con tipo "motorcycle"; modelli per anno, **solo mercato USA** | Pubblico dominio (governo USA), senza chiave | Gratis (con limite di traffico) | JSON/XML/CSV | Test 2022: Honda 71 risultati (compresi ATV), Ducati 9 (solo famiglie: "Monster", "Multistrada"), Aprilia 3, Vespa 5, Moto Guzzi 3. **Mancano i modelli solo europei** (Honda SH ecc.) |
| **lowsideio/data** (GitHub) | 463 marche, 13.447 modelli, **senza anni** | **GPL-3.0** (copyleft, rischioso se il dato finisce nell'app) | Gratis | CSV `marca, modello` | Ultimo commit 2017-10-24, repo archiviato. Ha SH125, MT-07, Beverly, GTS; **mancano** NC750X e Ténéré 700. Molti duplicati ("1000S"/"1000 S") |
| **Car2DB Moto** | Marche, modelli, serie, allestimenti, specifiche (moto, scooter, ATV) | Commerciale (ToS) | 72 $ una tantum (CSV/MySQL), 85 $ (xlsx), aggiornamenti mensili | CSV, SQL, xlsx | Copertura UE non dichiarata; demo gratuita su 2 marche |
| **Teoalida Motorcycle DB** (dati da bikez.com) | Oltre 500 marche, oltre 30.000 modelli, per anno | Commerciale | Prezzo non pubblicato; campione gratuito con 507 marche | xlsx, CSV, SQL | Buona copertura storica UE |
| API Ninjas `/motorcyclemakes`, `/motorcyclemodels` | Oltre 600 marche | Solo con piano Business o superiore | A pagamento | JSON | Chiave API lato server, quindi serve un Worker |

## Raccomandazione

1. **Dataset curato a mano** in `src/data/maintenance.json` (o simile), nel repo e incluso nel bundle della PWA, quindi utilizzabile offline:
   - circa **30 modelli** tra i più diffusi in Italia, una famiglia di motore per voce. Una lista di partenza:
     - Honda SH 125/150, X-ADV, NC750X, Africa Twin, Transalp 750, CB500/CB750 Hornet
     - Yamaha TMAX, XMAX 125/300, MT-07, MT-09, Ténéré 700, Tracer 7/9
     - Kawasaki Z650, Z900, Versys 650
     - Suzuki V-Strom 650/800
     - Ducati Monster, Multistrada V2/V4, Scrambler 800
     - BMW R 1250/1300 GS, F 900 R/XR, G 310
     - KTM 390/790/890 Duke e Adventure
     - Triumph Trident 660, Tiger 900
     - Aprilia RS/Tuono 660
     - Piaggio Beverly e Medley; Vespa Primavera 125 e GTS 125/300
   - **fonte obbligatoria per ogni modello**: titolo del libretto, edizione o anno e pagina. Si trascrivono solo i numeri (sono fatti), mai il testo del libretto.
   - i **campi sono per voce**: km, mesi, primo intervento (tagliando di rodaggio) e tipo di azione (sostituire o controllare).
2. **Preset generici** per categoria, da usare quando il modello non è nel dataset o come base da cui un modello eredita (`extends`). Vanno etichettati chiaramente come "valori indicativi" e restano modificabili dall'utente.
3. **Intervalli modificabili sempre**: il valore effettivo per ogni moto è `preset/modello` più l'override dell'utente. Questo vale per la issue [004](../004-modello-dati.md), dove serve un campo `origin: "model" | "preset" | "user"` sulla voce di manutenzione.
4. **Selettore**: un elenco di circa 40 marche (le principali nel mercato italiano) nel JSON; il modello come **testo libero** con suggerimenti dai modelli curati; l'anno come numero. Se il modello coincide con una voce curata, si usano i suoi intervalli, altrimenti si propone il preset della categoria scelta. **Nessuna chiamata a vPIC a runtime**: è centrato sugli USA, a volte ha solo le famiglie di modelli e aggiungerebbe una dipendenza di rete. Si può usare una volta, offline, per suggerire nomi da curare.
5. Non usare in app: Autodata, HaynesPro e MOTOR (licenze B2B incompatibili e costo), lowside (GPL e dati vecchi), scraping di maintenanceschedule.com (nessuna licenza).

Avvertenza da mostrare in UI: "Intervalli indicativi tratti dal libretto del costruttore; fa fede il libretto della tua moto."

## Schema proposto

Un solo file JSON, validabile con JSON Schema. Unità: km, mesi.

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-20",
  "items": {
    "engine_oil":     { "label": "Olio motore" },
    "oil_filter":     { "label": "Filtro olio" },
    "air_filter":     { "label": "Filtro aria" },
    "spark_plugs":    { "label": "Candele" },
    "valve_clearance":{ "label": "Gioco valvole" },
    "chain":          { "label": "Catena (pulizia, lubrificazione, tensione)" },
    "chain_kit":      { "label": "Kit trasmissione" },
    "drive_belt":     { "label": "Cinghia di trasmissione (scooter CVT)" },
    "brake_fluid":    { "label": "Liquido freni" },
    "coolant":        { "label": "Liquido di raffreddamento" },
    "fork_oil":       { "label": "Olio forcella" },
    "final_drive_oil":{ "label": "Olio coppia conica / trasmissione finale" },
    "tyres":          { "label": "Pneumatici (controllo)" }
  },
  "presets": [
    {
      "id": "preset.naked",
      "label": "Stradale / naked (generico)",
      "intervals": [
        { "item": "engine_oil",  "action": "replace", "km": 10000, "months": 12, "firstKm": 1000 },
        { "item": "oil_filter",  "action": "replace", "km": 10000, "months": 12, "firstKm": 1000 },
        { "item": "air_filter",  "action": "replace", "km": 20000 },
        { "item": "spark_plugs", "action": "replace", "km": 20000 },
        { "item": "valve_clearance", "action": "inspect", "km": 40000 },
        { "item": "chain",       "action": "inspect", "km": 1000 },
        { "item": "brake_fluid", "action": "replace", "months": 24 },
        { "item": "coolant",     "action": "replace", "months": 36 }
      ]
    }
  ],
  "models": [
    {
      "id": "yamaha.mt07.2021",
      "make": "Yamaha",
      "model": "MT-07",
      "aliases": ["MT07", "MT-07 ABS"],
      "yearFrom": 2021,
      "yearTo": null,
      "category": "naked",
      "extends": "preset.naked",
      "intervals": [
        { "item": "valve_clearance", "action": "inspect", "km": 40000 }
      ],
      "source": {
        "kind": "owner_manual",
        "title": "Yamaha MT-07 Manuale d'uso",
        "edition": "B4C-F8199-H0",
        "page": 0,
        "url": "https://...",
        "verifiedAt": "2026-11-20"
      }
    }
  ]
}
```

Regole:

- `interval` ha come campi obbligatori `item` e `action` (`"replace" | "inspect" | "adjust" | "lube"`), più **almeno uno** tra `km` e `months`. `firstKm` e `firstMonths` sono facoltativi e valgono per il primo intervento (rodaggio). La scadenza è la prima tra km e mesi raggiunta.
- `extends` unisce le voci del preset e quelle del modello per `item`; se c'è conflitto vince la voce del modello. `km: null` o `months: null` in una voce del modello annulla il valore del preset.
- `source` è obbligatorio su ogni `models[]`. Senza fonte la voce non entra nel file: è il controllo di qualità.
- I numeri dell'esempio sono segnaposto e **non sono verificati**: ogni modello va trascritto dal suo libretto.
- Corrispondenza nel selettore: `make` più `model` o `aliases` (senza distinguere maiuscole e ignorando spazi e trattini), più `yearFrom ≤ anno ≤ yearTo`.

## Sources

- Autodata, intervalli di manutenzione per moto: https://www.autodata-group.com/ee/autodata-unveils-brand-new-service-schedules-for-motorcycles/ ; https://autodata-group.com/au/motorcycles ; https://autodata-group.com/de/subscribe-autodata
- HaynesPro WorkshopData Motorcycles: https://iaaf.co.uk/news/introducing-haynespro-workshopdata-motorcycles ; https://www.workshopdata.pro ; https://autosupply.co.za/product/haynespro-workshopdata-motoset-motorcycle-technical-data-1-year-licence-atd-hynmoto/
- MOTOR Maintenance Schedules: https://motor.com/products/maintenance-schedules
- Honda Motopub (libretti ufficiali UE): https://www.hondamotopub.com/HMEE ; https://www.honda.co.uk/motorcycles/owners/owners-manual.html
- Ducati, manuali e piani di manutenzione: https://www.ducati.com/gb/en/service-maintenance/manuals-genuine-parts-and-maintenance-schedules ; https://www.ducati.com/ww/en/service-maintenance/maintenance
- maintenanceschedule.com: https://maintenanceschedule.com/honda-motorcycles-main-index/
- API Ninjas Motorcycles: https://api-ninjas.com/api/motorcycles
- NHTSA vPIC: https://vpic.nhtsa.dot.gov/api/ (testato: `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/ducati/modelyear/2022/vehicletype/motorcycle?format=json` e `GetMakesForVehicleType/motorcycle`)
- lowside.io open data: https://github.com/lowsideio/data
- Car2DB Moto: https://moto.car2db.com
- Teoalida Motorcycle Database: https://www.teoalida.com/cardatabase/?p=9435
