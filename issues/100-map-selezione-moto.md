---
id: 100
title: "Mappa: selezione moto guidata ed editor foto"
labels: [wayfinder:map]
status: closed
---

## Destination

Online su revkeeper.pages.dev: nella scheda moto, marca → modello → anno, misure gomme e liquidi si scelgono da menu a tendina con ricerca (resta sempre possibile scrivere). Scelto il modello, i dati tecnici si compilano da soli e restano modificabili. La foto della moto si sistema (zoom e spostamento, con anteprima) prima di confermarla.

## Notes

- Continua la mappa "Mappa: Revkeeper PWA MVP" (000-map.md): stessi vincoli. **Solo piani gratuiti**, ponytail, UI in italiano, design system Strumentazione (`design/SPEC.md`).
- Questa mappa porta anche l'esecuzione: i ticket `task` costruiscono, testano e pubblicano (push su `main` tramite PR = deploy).
- Fonte dei modelli scelta dall'utente: **vPIC (API NHTSA, USA) + elenco curato** nella repo per i modelli europei che vPIC non ha.
- Editor foto: solo **zoom e spostamento**, riquadro 16:9 come nel garage.
- Skill: `frontend-design`, `hzblj-skills:ui-interactions`, `hzblj-skills:ui-motion`, `design:accessibility-review` (combobox accessibile con tastiera e screen reader), `perf-profiler`.
- Tracker: markdown locale in `issues/`, ticket 101+.

## Decisions so far

- Grilling iniziale: elenco da vPIC + curato; menu per marca/modello/anno, gomme, liquidi; dati tecnici precompilati; editor foto con zoom e spostamento; obiettivo: costruito e online.
- [vPIC per le moto e fonti gratuite delle specifiche](101-ricerca-vpic-specifiche.md): vPIC letto una volta da uno script e salvato come JSON statico unito al catalogo curato (niente chiamate dall'app); specifiche solo a mano dalle schede ufficiali per i modelli del catalogo.
- [Prototipo menu a tendina ed editor foto](102-prototipo-combobox-foto.md): combobox che si apre al tocco e filtra, «Usa …» solo senza risultati, marca → modello → anno, precompilazione; editor 16:9 con trascina/pizzica/barra, approvato.
- [Forma e contenuto del catalogo curato](103-catalogo-curato.md): vPIC ripulito + aggiunte EU; varianti unite se i dati tecnici sono uguali; specifiche per Z650 + 20 più venduti; catalog.json generato da script.
- [Costruire l'editor della foto](105-costruire-editor-foto.md): editor a schermo intero con trascina, pizzica e barra di zoom, export 1600×900 JPEG; logica del ritaglio testata.
- [Generare il catalogo da vPIC e aggiunte europee](106-script-catalogo.md): script annuale che produce catalog.json (33 marche, 1.331 modelli, 60 KB) senza quad e con varianti unite.
- [Costruire i menu a tendina della scheda moto](104-costruire-combobox.md): Combobox accessibile per marca → modello → anno, gomme e liquidi; precompilazione da `specsOf` pronta, in attesa dei dati.
- [Specifiche tecniche dei 21 modelli](107-specifiche-modelli.md): Z650 in 3 generazioni + 15 modelli dalle pagine ufficiali; 9 saltati (siti bloccati o generazione cambiata); precompilazione verificata.

## Not yet specified

- Completare le specifiche dei modelli saltati (Vespa, Piaggio, Benelli, Triumph, Africa Twin, Monster) quando i siti sono raggiungibili; aggiungere olio e liquido freni dai libretti.

- Aggiornamento del catalogo curato nel tempo (nuovi modelli ogni anno).

## Out of scope

- Rotazione, luminosità e contrasto nell'editor foto: non scelti.
- Fonti dati a pagamento (Car2DB e simili): fuori dal vincolo del gratuito.
