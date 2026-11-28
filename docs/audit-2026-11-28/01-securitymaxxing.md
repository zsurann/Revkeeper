# Revkeeper: audit di sicurezza prima dell'apertura pubblica

Skill eseguite, in ordine: `securitymaxxing:ship-check`, poi `securitymaxxing:audit`, poi `securitymaxxing:secrets` (storia git compresa).
Audit in sola lettura: nel repository non è stato modificato nulla.

## Verdetto (ship-check)

```
VERDICT: SHIP WITH CONDITIONS

Blocking (fix before launch):
  1. Non c'è un tetto globale e i limiti per IP sono deboli: un solo IP, creando account ospite,
     riempie D1 (500 MB) in poche ore e il servizio si ferma per tutti (finding A1).

Fix within the first week:
  1. La quota dei file si aggira con upload concorrenti (A2).
  2. Il controllo delle quote gira solo una volta a settimana (A3).
  3. Manca un canale per segnalare vulnerabilità (SECURITY.md / security.txt) (B4).

Accepted for now (and why that's defensible):
  1. DSN Sentry, chiave pubblica VAPID, Google client id, nome ed email del titolare sono nel repo
     e nel bundle: sono pubblici per design, e il nome e l'email li richiede l'informativa.
  2. La sessione dura 180 giorni: il cookie è __Host-, HttpOnly, Secure e SameSite=Lax, e c'è
     "esci da tutti i dispositivi".
  3. I backup su R2 (email, endpoint push) non sono cifrati lato app: il bucket è privato, in UE,
     e la conservazione è documentata in RIPRISTINO.md.

Not verifiable from code — confirm manually:
  1. Le deploy di anteprima di Cloudflare Pages usano lo stesso D1/R2 di produzione (B3).
  2. I permessi del secret CLOUDFLARE_API_TOKEN su GitHub: deve poter fare solo il deploy
     dei Workers.
  3. Gli avvisi di spesa e di utilizzo su Cloudflare (R2, D1, richieste dei Workers) sono attivi?
  4. "Prevent Storing of IP Addresses" è attivo nell'organizzazione Sentry (lo chiedono i commenti
     in server/sentry.ts e src/sentry.tsx).
  5. GitHub secret scanning e push protection vanno attivati quando il repo diventa pubblico.
```

Blocker controllati uno per uno:

| # | Blocker | Esito | Evidenza |
|---|---|---|---|
| 1 | Secret live nel repo o nella build | PASS | vedi la sezione Secrets: nella storia c'è un `.env`, ma contiene solo identificativi pubblici |
| 2 | Endpoint con dati senza autenticazione | PASS | `server/api.ts:576-582`: tutto ciò che viene dopo `/auth/*` richiede `userOf` (cookie, hash SHA-256 e join con `users`) |
| 3 | IDOR | PASS | tutte le query su records, files, push_subs e sessions filtrano per `user_id = userId` della sessione; le chiavi R2 sono `${userId}/${id}` (`api.ts:310,329`) |
| 4 | Injection da endpoint pubblici | PASS | solo query parametrizzate; l'unico SQL dinamico è `${table}` da una costante (`cron/backup.ts:147`) e dei placeholder `?N` (`api.ts:507,516`) |
| 5 | Password | N/A | solo Google OAuth e ospiti |
| 6 | Debug, stack trace, sourcemap | PASS | errori generici (`api.ts:628-633`); sourcemap `hidden`, caricate su Sentry e poi cancellate (`vite.config.ts:13,21,64`); `dist` non contiene `.map` |
| 7 | DB raggiungibile da Internet | PASS | D1 e R2 sono solo binding |
| 8 | TLS | PASS | nessuna verifica disattivata, HSTS attivo |
| 9 | Dipendenze con CVE note | PASS | `npm audit --omit=dev`: 0 vulnerabilità |
| 10 | Upload serviti dalla stessa origine | PASS | `fileHeaders` (`api.ts:319-326`): `inline` solo per immagini raster e PDF, il resto `attachment`; c'è `nosniff` con CSP `default-src 'none'`; i file si servono solo al loro proprietario |

## Mappa della superficie d'attacco

- **Stack**: React 19 e Vite 8 (PWA con Workbox). Le API sono Cloudflare Pages Functions: `functions/api/[[path]].ts` passa tutto a `handle()` in `server/api.ts`, con Sentry come middleware. Il cron è un Worker separato (`cron/worker.ts`). I dati stanno in D1 (`DB`) e in R2 (`FILES`, `BACKUPS`, giurisdizione UE).
- **Rotte pubbliche**: `POST /api/auth/google` (verifica RS256 dell'ID token: iss, aud, exp, `email_verified`, `server/google.ts:29-50`) e `POST /api/auth/guest`. Entrambe hanno un rate limit per IP.
- **Rotte con sessione**: `/me`, `/auth/logout`, `/auth/logout-all`, `/account/export`, `/account/delete`, `DELETE /bikes/:id`, `/sync/push`, `/sync/pull`, `/push/subscribe|unsubscribe|test`, `PUT|GET /files/:uuid`.
- **Rotte admin**: `/admin/stats` richiede un'email presente in `ADMIN_EMAILS`; risponde 404 agli altri e restituisce solo aggregati.
- **CSRF**: per tutte le richieste non GET c'è il controllo `Origin` (`api.ts:54-57,572`), e il cookie ha `SameSite=Lax`.
- **Chiamate in uscita**: le chiavi Google (URL fisso), i servizi push (host in allowlist, `api.ts:212`) e Sentry.
- **Cron**: promemoria ogni ora; la domenica backup, pulizia degli account inattivi e controllo delle quote.

## Findings

### A1 — ALTO (da sistemare prima del lancio): con gli ospiti si esauriscono D1 e R2, e il servizio si ferma per tutti

- **File**: `server/api.ts:115-125` (guestLogin), `server/api.ts:12-20` (LIMITS), `server/api.ts:135` (recordBytes), `server/api.ts:604-606` e `624`, `server/ratelimit.ts:55-59`.
- **Cosa non va**: ogni ospite si crea con una POST anonima e riceve gli stessi tetti di un utente Google (500 MB di file, sync illimitato nel tempo). I limiti di frequenza sono per utente (`upload` 120/h, `sync` 120/h). Per IP valgono solo `login` (20 ogni 10 minuti) e `syncIp` (1500 lotti al giorno). Gli upload non hanno un limite per IP e non c'è un tetto globale: `QUOTA` (`api.ts:533`) serve solo alle statistiche e all'avviso settimanale. Inoltre `recordError` (`server/schema.ts:210-216`) non rifiuta le chiavi sconosciute, quindi ogni record può portare circa 20 kB di riempitivo.
- **Exploit**: da un solo IPv4, con uno script:
  - **D1**: 1500 lotti al giorno × 50 record × 20 kB fanno circa 1,5 GB al giorno. Il database del piano gratuito (500 MB) è pieno in circa 8 ore. Da lì falliscono tutte le scritture, comprese `sessions` e `rate_limits`: nessuno riesce più ad accedere o a sincronizzare.
  - **R2**: 120 ospiti all'ora × 500 MB fanno fino a 60 GB all'ora per IP. Si va oltre i 10 GB gratuiti e la spesa cresce senza limite.
  - Gli ospiti abbandonati restano fino a 180 giorni: `dropStaleGuests` (`api.ts:105-111`) cancella solo quelli senza una sessione valida, e la sessione dura 180 giorni.
- **Fix minimo**:
  1. In `reserve`, aggiungere la condizione `AND (SELECT SUM(bytes) FROM users) + ?3 <= QUOTA.fileBytes*0.9`.
  2. Aggiungere un limite per IP sugli upload, come `syncIp`.
  3. Dare agli ospiti un tetto molto più basso, per esempio 20 MB e qualche centinaio di record (oppure niente file, visto che ai promemoria servono solo i record).
  4. Contare i record per utente in `push` e rifiutare le chiavi sconosciute in `recordError`.

### A2 — MEDIO: la quota dei file si aggira con upload concorrenti

- **File**: `server/api.ts:276-287` (`reserve`).
- **Cosa non va**: l'`UPDATE users ... RETURNING` e l'`INSERT ... files` sono due richieste D1 separate, non un batch. Il commento a `api.ts:275` dice il contrario («D1 li serializza»), ma D1 serializza le singole istruzioni, non la coppia.
- **Exploit**:
  1. Caricare un file X da 15 MB.
  2. Mandare insieme N `PUT /api/files/X` da 1 byte. Ogni `UPDATE` legge ancora `files.size = 15 MB` prima che un'altra richiesta esegua l'INSERT, quindi ognuna sottrae 15 MB.
  3. `users.bytes` scende di circa 15 MB × (N−1) e può andare sotto zero, perché `reserve` non usa `MAX(0, ...)`.
  - Con le 120 richieste all'ora consentite si "guadagnano" circa 1,7 GB all'ora, e il tetto di 500 MB salta. Insieme ad A1 peggiora l'esaurimento di R2.
- **Fix minimo**: eseguire UPDATE e INSERT nello stesso `env.DB.batch([...])`, che è una transazione. L'INSERT va condizionato al successo dell'UPDATE (`INSERT ... SELECT ... WHERE changes() > 0`), oppure si fa l'upsert di `files` per primo e si calcola `bytes` come `SUM(size)` dei file dell'utente.

### A3 — MEDIO: il controllo delle quote gira una volta a settimana

- **File**: `cron/worker.ts:98-104` e `118`.
- **Cosa non va**: `checkQuota` gira solo nel cron della domenica. Lo scenario A1 riempie D1 in ore, e l'avviso arriva fino a 7 giorni dopo.
- **Fix minimo**: chiamare `checkQuota` anche nel giro orario: è una sola query, e la CPU basta.

### B1 — BASSO: il rate limit di login per IP blocca gli utenti dietro CGNAT

- **File**: `server/ratelimit.ts:55`, `server/api.ts:69,117`.
- **Cosa non va**: Google e ospiti condividono un solo contatore, 20 ogni 10 minuti per IPv4 intero. Gli operatori mobili italiani mettono migliaia di utenti dietro lo stesso IP (CGNAT).
- **Scenario**: in un momento di picco, o per mano di un utente ostile sullo stesso operatore, gli utenti legittimi ricevono 429 quando accedono o attivano le notifiche (`src/sync.ts:139-142`).
- **Fix minimo**: contatori separati per `google` e `guest`, e un tetto più alto per Google, dove la vera difesa è la firma del token.

### B2 — BASSO: l'export non ha rate limit

- **File**: `server/api.ts:597`, `347-395`.
- **Cosa non va**: ogni `GET /account/export` rilegge da R2 tutti i file dell'utente, fino a 500 MB, e ne calcola il CRC in JavaScript.
- **Scenario**: insieme ad A1 (molti account pieni) consuma le operazioni di Classe B di R2 e la CPU delle Functions.
- **Fix minimo**: `limited(env, 'export', userId)` con, per esempio, 5 richieste all'ora.

### B3 — BASSO (da verificare): le anteprime di Pages usano i dati di produzione

- **File**: `wrangler.toml:13-22`: un solo blocco `[[d1_databases]]` e `[[r2_buckets]]`, nessun `[env.preview]`.
- **Cosa non va**: le deploy di anteprima (`<ramo>.revkeeper.pages.dev`) girano sullo stesso D1 e R2 di produzione. Se un ramo con codice non revisionato ottiene un'anteprima, ha accesso a tutti i dati.
- **Fix minimo**: aggiungere `[env.preview]` con un D1 e un bucket separati, e su Pages limitare le anteprime ai rami del proprietario (non alle PR da fork).

### B4 — BASSO: non c'è un canale per segnalare vulnerabilità

- **Evidenza**: `SECURITY.md` e `public/.well-known/security.txt` non esistono.
- **Cosa non va**: un repo pubblico senza un canale dichiarato riceve le segnalazioni come issue pubbliche, cioè rende pubblici i dettagli delle falle.
- **Fix minimo**: un `SECURITY.md` con l'email di contatto, e lo stesso indirizzo in `security.txt`.

### B5 — BASSO: le action di GitHub non sono fissate a uno SHA, e una ha permessi di scrittura

- **File**: `.github/workflows/catalog.yml:8-17`, `.github/workflows/ci.yml:15-31`.
- **Cosa non va**: `actions/checkout@v4` e `actions/setup-node@v4` sono tag mobili. Il job `catalog` ha `contents: write` e `pull-requests: write`, e `deploy-cron` usa `CLOUDFLARE_API_TOKEN`.
- **Scenario**: sono action di prima parte, quindi il rischio è basso; ma se il tag venisse compromesso, il codice dell'attaccante girerebbe con il token di scrittura o con il token di Cloudflare.
- **Fix minimo**: fissare ogni action a uno SHA completo e attivare Dependabot per le action.

## Controllati e puliti

- **Autenticazione**:
  - Verifica dell'ID token Google: `alg` fisso a RS256, `kid`, iss, aud, exp ed `email_verified` (`server/google.ts:35-48`).
  - Token di sessione da 32 byte casuali (CSPRNG), salvato come SHA-256 (`api.ts:92-97`). Una sessione nuova a ogni login, e la sessione dell'ospite viene cancellata quando l'ospite passa a Google.
  - Cookie `__Host-`, HttpOnly, Secure, SameSite=Lax (`api.ts:42`). Logout e logout ovunque cancellano le righe lato server.
- **Autorizzazione**:
  - Tutte le query sono legate a `userId`, preso dalla sessione e mai dal body.
  - In `push`, `user_id` e `rev` vengono dal server (mass assignment assente).
  - Admin solo per email verificata in `ADMIN_EMAILS` e mai per gli ospiti (`api.ts:524-529`).
  - Una iscrizione push di un altro account Google non si può spostare (`api.ts:231-232`).
- **CSRF**: controllo di `Origin` su tutte le richieste non GET, più SameSite=Lax. I GET non hanno effetti collaterali, a parte l'aggiornamento di `seen_at`.
- **Injection**: nessuna concatenazione di input nell'SQL. Gli ID sono validati come UUID (`schema.ts:136,142`, `api.ts:240`), quindi niente path traversal su R2. I nomi dentro lo ZIP passano da `safeName` (`api.ts:345`).
- **SSRF**: l'endpoint push è ristretto ai servizi dei browser (`api.ts:212`), e la regex non ha backtracking catastrofico. L'URL delle chiavi Google è fisso.
- **XSS**: nessun `dangerouslySetInnerHTML`, `innerHTML` o `eval` in `src/`. Gli `href` dinamici arrivano dal catalogo incluso nell'app o da URL `blob:` dei propri allegati. La CSP di `public/_headers` non ha `unsafe-inline` per gli script.
- **Upload**: dimensione contata sui byte reali (`api.ts:243-268`); tipo MIME validato con una regex; `Content-Disposition` restrittivo.
- **Header**: HSTS, nosniff, frame-ancestors none, Referrer-Policy e Permissions-Policy, sia sul sito statico sia sulle risposte delle API.
- **Errori e log**: risposte generiche al client. Sentry è configurato senza utente, cookie, header, body o query (`server/sentry.ts:117-120`, `src/sentry.tsx:16,24`). Gli IP si usano solo come hash nelle chiavi del rate limit.
- **Supply chain**: 0 CVE in produzione. CI su `pull_request`, non `pull_request_target`: le PR da fork non vedono i secret, e il deploy parte solo su push a `main`.
- **Logica**: la sync last-write-wins ha un pareggio deterministico; la cancellazione di un allegato libera la quota solo se il tombstone ha vinto (`api.ts:154-157`).

## Secrets (storia git compresa)

**Comandi eseguiti**:
- `git ls-files` filtrato per nomi sensibili;
- `git log --all --diff-filter=A --name-only`;
- `git log --all -p` con grep, redatto, per `GOCSPX-`, `sntrys_`, `BEGIN … PRIVATE KEY`, `AKIA`, `AIza`, `ghp_`, `github_pat_`, `xox[bp]-`, `sk-`, `re_`, assegnazioni a `VAPID_PRIVATE_KEY`, `CLOUDFLARE_API_TOKEN`, `SENTRY_AUTH_TOKEN`, `client_secret`, JWT `eyJ…`, chiavi JWK `"d":` e stringhe base64url da 43 caratteri;
- i nomi dei file in ogni albero di commit (`.env*`, `.dev.vars`, `.npmrc`, `*.pem`);
- branch: `main` e `ccr-1c351ae0-eetadd`, sia locali sia remoti; nessuno stash, nessun tag;
- email degli autori dei commit: solo indirizzi noreply.

| Secret | Dove | Nella storia? | Ancora valido? | Raggio | Azione |
|---|---|---|---|---|---|
| `.env` (VITE_GOOGLE_CLIENT_ID `517496…77ma`, VITE_VAPID_PUBLIC_KEY `BCuIIL…7PsQ`) | aggiunto in 124dfbc, rimosso in 5a50059 | sì | sì | nullo: sono identificativi pubblici, già nel bundle | nessuna |
| SENTRY_DSN (`3198cf…`, `0a1c83…`) | `wrangler.toml:8`, `cron/wrangler.toml`, `.env.production` | sì | sì | invio di eventi falsi o spam a Sentry, nessuna lettura | nessuna (eventualmente rate limit sul progetto Sentry) |
| VAPID_PRIVATE_KEY, SENTRY_AUTH_TOKEN, CLOUDFLARE_API_TOKEN, ADMIN_EMAILS | solo come secret di Pages, del Worker e di GitHub (`README.md:80,89`, `ci.yml`) | no | — | — | nessuna; verificare che `CLOUDFLARE_API_TOKEN` abbia solo il permesso di deploy dei Workers |

**Esito**: nessun secret da ruotare. Prima di rendere pubblico il repo conviene comunque attivare GitHub secret scanning e push protection, e aggiungere `gitleaks` come pre-commit o come step di CI.

## Copertura e limiti

- Non ho eseguito l'app, non ho fatto PoC concorrenti per A2 (lo scenario è ricavato dalla sequenza delle query) e non ho visto le impostazioni di Cloudflare, Sentry e GitHub.
- Ho escluso dalla revisione `scripts/` (girano solo in CI o in locale su dati pubblici), `prototypes/` ed `e2e/`.

## Da fare per primo

1. **A1**: tetto globale nella `reserve`, tetti bassi per gli ospiti e rate limit per IP sugli upload. È il guasto più probabile il giorno dopo il lancio.
2. **A2**: `reserve` in un solo batch: una modifica di poche righe.
3. **A3 + B4**: `checkQuota` anche nel giro orario, e un `SECURITY.md`.

→ Recommended next: `/securitymaxxing:fix` su A1–A3, poi di nuovo `/securitymaxxing:ship-check`.
