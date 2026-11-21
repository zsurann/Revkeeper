---
id: 307
title: "Pipeline dei libretti, prima tornata"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Costruire lister, download e estrazione per Honda e Yamaha (le marche con i libretti più accessibili), con verifica di un agente su ogni modello; aggiungere a intervals.json i modelli più venduti delle due marche non ancora presenti.

## Resolution

Fatto in parte. Note, URL e pagine: [research/307-libretti.md](research/307-libretti.md).

- **Script** `scripts/manuals/fetch-manual.ts` (45 righe, nessuna dipendenza): scarica il PDF in `.cache/manuals/` (mai nel repo), lo converte con `pdftotext -layout` e indica le pagine con il programma di manutenzione; per i simboli grafici si guarda la pagina come immagine con `pdftoppm`. Honda Motopub ha un'API JSON pubblica (modelli → anni → PDF), descritta nelle note.
- **7 modelli aggiunti** a `intervals.json`, tabelle lette sull'immagine della pagina: Honda **Forza 125, Forza 350, X-ADV, NC750X, PCX** (edizione 2025) e **CB650R** (2024); Yamaha **MT-09 2021–2023**. Nomi e alias allineati al catalogo.
- **Saltati**: Yamaha MT-07 2025+, Tracer 9, Ténéré 700, TMAX, NMAX 125, XMAX 300 (il CDN Yamaha non ha un indice e la ricerca risponde 404: i codici dei libretti non si trovano a tentativi).
- Limiti: l'anno d'inizio è quello dell'edizione letta (le edizioni precedenti hanno probabilmente la stessa tabella, ma non sono state lette); voci di pulizia senza chiave escluse.

Verifiche: 36 test (Forza 350 2025 tutta "dal libretto"; MT-09 dal libretto solo 2021–2023); build ok.
