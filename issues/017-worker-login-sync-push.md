---
id: 17
title: "Worker Cloudflare: login e sync"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Un Worker con D1 (giurisdizione eu) e R2: login con Google (ID token di Google Identity Services verificato sul Worker, sessione in cookie `__Host-` HttpOnly, modalità redirect per la PWA su iOS), sync push/pull con la soluzione scelta, allegati su R2, iscrizione alle push con `@block65/webcrypto-web-push` e cron orario per le notifiche a 30 e 7 giorni, il giorno stesso e il promemoria km. Lato app: schermata di accesso, coda di sync, richiesta del permesso per le notifiche.

Tetti per restare nel gratuito: allegato massimo 15 MB e quota di 500 MB per utente su R2, controllata dal Worker prima dell'upload. Sync con debounce di 2 secondi, push a lotti da 50, pull a pagine da 500. Cron orario che legge solo le scadenze dell'ora corrente tramite un indice. Limite di frequenza sulle route del Worker.

Nota: diviso, perché troppo grande per una sessione. Le notifiche push sono passate al ticket "Notifiche push e cron".

## Resolution

Fatto con **Cloudflare Pages Functions** (`functions/api/[[path]].ts` → `server/api.ts`): API sulla stessa origine dell'app, nessun Worker separato. Il cron delle push ne richiederà uno piccolo che condivide lo stesso D1 (ticket "Notifiche push e cron").

- **D1** (`migrations/0001_init.sql`): `users` (con `rev` e `bytes`), `sessions`, `records`, `files`.
- **Login Google**: `POST /api/auth/google` verifica l'ID token (RS256 con le chiavi di Google in cache, `aud`, `iss`, `exp`, email verificata; testato con chiavi generate). Sessione: token casuale, in D1 solo l'hash, cookie `__Host-rk` HttpOnly, Secure, SameSite=Lax, 180 giorni. `POST /api/auth/logout`, `GET /api/me`.
- **Sync**: `POST /api/sync/push` (al massimo 50, `DB.batch`, LWW con spareggio su `deviceId`, kind in lista chiusa, record sotto 100 KB) e `GET /api/sync/pull?since=` (pagine da 500).
- **Allegati**: `PUT`/`GET /api/files/:uuid` su R2, 15 MB per file, **quota di 500 MB per utente** controllata prima del `put`; un allegato cancellato libera subito R2 e quota.
- **CSRF**: le scritture rifiutano un `Origin` diverso.
- **Client** (`src/sync.ts`): flag `dirty` e store `meta` (IndexedDB v2), push poi pull, debounce di 2 secondi, all'apertura e all'evento `online`, upload degli allegati prima del record, download su richiesta. Primo login: tutto il locale va inviato e il cursore riparte da 0. Logout: i dati restano sul telefono. Banner "Unisci?" per moto con stessa marca, modello e targa.
- **Schermata Account** (Garage → "Account e sincronizzazione"): pulsante Google (GIS in modalità popup), ultima sincronizzazione, "Sincronizza ora", "Esci".

Verifiche: 20 test (compresa la firma JWT), `tsc` di client e server, build. E2E con `wrangler pages dev` e D1/R2 locali e una sessione inserita a mano: il dispositivo A crea moto, foto e km; il dispositivo B li riceve con la foto scaricata da R2; la targa modificata su B arriva su A; 9.296 byte contati nella quota; Origin estraneo → 403; token malformato → 401.

Non verificato: il login Google vero (serve il deploy sull'origine autorizzata) e il popup GIS nella PWA installata su iOS. Nessun limite di frequenza: tutte le route tranne il login richiedono una sessione, e il login fa solo una verifica di firma.
