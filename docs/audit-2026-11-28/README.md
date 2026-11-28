# Controllo pre-lancio del 28/11/2026

Sei controlli indipendenti in sola lettura su `main` a `9234a1d`. I report completi sono in questa cartella; qui il riassunto, con i duplicati uniti. Le correzioni e le decisioni sono nella mappa [Mappa: pronti al lancio pubblico](../../issues/600-map-lancio-pubblico.md).

| Report | Strumenti |
|---|---|
| [01-securitymaxxing.md](01-securitymaxxing.md) | securitymaxxing: ship-check, audit, secrets (storia git) |
| [02-soundcheck.md](02-soundcheck.md) | soundcheck: security-review, contract-review |
| [03-owasp-finecomb.md](03-owasp-finecomb.md) | OWASP Top 10:2025, finecomb |
| [04-affidabilita.md](04-affidabilita.md) | audit-suite prod-readiness / perf / frontend, backend-performance-review |
| [05-pwa-perf.md](05-pwa-perf.md) | perf-profiler (Lighthouse 12.8), PWA a mano, pwa2play, Playwright e2e |
| [06-a11y-ui-legale.md](06-a11y-ui-legale.md) | a11y-enforcer, axe-core su 25 schermate, audit-suite a11y/UX, ui-review, GDPR |

## Verdetto

**Non ancora pronta al 100%.** Il codice è pulito sui fronti classici (nessun IDOR, SQL parametrizzato, token Google verificato bene, cookie `__Host-`, CSP e HSTS presenti, 0 CVE nelle dipendenze di produzione, nessun segreto da ruotare). I problemi sono di **affidabilità sotto carico o abuso** e alcuni **bug di sync che perdono dati**.

## Punti di partenza verificati

- `npm run build` verde, `npm test` 121/121.
- `npm audit --omit=dev`: 0. Con dev: 4 moderate (glob/minimatch dentro `vite-plugin-pwa`, solo in build).
- Lighthouse mobile live: perf 95, a11y 100, best practices 100, SEO 100.
- axe-core: 0 violazioni su benvenuto, scheda moto, account, garage, legali, installazione. Contrasto AA in entrambi i temi.
- Offline dopo la prima visita: funziona, deep link compresi.
- e2e: 38 passati; i falliti dipendono da WebKit mancante qui, più 1 test instabile (`gesture.e2e.ts:168`).

## BLOCCANTI

1. **Un solo IP può fermare il servizio per tutti** (trovato da 4 report su 4). Gli ospiti si creano senza login (20 ogni 10 min per IP) con gli stessi tetti di un utente Google: 500 MB di R2 a testa, sync senza tetto di record, chiavi extra accettate. D1 piena o oltre le 100k scritture al giorno ⇒ login e sync giù per tutti. `server/api.ts:115-151, 624`, `server/schema.ts:160-166`, `server/ratelimit.ts`.
2. **Sync bloccato per sempre** (verificato). `deleteBike` dà lo stesso `rev` a tutti i tombstone; con 500+ righe `pageOf` risponde pagina vuota con `more: true` e il client chiede la stessa pagina all'infinito. In più un lotto con >~15 allegati eliminati supera le 50 query D1 per richiesta e i retry non finiscono. `server/api.ts:154-178, 501-519`.
3. **Dati persi sul telefono** (verificato). Qualunque 401 svuota IndexedDB anche con modifiche non inviate (`src/sync.ts:114-117`). Capita a fine sessione (180 giorni fissi, nessun rinnovo, `server/api.ts:18,93`) e dopo ogni ripristino del DB (RIPRISTINO.md conta sui telefoni come copia: oggi non regge; in più `users.rev` torna indietro).
4. **Allegati persi passando da ospite a Google.** Il login cancella i file R2 dell'ospite (`server/api.ts:80-87`) ma il client li tiene `uploaded: 1` e non li ricarica (`src/sync.ts:39,128`).
5. **Promemoria che non arrivano.** Tetto 40 utenti/ora (in pratica ~16 per il limite di 50 query D1), stesso ordine `id ASC` ogni giorno, quasi tutti alle 09:00; ~48 `Intl.DateTimeFormat` per utente sul limite di 10 ms CPU; un utente pesante che fa morire il giro resta primo in coda (`remind_at` aggiornato dopo). L'avviso è solo `console.warn`. `cron/worker.ts`, `server/reminders.ts:328-348`.
6. **Legale (GDPR).** L'informativa promette export ed eliminazione da Account, ma gli ospiti (che hanno targa, telaio e allegati sul server) non hanno né l'uno né l'altra. `src/Legal.tsx:41`, `server/api.ts:609-612`.
7. **Interruttore `EPOCH`** in `src/main.tsx:34-56`: cambiare la data cancella i dati di ogni telefono. Da togliere prima del lancio.

## ALTI

- Copia settimanale del DB tutta in memoria in una sola invocazione: salta con ~1k utenti e si porta dietro pulizia inattivi e controllo quota (`cron/backup.ts:140-156`, `cron/worker.ts:118`).
- Statistiche admin: 4 scansioni complete di `records` (`server/api.ts:537-552`).
- Export ZIP: CRC32 in JS e tutto in memoria (`server/zip.ts`).
- SDK Sentry completo su ogni `/api` (`functions/api/_middleware.ts`), mentre il cron l'ha già tolto per la CPU.
- Limiti per IP che colpiscono utenti veri dietro CGNAT degli operatori mobili.
- Pulsante Google caricato alla prima schermata, prima di ogni scelta: Google riceve IP e user-agent (`GoogleButton.tsx`, `Welcome.tsx:96`).
- Accessibilità: i fogli dal basso non trattengono il focus (`ui.tsx:133-161`); al cambio pagina focus sul body e `<title>` fisso (`App.tsx:386-393`).
- Prestazioni: la pagina di installazione scarica tutto il chunk da 515 kB perché `main.tsx` importa `App` e `Legal` subito.

## MEDI e BASSI (scelta)

- `reserve` con UPDATE e INSERT separati: con PUT concorrenti `users.bytes` scende e il tetto salta (`server/api.ts:276-287`).
- Corpo `null` o `credential` non stringa ⇒ 500 ed evento Sentry (quota Sentry esauribile).
- `checkQuota` solo la domenica; nessun retry del sync dopo 5xx/429.
- `/account/export` senza rate limit.
- Anteprime Pages su D1/R2 di produzione (nessun `[env.preview]`): da verificare nel pannello.
- `loadBrand` offline senza `.catch` (`BikeForm.tsx:102`).
- `/.well-known/assetlinks.json` risponde con l'HTML della SPA; manifest senza `id`, `screenshots`, maskable 192.
- Mancano `SECURITY.md` / `security.txt`; action GitHub non fissate a SHA.
- A11y minori: "Nuova voce" senza etichetta, Cruscotto senza h1, `role="alert"` su un pulsante, focus invisibile sugli input file, editor foto solo trascinando.

## Da controllare a mano (fuori dal codice)

- Cloudflare: piano reale dell'account, avvisi di spesa, permessi di `CLOUDFLARE_API_TOKEN`, binding delle anteprime.
- Sentry: opzione "non salvare gli IP" attiva.
- CPU reale con `wrangler tail` (`cpuTime`) e righe D1 lette/scritte oggi.

Le cifre su carico e CPU vengono dal codice, dalla documentazione Cloudflare e da prove in Node, non da misure in produzione.
