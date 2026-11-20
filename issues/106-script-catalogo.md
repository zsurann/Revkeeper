---
id: 106
title: "Generare il catalogo da vPIC e aggiunte europee"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Script `scripts/build-catalog` che legge vPIC (una chiamata per marca e anno, con pause; marche italiane), ripulisce (via ATV/UTV, marche unite, varianti senza differenze tecniche unite con alias) e fonde `data/catalog-extra.json` (modelli europei mancanti). Produce `src/data/catalog.json`, controllato da un test (nessuna marca doppia, anni validi, peso del file ragionevole). Da rilanciare ogni anno.

## Resolution

Fatto.

- `scripts/build-catalog.ts` (`npm run catalog`, Node 22 con type stripping): 33 marche vendute in Italia mappate ai nomi vPIC (anche i doppi: KTM/KTMMEX, VESPA/PIAGGIO AND VESPA, BENELLI Q.J.); anni dal 2008 all'anno prossimo; 4 richieste alla volta con retry; vPIC a volte risponde 200 con HTML, quindi si riprova e poi si salta segnalandolo. Malaguti è tolta (il nome con i punti rompe l'URL di vPIC).
- `src/domain/catalogBuild.ts`: scarta ATV, UTV e side-by-side (Brute Force, Teryx, KFX, Bayou, Ridge…) e le voci aggregate con `/` o `,`; unisce gli allestimenti che non cambiano la scheda (ABS, SE, KRT, Special/Limited Edition, Anniversary) tenendoli come alias; anni da–a, `to: null` se ancora in produzione; marche popolari prima (`popular`), poi alfabetiche.
- `data/catalog-extra.json`: modelli europei aggiunti a mano (Honda SH125i/150i/350i, Forza, X-ADV; Piaggio Liberty, Beverly, Medley, MP3; Vespa Primavera, Sprint, GTS; Kymco; SYM; Benelli TRK 502/702, Leoncino; Yamaha NMAX, XMAX, Tracer 7) ed eventuali esclusioni. Qui vanno anche le specifiche del ticket "Specifiche tecniche dei 21 modelli".
- Risultato: `src/data/catalog.json`, 33 marche e 1.331 modelli, 69 KB (circa 12 KB gzip). Z650 presente dal 2017, con "Z650 S" e "Z650RS" separate.

Verifiche: 29 test (pulizia nomi, unione anni e varianti, esclusioni, validità del catalogo generato: niente marche doppie, anni sensati, Z650 presente, peso sotto 400 KB); build ok.
