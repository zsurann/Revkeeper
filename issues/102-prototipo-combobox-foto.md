---
id: 102
title: "Prototipo menu a tendina ed editor foto"
labels: [wayfinder:prototype]
status: closed
assignee: claude
blocked_by: []
---

## Question

Come si comportano il menu a tendina con ricerca (apertura, filtro mentre scrivi, "usa questo testo" se non c'è, flusso marca → modello → anno, precompilazione) e l'editor foto (pizzica/trascina, rotella o slider di zoom, anteprima 16:9, conferma/annulla) nello stile Strumentazione? Prototipo cliccabile da provare sul telefono.

## Resolution

Approvato dall'utente dopo due correzioni. Prototipo: [prototypes/selezione-moto.html](../prototypes/selezione-moto.html), https://claude.ai/artifact/KVoTL5gyXHV3ZxGZ9wyKwx

**Menu a tendina** (combobox ARIA: input `role=combobox` + `listbox`):
- Si apre al tocco con tutte le voci; filtra mentre scrivi, senza distinguere maiuscole, spazi e trattini; la parte che corrisponde è in ambra.
- **«Usa …» compare solo quando nessuna voce corrisponde** (scrivendo "Kawa" si vede solo "Kawasaki"). Il nome resta in un solo blocco: prima la riga flex spezzava "Kawa" e "saki" ai due lati, ed era il difetto segnalato.
- Tastiera: frecce, Invio, Esc; `enterkeyhint="done"`.
- Flusso: marca → modello (con gli anni accanto, es. "2017–oggi") → anno limitato agli anni del modello. Modello e anno restano disattivati finché non c'è la scelta precedente.
- Con il modello nel catalogo: chip con cilindrata, potenza, peso e serbatoio, più gomme e liquidi precompilati e modificabili.

**Editor foto** (approvato senza modifiche): a schermo intero dopo la scelta; riquadro 16:9 con griglia dei terzi; trascina, pizzica, rotella o barra per lo zoom (1–4×), doppio tocco per ripartire; la foto copre sempre tutto il riquadro (niente bordi vuoti); Conferma ritaglia a 1600×900, Annulla chiude. Nel CSS serve `#editor[hidden]{display:none}` perché `display:grid` vince su `hidden`.
