# Revkeeper — Audit OWASP Top 10:2025 + finecomb (correttezza/affidabilità)

- **Data:** 2026-11-28 · **Commit:** `9234a1d` · **Metodo:** revisione statica, sola lettura. Nessun comando di build/test/npm eseguito, nessuna chiamata al servizio live.
- **Perimetro OWASP:** intero repo (src/, server/, functions/, cron/, migrations/, public/_headers, wrangler.toml, .github/workflows, file .env committati).
- **Perimetro finecomb:** server/, functions/, cron/, migrations/, src/db.ts, src/sync.ts, src/localExport.ts, vite.config.ts (+ public/push-sw.js importato dal SW).
- **Contesto di esecuzione:** `server/*` + `functions/api/*` = Cloudflare Pages Functions (server); `cron/*` = Worker schedulato (server); `src/*` = browser (PWA, IndexedDB); `vite.config.ts` = build.
- **Fatto di piattaforma usato (documentazione Cloudflare, D1 Limits):** "Queries per Worker invocation: 1000 (Workers Paid) / 50 (Free)"; un `db.batch()` conta come 1 query. D1 Free: 100.000 righe scritte/giorno, superate le query falliscono fino alle 00:00 UTC. Il codice dichiara più volte di voler restare nel **piano gratuito** (`server/api.ts:11`, `cron/worker.ts:8`, `cron/sentryLite.ts:1`): i finding marcati *[piano Free]* valgono con quella ipotesi (confidenza Media: il piano reale dell'account non è verificabile dal repo).

## Riepilogo

| Severità | N. |
| --- | --- |
| BLOCCANTE | 2 |
| ALTO | 5 |
| MEDIO | 5 |
| BASSO | 7 |

Nessun segreto reale committato (i file `.env.*` contengono solo identificativi pubblici: Client ID Google, chiave pubblica VAPID, DSN Sentry; la chiave privata VAPID non compare nella storia git). Autenticazione Google (firma RS256, iss, aud, exp, email_verified), cookie `__Host-` HttpOnly/Secure/SameSite=Lax, controllo Origin sulle scritture, query D1 tutte parametrizzate, isolamento per `user_id` su record e file R2: nessun IDOR trovato.

---

## BLOCCANTE

### B1 — Esaurimento risorse da parte di anonimi (account ospite illimitati) — A06 Insecure Design / CWE-770 *[piano Free]*
- **File:** `server/api.ts:115-125` (guestLogin), `server/ratelimit.ts:5-9`, `server/api.ts:606` e `:624`.
- **Problema:** chiunque, senza login, crea un account ospite (limite 20 ogni 10 minuti per IP, condiviso con il login Google). Ogni ospite ha quota 500 MB su R2 e 120 upload/ora da 15 MB; l'upload è limitato **solo per utente**, non per IP, e non richiede che esista un record `attachments`. Il sync è limitato a 1500 lotti/giorno per IP × 50 record × 20 KB.
- **Scenario:** da un solo IP: 20 ospiti × 500 MB = 10 GB R2 in ~10 minuti (oltre la soglia gratuita → costi). Sul D1: 1500 lotti × 50 record ≈ 75.000 record ≈ 150.000 righe scritte (record + indice `records_pull`) → supera le 100.000 righe/giorno del piano Free: **tutte** le query di scrittura dell'app (login, sessioni, sync, rate limit) falliscono fino a mezzanotte UTC. Con qualche IP (o un /64 IPv6 diverso) l'effetto è immediato e ripetibile.
- **Fix minimo:** limite per IP anche su `PUT /files` (es. `limited(env,'uploadIp', ipHash)`), quota bassa per gli ospiti (es. 0 o 20 MB: servono solo per i promemoria, che non leggono gli allegati) e rifiuto dell'upload se non esiste un record `attachments` con quell'id; tetto giornaliero globale sulle creazioni di ospiti; valutare Cloudflare Turnstile su `/auth/guest`; alert sull'uso righe D1.

### B2 — Passaggio ospite → Google cancella i file su R2 e non li ricarica mai: perdita permanente degli allegati — finecomb Consistenza / CWE-404-like (data loss)
- **File:** `server/api.ts:80-87` (login → `deleteAccount(env, guest)`), `src/sync.ts:126-130` (markAllDirty), `src/sync.ts:39` (upload solo se `!a.uploaded`).
- **Problema:** al login Google con cookie ospite il server cancella dati **e file R2** dell'ospite ("il resto lo reinvia il telefono"). Il client però rimette solo `dirty: 1`: gli allegati già caricati da ospite hanno `uploaded: 1`, quindi `pushAll` non rifà il `PUT /files`. Il record `attachments` arriva all'account Google, il file no. Nessun punto del codice azzera `uploaded` (verificato con grep).
- **Scenario:** l'utente attiva le notifiche (diventa ospite, `src/Notifications.tsx:20`), aggiunge foto/PDF (caricati su R2 come ospite), poi accede con Google. Da quel momento: secondo telefono → `GET /files/<id>` 404, export ZIP senza file, e dopo un logout (che svuota IndexedDB, `src/sync.ts:177-183`) i file sono persi per sempre. Stesso effetto dopo la scadenza dell'ospite (nuovo ospite + `markAllDirty`).
- **Fix minimo:** in `markAllDirty` togliere anche `uploaded` (`{ ...r, dirty: 1, uploaded: undefined }`) per gli allegati che hanno `blob`; in alternativa, lato server, nel login spostare i file (`files` + oggetti R2) dall'ospite all'account Google invece di cancellarli. Aggiungere un test e2e "ospite con allegato → login Google → file scaricabile da un altro dispositivo".

---

## ALTO

### A1 — 401 durante il sync cancella tutti i dati locali, anche quelli non sincronizzati; le sessioni scadono a 180 giorni fissi — finecomb Errori/Recupero, A07 / CWE-613 + data loss
- **File:** `src/sync.ts:114-117` (`clearLocal()` su `LoggedOut`), `src/sync.ts:209-213` (stesso in deleteBikeEverywhere), `server/api.ts:44-51` e `:91-101` (nessun rinnovo della scadenza).
- **Problema:** qualunque 401 per un account Google svuota IndexedDB senza guardare `unsynced()` (che invece l'uscita manuale controlla, `src/Account.tsx:72`). La sessione dura esattamente 180 giorni dal login, senza sliding renewal.
- **Scenario:** utente attivo da 6 mesi, in garage senza rete registra un intervento con foto; al ritorno online il push riceve 401 (sessione scaduta, o "esci da tutti i dispositivi" da un altro telefono) → modifiche e foto mai inviate cancellate senza avviso.
- **Fix minimo:** su `LoggedOut` non chiamare `clearLocal()` se `unsynced() > 0`: segnare lo stato "accesso scaduto", chiedere di rientrare e poi fare `startAccount`. Lato server rinnovare `expires_at` in `userOf` quando mancano < 30 giorni (una scrittura al massimo al giorno, come `seen_at`).

### A2 — Pull bloccato per sempre se ≥ 500 record condividono lo stesso `rev` (eliminazione moto lato server) — finecomb Invarianti / CWE-835
- **File:** `server/api.ts:171-178` (pageOf), `server/api.ts:501-519` (deleteBike: tutti i tombstone con un solo `rev`), `src/sync.ts:77-93` (loop `for(;;)` finché `more`).
- **Problema:** `pageOf` scarta le righe dell'ultimo `rev` della pagina piena; il commento assume "pushBatch < pullPage, quindi la pagina non si svuota", ma `deleteBike` scrive tutti i record della moto con **un solo** `rev` e senza limite di 50. Se quel `rev` ha ≥ 500 righe, la pagina torna vuota con `cursor = since` e `more: true`.
- **Scenario:** moto con molti anni di letture km (≥ 500 tra letture, voci, interventi, documenti) eliminata online. Ogni altro dispositivo (e lo stesso al prossimo pull) entra in un loop infinito di `GET /sync/pull` (non limitato): il sync non termina mai (`running` resta pendente, quindi nemmeno i push partono più) e il loop consuma le 100.000 richieste/giorno gratuite di Pages.
- **Fix minimo:** in `deleteBike` incrementare `rev` per ogni blocco (es. un `UPDATE users SET rev = rev + 1` prima di ogni chunk da ≤ 50 id); in più in `pageOf`, se `kept` è vuoto, restituire comunque tutte le righe di quel `rev` (o paginare per `(rev, kind, id)`), e nel client interrompere il loop se il cursore non avanza.

### A3 — Lotto di sync con > ~15 allegati eliminati supera il limite di 50 query D1: sync bloccato in modo permanente — finecomb Costo / CWE-400 *[piano Free]*
- **File:** `server/api.ts:154-157` + `:161-169` (fino a 3 query D1 per ogni tombstone di allegato), `src/sync.ts:56-65` + `:100-101` (un errore nel push interrompe anche il pull).
- **Problema:** `push()` usa già ~4 query (sessione, 2 rate limit, batch); poi per ogni allegato cancellato fa SELECT record + SELECT files + batch. Oltre ~15 tombstone di allegati in un lotto da 50 la Function lancia "Too many API requests by single Worker invocation" → 500 *dopo* che il batch è stato scritto. Ai tentativi successivi gli allegati già liberati costano comunque 2 query ciascuno: il progresso si ferma intorno a 22 e il lotto fallisce per sempre.
- **Scenario:** ospite, o account offline, che elimina una moto con 30 foto/PDF (`removeBikeCascade` crea 30 tombstone `attachments` nello stesso lotto). Da quel momento `pushAll` lancia sempre l'errore, `pullAll` non gira mai: il telefono non riceve più nulla e non invia più nulla.
- **Fix minimo:** un'unica query per tutti gli id (`SELECT f.id, f.size FROM files f JOIN records r ... WHERE r.deleted=1 AND f.id IN (...)`), cancellazione R2 con `FILES.delete(array)` e un solo `batch` per DELETE + UPDATE bytes. Più in generale: contare le query per richiesta ed evitare query dentro i loop.

### A4 — Il cron dei promemoria supera il limite di 50 query D1 con ~16 utenti per ora: promemoria persi e doppi — finecomb Capacità / CWE-400 *[piano Free]*
- **File:** `cron/worker.ts:11-12` (MAX_SENDS/MAX_USERS = 40), `:33-94` (per ogni utente: SELECT records, SELECT push_subs, UPDATE `done`, più il DELETE di `sendPush` sui 404/410; 1 query anche per gli utenti saltati).
- **Problema:** i tetti contano gli invii (subrequest esterne), non le query D1. Con 1 + 3×N query il giro si rompe a ~16 utenti. L'eccezione esce dal loop (non c'è try attorno alle query): l'utente a cui la notifica è appena partita non riceve `done(...)` → al giro successivo la riceve di nuovo (fino a 6 ore di recupero). Ora predefinita 9 (`src/Notifications.tsx:31`): molti utenti nella stessa ora.
- **Scenario:** dopo il lancio pubblico 200 utenti alle 9:00 → ~16 serviti all'ora, gli altri superano la finestra di 6 ore e vengono saltati con `done(false)`: le scadenze a 30/7/0 giorni (`server/reminders.ts:6`, uguaglianza esatta) non vengono più notificate, alcuni ricevono doppioni.
- **Fix minimo:** portare MAX_USERS a ~10 contando le query reali (o leggere `push_subs` e `records` di più utenti in una sola query con `IN (...)`, e raggruppare gli UPDATE `done` in un solo `db.batch()` a fine giro); in alternativa piano Paid (1000 query) o un Queue.

### A5 — Limiti per IP incompatibili con il CGNAT mobile — A06 / CWE-770 (disponibilità per utenti legittimi)
- **File:** `server/ratelimit.ts:5` e `:9`, `server/api.ts:68-69`, `:116-117`, `:605-606`.
- **Problema:** login Google e creazione ospite condividono 20 tentativi/10 min **per IPv4**; il sync ha 1500 lotti/giorno per IP. Le reti mobili italiane usano spesso CGNAT (migliaia di clienti dietro un IPv4).
- **Scenario:** al lancio, utenti dello stesso operatore ricevono 429 su "Continua con Google" o "Attiva notifiche", e il sync di tutti si ferma per il resto della giornata quando la somma dei loro lotti supera 1500.
- **Fix minimo:** alzare molto le soglie per IP (servono contro l'abuso massivo, non per singolo utente), separare `login` da `guest`, e affidarsi ai limiti per utente + Turnstile (vedi B1) invece che all'IP.

---

## MEDIO

### M1 — Export ZIP: niente backpressure, tutto l'account in memoria + CRC32 in JS — finecomb Risorse / CWE-400
- **File:** `server/zip.ts:45-72` (tutto il lavoro in `start()`), `server/api.ts:379-386`.
- **Problema:** `start()` legge ogni file da R2 e fa `enqueue` senza attendere `pull`: la coda cresce indipendentemente dalla velocità del client, contrariamente al commento "senza tenere tutto in memoria". Il CRC32 byte per byte in JS su centinaia di MB costa CPU (Pages Free: 10 ms CPU per richiesta).
- **Scenario:** account con 200 MB di foto → superamento dei 128 MB di memoria del Worker o del tetto CPU → export troncato/fallito; è anche l'unico export "portabilità" lato server.
- **Fix minimo:** usare `pull(controller)` per produrre una voce alla volta (iteratore manuale), oppure `TransformStream` con `await writer.ready`; valutare CRC su stream a chunk. Documentare che l'export richiede il piano Paid oltre una certa dimensione.

### M2 — Backup settimanale: > ~45 pagine D1 rompono il giro e fermano anche la pulizia degli inattivi — finecomb Capacità *[piano Free]*
- **File:** `cron/backup.ts:22-32` (1 query ogni 1000 righe per tabella), `cron/worker.ts:118` (backup, inactive e quota in sequenza nella stessa funzione).
- **Problema:** con ~45.000 righe in totale (records cresce di centinaia per utente) il backup supera le 50 query → eccezione; `runInactive` e `checkQuota` non partono più. Il commento `shortcut:` cita CPU/tempo ma non il limite di query.
- **Scenario:** poche centinaia di utenti attivi → il backup fallisce ogni domenica (Sentry lo segnala, ma il ripristino resta solo Time Travel a 30 giorni) e gli account inattivi non vengono mai cancellati (obbligo dichiarato nell'informativa).
- **Fix minimo:** eseguire `runInactive`/`checkQuota` in `try` separati o in un'invocazione distinta; per il backup usare la REST API export di D1 da GitHub Actions, o paginare su più giri.

### M3 — Upload: il client riscrive una copia vecchia dell'allegato dopo il PUT — finecomb Concorrenza / CWE-362
- **File:** `src/sync.ts:36-52` (snapshot letto con `getAll` a riga 36, `d.put('attachments', a)` a riga 52 dopo un upload che può durare secondi).
- **Problema:** se durante l'upload l'utente elimina l'allegato (tombstone) o la moto, il `put` riporta in vita il record vecchio con `blob` e senza `deletedAt`.
- **Scenario:** l'utente carica un PDF da 10 MB, cambia idea e lo toglie mentre il sync è in corso → l'allegato ricompare e viene sincronizzato su tutti i dispositivi.
- **Fix minimo:** dopo il PUT rileggere il record in una transazione e impostare `uploaded: 1` solo se `updatedAt` è invariato (stessa regola già usata alle righe 59-63).

### M4 — Eliminazioni R2 prima del commit D1 (moto/account): stato incoerente se il batch fallisce — finecomb Atomicità / CWE-460
- **File:** `server/api.ts:490-494` poi `:519` (deleteBike), `:408-416` (deleteAccount, usato anche nel login e nel cron).
- **Problema:** gli oggetti R2 vengono cancellati prima del `batch` D1. Se il batch fallisce (limite righe/giorno, errore transitorio) restano record vivi e righe `files` (quota occupata) che puntano a file inesistenti; nel login (B2) il fallimento di `deleteAccount` dopo la creazione della sessione restituisce 500 senza cookie.
- **Fix minimo:** prima il batch D1 (tombstone/DELETE), poi le cancellazioni R2 (idempotenti, ripetibili); un file R2 orfano costa poco, un record senza file no.

### M5 — `deleteBike` + client: le modifiche locali più recenti sulla moto non ancora inviate vengono "pulite" — finecomb Consistenza
- **File:** `src/sync.ts:198-231` (`deleteBikeEverywhere` toglie `dirty` ai tombstone locali dopo il 200), `server/api.ts:432-478`.
- **Problema:** il server decide cosa cancellare sulla propria copia (campo `bikeId` lato server); il client toglie `dirty` ai propri tombstone senza averli inviati. Se un record era stato spostato su un'altra moto offline (`mergeBikes`, `src/db.ts:113-117`) e non ancora inviato, il server lo cancella con `updated_at = now` (più recente della modifica locale) e il pull successivo lo elimina anche in locale.
- **Fix minimo:** fare `syncNow()` (push) prima di `DELETE /bikes/:id`, oppure inviare i tombstone tramite il normale push invece di togliere `dirty`.

---

## BASSO

| ID | File:riga | Problema | Fix minimo |
| --- | --- | --- | --- |
| L1 | `server/api.ts:221-225`, `:235` | `tz` assente: `new Intl.DateTimeFormat('it',{timeZone:undefined})` non lancia, poi `UPDATE ... tz = NULL/undefined` viola `NOT NULL` (migr. 0002) → 500 generico | `if (typeof tz !== 'string') return fail(400, ...)` |
| L2 | `server/api.ts:226-236` | conteggio dei 5 dispositivi e INSERT non atomici: richieste parallele superano `subsPerUser` | condizione nell'INSERT (`... SELECT ... WHERE (SELECT count(*) ...) < 5`) |
| L3 | `server/api.ts:276-287` | `reserve`: UPDATE quota e UPSERT `files` sono due statement separati; due PUT paralleli sullo stesso id contano due volte i byte (quota propria che deriva) | mettere i due statement in un `db.batch()` |
| L4 | `server/google.ts:19-27`, `:39-40` | chiave con `kid` sconosciuto non forza un nuovo fetch: dopo la rotazione delle chiavi Google, login falliti fino alla scadenza della cache | se `kid` manca, svuotare la cache e riprovare una volta |
| L5 | `server/api.ts:54-57` | richiesta di scrittura senza header `Origin` accettata (CSRF mitigato solo da SameSite=Lax) | per i metodi non-GET richiedere `Origin` o `Sec-Fetch-Site: same-origin` |
| L6 | `.github/workflows/ci.yml:15-16`, `:30-31` | action di terze parti per tag mutabile (`@v4`) in un job che riceve `CLOUDFLARE_API_TOKEN` (A08/CWE-829) | fissare le action per SHA; token con permessi minimi solo Workers del cron |
| L7 | `cron/backup.ts:5`, `:46` | backup con email, chiavi `p256dh/auth` delle iscrizioni push e file utente; nessuna cifratura applicativa né scadenza dei backup files oltre 30 giorni verificabile dal codice per gli account cancellati (diritto all'oblio) | documentare in informativa; escludere `push_subs` dal dump o cifrarlo |

---

## Copertura

| Categoria OWASP 2025 | Stato | Note |
| --- | --- | --- |
| A01 Broken Access Control | valutato | tutte le query filtrano per `user_id` da sessione; R2 chiave `${userId}/${id}` con id validato; admin via email verificata; nessun IDOR/SSRF (endpoint push in allowlist) |
| A02 Security Misconfiguration | valutato | `_headers` con CSP rigida, HSTS, XFO; API con CSP `default-src 'none'`; header in produzione non verificati live |
| A03 Supply Chain | parzialmente | lockfile presente; `npm audit` non eseguito (vietato eseguire codice/rete) |
| A04 Cryptographic Failures | valutato | token sessione 256 bit da CSPRNG, salvato come SHA-256; IP salvati solo come hash (salt assente: hash IPv4 invertibile per forza bruta, impatto basso) |
| A05 Injection | valutato | SQL parametrizzato; `${table}` in backup.ts da costante; nessun `innerHTML` |
| A06 Insecure Design | valutato | B1, A5 |
| A07 Authentication Failures | valutato | verifica ID token completa; A1 (scadenza fissa) |
| A08 Integrity Failures | valutato | mass assignment: record validati da `server/schema.ts`; L6 |
| A09 Logging/Alerting | parzialmente | Sentry senza PII; nessun evento per login falliti/429 (non riportato come finding) |
| A10 Exceptional Conditions | valutato | A3, A4, M2, M4, L1 |

finecomb: question list 2.1-2.5 e facet (stato/timing, consistenza, rappresentazione, risorse/costo, validazione) applicati a: endpoint API, sync push/pull, quota R2, cron promemoria/backup/inattivi, IndexedDB client, service worker. Date/fusi: `daysBetween`/`addMonths` lavorano in UTC su date ISO, `today()` locale, `remindAt` ora per ora: nessun bug trovato. Importi: somme in float formattate a 2 decimali, nessun problema rilevante.

**Non controllato:** comportamento in produzione (piano Cloudflare effettivo, header serviti, impostazioni Sentry), CVE delle dipendenze, test e2e, componenti UI fuori dal data layer (solo grep XSS), `scripts/` e `prototypes/`.
