# Licenze e attribuzioni delle fonti del catalogo (issue #56)

Domanda: Revkeeper è un'app pubblica, gratuita e senza pubblicità. Le licenze delle fonti del catalogo permettono questo uso? Quali attribuzioni servono, con quale testo e dove vanno messe? Copiare intervalli e dati tecnici dai libretti dei costruttori è lecito in UE e in Italia?

Ricerca del 2026-11-27 su `origin/main` (4c9d9d0). Non è un parere legale: per una certezza vincolante serve un avvocato, ma il rischio residuo è basso.

## In breve

| Fonte | Campi usati davvero | Licenza / termini | Verdetto | Cosa manca |
|---|---|---|---|---|
| NHTSA vPIC | solo i **nomi dei modelli per anno** (2008–oggi, 32 marche) | informazione pubblica del governo USA, «may be distributed or copied»; nessun obbligo di citazione; limite di traffico automatico | **ok** | niente di obbligatorio; non usare logo o nome NHTSA in modo da far pensare a un avallo |
| Traficom (FI) | marca, modello, anno, cc, kW, massa a vuoto | **CC BY 4.0** | **ok, con condizioni** | link alla fonte e nota di modifica nella scheda; avviso CC BY nel repo (README o file dati) |
| DGT (ES), microdati mensili | marca, modello, anno, cc, kW, massa | Ley 37/2007 + aviso legal di datos.gob.es: citare la fonte, data di aggiornamento, non snaturare, nessun avallo | **ok, con condizioni** | nome completo «Dirección General de Tráfico» e **data di aggiornamento**; frase «nessun avallo» |
| USTRA/ASTRA (CH), TAS_Motorrad | marca, nome commerciale, anno, cc, kW, **gomme** (il peso no) | open data gratuito senza testo di licenza; **permesso scritto** del 2026-11-23 citando l'Ufficio federale delle strade | **ok** | conservare l'email; nient'altro |
| Libretti dei costruttori (17 modelli in `intervals.json`) | km, mesi, primo tagliando per 11 voci; titolo, edizione, pagina, URL | copyright sul documento; per Honda Motopub una licenza accettata al download | **lecito per i singoli fatti**, rischio basso, con due precisazioni (vedi sotto) | dicitura «marchi dei rispettivi proprietari, nessuna affiliazione»; regola scritta «niente testo, tabelle impaginate o immagini» |
| Schede web dei costruttori (18 specifiche in `catalog-extra.json`) | cc, CV, kg, serbatoio, gomme, olio | copyright sulla pagina, non sui valori | **ok** | come sopra |

Un elenco in Account va bene come attribuzione generale. Per Traficom e DGT conviene però una menzione breve anche dove compaiono i dati, e c'è già: `BikeForm` mostra «Compilati da registri ufficiali: …». Vanno aggiunti solo i pezzi indicati nella tabella.

## 1. Cosa usa davvero il codice

Verificato su `scripts/import-eu.ts`, `scripts/build-catalog.ts`, `src/domain/catalogBuild.ts`, `scripts/manuals/fetch-manual.ts`, `src/data/catalog/*.json` e `src/data/intervals.json`.

- **NHTSA vPIC** (`build-catalog.ts`): chiama `GetModelsForMakeYear/.../vehicletype/motorcycle` per 32 marche, dal 2008 all'anno prossimo, e tiene **solo `Model_Name`**, cioè l'elenco dei modelli e gli anni. Nessun dato tecnico arriva da vPIC.
- **Traficom** (`import-eu.ts`, `opendata.traficom.fi/Content/Ajoneuvorekisteri.zip`): solo le classi L1/L3, colonne anno (`$7`/`$2`), marca (`$26`), denominazione commerciale (`$30`), cilindrata (`$20`), potenza kW (`$21`) e massa (`$13`). Niente targhe, telai o dati personali. Tutto viene aggregato per modello (`groupModels`).
- **DGT** (`import-eu.ts`, `www.dgt.es/microdatos/salida/AAAA/M/vehiculos/matriculaciones/export_mensual_mat_AAAAMM.zip`, ultimi 12 mesi): posizioni fisse per anno, marca, modello, cc, kW e massa, filtrate sui veicoli a 2 posti. Aggregato per modello.
- **ASTRA** (`TAS_Motorrad.csv`): `makeName`, `commercialName`, `dateOfApproval` (che diventa l'anno modello), `engineCapacity`, `maximumNetPower` e `chTyreRims` (le gomme). Il peso è escluso.
- **Risultato nel catalogo** (`src/data/catalog/b-*.json`, 131 file): 5.383 specifiche. 5.365 hanno `source: "Registri ufficiali: …"`, con le combinazioni USTRA, Traficom e DGT. 18 hanno un URL di una scheda del costruttore. I campi sono `cc`, `hp` (convertiti dai kW), `kg`, `tyreFront`/`tyreRear` e, solo nelle schede manuali, `tankLitres`, `oilLitres` e `oilGrade`. Anche i dati intermedi `data/eu-models.json` (856 KB, campi `sources`) sono **committati nel repo**.
- **Libretti** (`src/data/intervals.json`, 17 modelli: 10 Honda Motopub, 3 Kawasaki techinfo, 3 Yamaha CDN, 1 BMW): per ogni voce ci sono `item`, `action`, `km`, `months` e `firstKm`, più `source {kind, title, edition, page, url}`. I PDF restano in `.cache/manuals/` e non vengono mai committati. I 5 preset generici (`preset.*`) non hanno fonte: sono valori tipici scritti a mano.
- **Dove compaiono oggi le attribuzioni**:
  - `src/Account.tsx:206-214`: «Elenco dei modelli e dati tecnici elaborati da NHTSA vPIC, Traficom (CC BY 4.0), DGT, Ufficio federale delle strade (USTRA/ASTRA), schede tecniche e libretti ufficiali dei costruttori», con un link a ciascuna fonte e alla licenza CC BY.
  - `src/BikeForm.tsx:45-59` (`SpecSource`): «Compilati da registri ufficiali: Ufficio federale delle strade (USTRA), DGT, Traficom (CC BY 4.0). Puoi modificarli.», con il link alla licenza CC BY. Per le schede del costruttore: «Compilati da scheda ufficiale» con il link.
  - `src/Maintenance.tsx:171-180`: «Fonte intervalli: <titolo libretto> (pag. N).» con l'URL, più «I valori tipici sono indicativi: controlla il libretto della tua moto.»
  - `README.md:66`: «Elenco dei modelli basato su dati pubblici: NHTSA vPIC, Traficom (CC BY 4.0), DGT, Ufficio federale delle strade (USTRA/ASTRA, Svizzera).»
  - Il repo **non ha un file LICENSE**.

## 2. Fonte per fonte

### NHTSA vPIC

- Termini d'uso NHTSA: «Information presented on this web site is considered public information and may be distributed or copied» ([nhtsa.gov/about-nhtsa/terms-use](https://www.nhtsa.gov/about-nhtsa/terms-use); la pagina risponde 403 agli script, il testo viene dall'indice di ricerca e da una copia d'archivio). Le opere del governo federale USA non sono protette da copyright negli USA (17 U.S.C. § 105).
- La pagina dell'API ([vpic.nhtsa.dot.gov/api](https://vpic.nhtsa.dot.gov/api/)) non riporta licenza né obbligo di citazione. Dice solo che il traffico è limitato da un «automated traffic rate control mechanism». Lo script rispetta il limite: 4 richieste alla volta, una volta l'anno.
- Il logo NHTSA e il sigillo DOT sono marchi federali e non vanno usati su materiali non NHTSA ([linee guida NHTSA](https://www.trafficsafetymarketing.gov/guidelines-using-nhtsa-graphics-and-media-assets)).
- In ogni caso da vPIC si prendono solo nomi di modelli, cioè fatti.
- **Verdetto: ok.** La citazione in Account è una cortesia, non un obbligo. Va bene così.

### Traficom (Finlandia), CC BY 4.0

- Il dataset «Ajoneuvojen avoin data» è sotto licenza Creative Commons Nimeä 4.0, cioè CC BY 4.0 ([scheda su avoindata.fi](https://avoindata.fi/data/en/dataset/ajoneuvojen-avoin-data/resource/00041d67-966e-48cf-a720-255faf09d55c)).
- Condizioni di Traficom ([traficom.fi/en/use-and-licences-data](https://traficom.fi/en/use-and-licences-data)):
  - conservare l'avviso di copyright;
  - mettere un hyperlink al sito dove si trova l'originale, «se tecnicamente possibile»;
  - se il materiale è modificato, aggiungere una nota che descrive la modifica, con link all'originale;
  - indicare la licenza CC BY 4.0 con un link;
  - conservare le esclusioni di garanzia.
- Esempio ufficiale: «Source: Finnish Transport and Communications Agency Traficom. This material was downloaded from Traficom's View and Download Service on [data] under the CC 4.0 BY licence.» Traficom può chiedere di togliere l'attribuzione.
- La CC BY 4.0, sez. 3(a), richiede: autore, avviso di copyright, avviso di licenza, avviso di esclusione di garanzia, URI della fonte (se praticabile), indicazione delle modifiche e link alla licenza. Il tutto può stare «in any reasonable manner based on the medium», quindi anche in una pagina di attribuzioni raggiungibile dall'app ([testo legale](https://creativecommons.org/licenses/by/4.0/legalcode)). La licenza copre anche il diritto sui generis (sez. 4): si possono estrarre e ridistribuire tutti i dati.
- **Verdetto: ok, con condizioni.**
  - L'elenco in Account soddisfa già quasi tutto, perché dice «elaborati da» (la modifica) e ha i link alla fonte e alla licenza.
  - Nella scheda (`BikeForm`) manca un link alla fonte Traficom. Non è strettamente necessario, perché basta l'elenco in Account, ma è a costo zero.
  - **Il repo pubblico** ridistribuisce dati Traficom adattati (`data/eu-models.json` e `src/data/catalog/*.json`). Il README li cita ma senza link alla licenza, senza dire che sono elaborati e senza esclusione di garanzia. Va aggiunto lì (vedi sez. 4).

### DGT (Spagna), microdati delle immatricolazioni

- La pagina del dataset ([dgt.es](https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/dgt-en-cifras-detalle/Microdatos-de-Matriculaciones-de-Vehiculos-mensual/)) non ha una licenza propria. Avvisa solo che dal 2025 il telaio completo è stato tolto.
- La scheda su datos.gob.es ([catalogo](https://datos.gob.es/es/catalogo/e00130502-microdatos-de-matriculaciones-de-vehiculos-mensual)) rimanda come «Licencia» a **[datos.gob.es/avisolegal](https://datos.gob.es/es/aviso-legal)**, cioè alle condizioni generali della Ley 37/2007 e del RD 1495/2011. Riassunto:
  - è vietato snaturare il senso dell'informazione;
  - va citata la fonte;
  - va indicata la data dell'ultimo aggiornamento, se presente;
  - non si può indicare, insinuare o suggerire che il titolare partecipi, sponsorizzi o sostenga il riutilizzo;
  - vanno conservati i metadati su data e condizioni.
  - Il riutilizzo commerciale e non commerciale è consentito.
- Anche l'aviso legal della sede DGT ([sede.dgt.gob.es](https://sede.dgt.gob.es/es/contenido/derechos-sobre-la-propiedad-intelectual/)) chiede di riprodurre «fielmente, sin manipular ni alterar» e di citare sempre come fonte l'«Organismo Autónomo Jefatura Central de Tráfico».
- Aggregare i valori per modello e convertire i kW in CV è un'elaborazione che la Ley 37/2007 permette. Non è un'alterazione, a patto di dirlo («dati elaborati») e di non attribuire alla DGT conclusioni sue.
- **Verdetto: ok, con condizioni.** Mancano:
  1. il nome completo dell'ente;
  2. la **data di aggiornamento**: c'è già `generatedAt` in `_brands.json`, e i file DGT coprono i 12 mesi prima della build;
  3. la frase che esclude l'avallo.
- Nessun dato personale: i file sono già senza telaio, e Revkeeper tiene solo valori aggregati per modello.

### USTRA/ASTRA (Svizzera), TAS_Motorrad.csv

- L'ASTRA elenca i dati di omologazione tra gli «Information products available free of charge (open data)» ([panoramica 01/07/2026](https://www.astra.admin.ch/dam/en/sd-web/BakiDqfaJMx8/01%20Overview%20vehicle%20data%20information%20products-20260701.pdf)). Il portale [opendata.astra.admin.ch/ivzod](https://opendata.astra.admin.ch/ivzod/) e le newsletter dicono che tutti i prodotti dati sono «en libre utilisation».
- Non c'è un testo di licenza, ma c'è il **permesso scritto** dell'Ufficio federale delle strade del 2026-11-23: «Questo utilizzo dei dati è consentito. Come fonte può citare l'Ufficio federale delle strade» (`issues/304-richiesta-di-licenza-ad-astra.md`).
- **Verdetto: ok.** L'attribuzione attuale («Ufficio federale delle strade (USTRA)» nella scheda, «USTRA/ASTRA» in Account e nel README) è conforme. Conviene conservare l'email originale fuori dal repo: è l'unica prova della licenza.

## 3. Libretti e schede dei costruttori: è lecito?

### Norme

- **Diritto d'autore sul documento.** Il libretto come testo, impaginazione, illustrazioni e tabella grafica è un'opera protetta (L. 633/1941 art. 1 e 2). Copiare il PDF, il testo o l'immagine della tabella non è consentito.
  - Un singolo dato tecnico («olio ogni 12.000 km o 12 mesi», «649 cc») **non è un'opera**. Manca la «creazione intellettuale propria dell'autore» che la Corte di giustizia richiede ([C-5/08 Infopaq](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:62008CJ0005)).
  - Anche la scelta delle voci di un programma di manutenzione è dettata da vincoli tecnici. Quando ci sono regole e vincoli che non lasciano margine creativo, manca l'originalità ([C-604/10 Football Dataco v Yahoo](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:62010CJ0604)).
- **Banca dati, tutela d'autore** (direttiva 96/9/CE art. 3; L. 633/1941 art. 2 n. 9 e art. 64-quinquies). La tutela riguarda la **struttura** (scelta e disposizione), non il contenuto: lo dice espressamente l'art. 3(2) della direttiva ([testo](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:31996L0009)). Revkeeper non riprende la struttura del libretto: usa un suo schema di 11 voci.
- **Diritto sui generis** (direttiva art. 7; L. 633/1941 art. 102-bis e 102-ter):
  1. Protegge un **investimento rilevante nel conseguimento, nella verifica o nella presentazione** dei dati, non nella loro **creazione** ([C-203/02 British Horseracing Board v William Hill](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:62002CJ0203)). Il costruttore *crea* gli intervalli progettando la moto. Il libretto non è il frutto di un investimento per raccogliere dati esistenti, quindi la tutela sui generis su una tabella di manutenzione è debole.
  2. Anche se ci fosse, vieta solo l'estrazione o il reimpiego di una **parte sostanziale**, oppure quelli **ripetuti e sistematici** di parti non sostanziali che danneggiano la normale gestione della banca dati (art. 7(5) della direttiva; art. 102-bis comma 9; [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art102bis)). Revkeeper prende una tabella di poche righe da un manuale di 100–300 pagine, a mano, per 17 modelli: è una parte non sostanziale.
  3. La Corte richiede inoltre un **pregiudizio all'investimento** del costitutore ([C-762/19 CV-Online Latvia](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:62019CJ0762)). Il costruttore pubblica il libretto gratis per far usare bene la moto, e un'app che rimanda al suo PDF non gli toglie nulla.
- **Termini contrattuali.** Se una raccolta *non* è protetta né da diritto d'autore né da sui generis, la direttiva non impedisce al titolare di limitarne l'uso **per contratto** ([C-30/14 Ryanair v PR Aviation](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:62014CJ0030)). Le eccezioni inderogabili dell'art. 15 valgono solo per le banche dati protette. Quindi una licenza *accettata* al download, come quella di Honda Motopub, può vincolare chi l'ha accettata anche sui fatti.
  - Il testo di [hondamotopub.com/license](https://www.hondamotopub.com/license/) non è leggibile da script (pagina dinamica). Secondo la ricerca 302 vieta di copiare e ridistribuire i *contenuti*; la stampa è consentita solo per uso personale.
  - Riportare un intervallo con la fonte non è «ridistribuire il manuale». Resta però il punto meno chiaro dell'intera analisi.
- **Marchi.** Usare marca e modello per dire a quale moto si riferisce un dato è un uso descrittivo consentito (reg. UE 2017/1001 art. 14(1)(c); D.Lgs. 30/2005 art. 21). Non vanno usati i loghi, e non va lasciato intendere un legame con il costruttore.

### Verdetto

**Lecito, rischio basso**, alle condizioni che Revkeeper già rispetta:

- solo numeri (km, mesi, cc, CV, kg, misure);
- niente PDF, testo, immagini o impaginazione nel repo (`fetch-manual.ts` scrive solo in `.cache/`);
- estrazione a mano, modello per modello, con la fonte (titolo, edizione, pagina, URL);
- nessuno scraping massivo.

Due precisazioni:

1. Per Honda Motopub, e per qualsiasi portale che fa accettare una licenza, il rischio non è zero (sentenza Ryanair). Prima di estendere la pipeline a molti modelli, conviene leggere a mano la licenza Motopub e, se vieta espressamente l'estrazione di dati, chiedere un permesso come si è fatto con ASTRA. Per poche decine di modelli trascritti a mano il rischio pratico è minimo.
2. Il rischio cresce con la scala: estrarre *tutti* i libretti di una marca in modo sistematico si avvicina all'estrazione «ripetuta e sistematica» dell'art. 102-bis comma 9.

## 4. Attribuzioni: testo e posizione

L'elenco in Account va bene come attribuzione generale, perché la CC BY ammette «any reasonable manner». Nella schermata dei dati basta la riga breve che c'è già. Ecco le aggiunte.

**Account (`src/Account.tsx`), testo proposto**

> Elenco dei modelli e dati tecnici elaborati (aggregati per modello, potenza convertita in CV) da: NHTSA vPIC; Finnish Transport and Communications Agency **Traficom**, «Ajoneuvojen avoin data», licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); **Dirección General de Tráfico (DGT)**, microdati delle immatricolazioni; **Ufficio federale delle strade (USTRA/ASTRA)**, dati di omologazione TAS. Dati aggiornati al {generatedAt}. Intervalli e schede dai libretti e dai siti ufficiali dei costruttori, citati in ogni scheda. Nessuna di queste fonti partecipa a Revkeeper né lo sostiene. Dati forniti senza garanzia: verifica sempre sul libretto. Marchi e nomi dei modelli appartengono ai rispettivi proprietari.

In pratica le aggiunte sono:

- «aggregati per modello»;
- il nome completo di Traficom e della DGT;
- la data di aggiornamento (da `_brands.json.generatedAt`);
- la frase sull'avallo (richiesta dalla DGT);
- l'esclusione di garanzia (CC BY);
- i marchi.

**Scheda moto (`src/BikeForm.tsx`, `SpecSource`)**

- Va già bene: «Compilati da registri ufficiali: … Traficom (CC BY 4.0). Puoi modificarli.»
- Facoltativo: rendere «Traficom» un link a [avoindata.fi](https://avoindata.fi/data/en/dataset/ajoneuvojen-avoin-data) e scrivere «Direzione generale del traffico (DGT)» per esteso.
- Non serve ripetere le altre clausole: rimanda ad Account.

**Manutenzione (`src/Maintenance.tsx`)**

- «Fonte intervalli: titolo (pag. N)» con il link più «controlla il libretto» basta.
- Facoltativo: «© del costruttore; riportati solo i valori».

**Repo (`README.md`, oppure un `data/README.md`)**

- Serve perché `data/eu-models.json` e `src/data/catalog/*.json` sono dati Traficom adattati, ridistribuiti in un repo pubblico.
- Testo proposto: «I file in `data/` e `src/data/catalog/` contengono dati elaborati da Traficom (Ajoneuvojen avoin data, CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), DGT (microdati delle immatricolazioni, Ley 37/2007), Ufficio federale delle strade (USTRA, permesso scritto del 23/11/2026) e NHTSA vPIC. I dati sono aggregati per modello e forniti senza garanzia.»
- Senza un LICENSE il codice resta «tutti i diritti riservati». Va bene, ma la parte Traficom dei dati resta comunque CC BY per chi la riusa.

## 5. Fonti consultate

- NHTSA, Terms of Use: https://www.nhtsa.gov/about-nhtsa/terms-use
- vPIC API: https://vpic.nhtsa.dot.gov/api/
- NHTSA, uso di loghi e grafiche: https://www.trafficsafetymarketing.gov/guidelines-using-nhtsa-graphics-and-media-assets
- Traficom, Use and licences of data: https://traficom.fi/en/use-and-licences-data
- Dataset Traficom: https://avoindata.fi/data/en/dataset/ajoneuvojen-avoin-data/resource/00041d67-966e-48cf-a720-255faf09d55c
- CC BY 4.0, testo legale: https://creativecommons.org/licenses/by/4.0/legalcode
- DGT, pagina dei microdati: https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/dgt-en-cifras-detalle/Microdatos-de-Matriculaciones-de-Vehiculos-mensual/
- datos.gob.es, scheda del dataset: https://datos.gob.es/es/catalogo/e00130502-microdatos-de-matriculaciones-de-vehiculos-mensual
- datos.gob.es, aviso legal: https://datos.gob.es/es/aviso-legal
- Sede DGT, proprietà intellettuale: https://sede.dgt.gob.es/es/contenido/derechos-sobre-la-propiedad-intelectual/
- ASTRA, panoramica dei prodotti informativi: https://www.astra.admin.ch/dam/en/sd-web/BakiDqfaJMx8/01%20Overview%20vehicle%20data%20information%20products-20260701.pdf
- Permesso scritto ASTRA: `issues/304-richiesta-di-licenza-ad-astra.md`
- Direttiva 96/9/CE: https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:31996L0009
- L. 633/1941, art. 102-bis: https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art102bis
- Sentenze della Corte di giustizia: C-5/08 Infopaq, C-203/02 BHB, C-604/10 Football Dataco, C-30/14 Ryanair, C-762/19 CV-Online (link sopra). Commenti a C-30/14 e C-762/19: https://legalblogs.wolterskluwer.com/copyright-blog/ryanair-ltd-v-pr-aviation-bv-contracts-rights-and-users-in-a-low-cost-database-law/ e https://www.twobirds.com/en/insights/2021/uk/cv-online-latvia-cjeu-complicates-the-enforcement-of-database-rights

**Non verificato:**

- il testo della licenza Honda Motopub (pagina dinamica, non leggibile da script);
- i termini di Kawasaki techinfo, Yamaha e BMW;
- le pagine NHTSA e opendata.swiss, che rispondono 403 agli script: per NHTSA il testo viene dall'indice di ricerca.
