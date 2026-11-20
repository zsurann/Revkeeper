---
id: 100
title: "Mappa: selezione moto guidata ed editor foto"
labels: [wayfinder:map]
status: open
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

## Not yet specified

- Aggiornamento del catalogo curato nel tempo (nuovi modelli ogni anno).
- Rigenerare il JSON da vPIC ogni anno (script da rilanciare).

## Out of scope

- Rotazione, luminosità e contrasto nell'editor foto: non scelti.
- Fonti dati a pagamento (Car2DB e simili): fuori dal vincolo del gratuito.
