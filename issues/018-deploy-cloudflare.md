---
id: 18
title: "Deploy su Cloudflare Pages"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [17]
---

## Question

Pubblicare la PWA su Cloudflare Pages e il Worker sullo stesso dominio, con `wrangler` e il token API. Poi controllare installazione su Android e iOS, uso offline e Lighthouse con `perf-profiler`; a11y con `design:accessibility-review`.

## Resolution

Online su **https://revkeeper.pages.dev**.

- Il deploy diretto con `wrangler pages deploy` non funziona da questa sessione: il proxy sostituisce il JWT di upload di Pages con il token API (errore 8000013). Ho cancellato il progetto vuoto e l'utente ha collegato GitHub a Cloudflare Pages: build `npm run build`, output `dist`, branch di produzione `ccr-3be8ff15-0a5n6d`, Node 22 da `.node-version`. **Ogni push su quel branch ripubblica** (limite gratuito: 500 build al mese).
- Risorse create: D1 `revkeeper` in giurisdizione eu (`155ba912-464e-4fd1-b2ea-0d223f8c386f`), migrazione applicata in remoto; bucket R2 `revkeeper-files` in eu. Binding e `GOOGLE_CLIENT_ID` letti da `wrangler.toml`, confermati dall'API di Pages.
- Verifiche in produzione: `/`, manifest e `sw.js` rispondono 200, `/api/me` 401; il pulsante Google compare senza errori di origine. Lighthouse mobile: **performance 97, accessibilità 100, best practice 100**, LCP 2,1 s, CLS 0, TBT 20 ms.
- Correzione: fondo bianco dietro il pulsante Google sul tema scuro (`color-scheme` del contenitore).

Da verificare a mano dall'utente: il login Google completo su Android e sull'iPhone con l'app installata nella schermata Home.
