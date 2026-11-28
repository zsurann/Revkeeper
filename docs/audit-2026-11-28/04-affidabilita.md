# 04 — Affidabilità, prestazioni e limiti del piano gratuito (Revkeeper)

Data: 28/11/2026 · Sola lettura (nessun file del repo modificato) · Lenti applicate: production-readiness, backend-performance-review, perf-eng, frontend-eng.

Limiti Cloudflare usati (documentazione ufficiale, consultata oggi):
- Workers/Pages Functions Free: **10 ms di CPU per invocazione, anche per i Cron Trigger**; 128 MB di memoria; 50 subrequest esterne e 1.000 verso servizi Cloudflare (D1, R2) per invocazione; 100.000 richieste/giorno. C'è un po' di tolleranza, ma un Worker che supera il limite di continuo viene terminato.
- D1 Free: 5 M righe lette/giorno, 100.000 righe scritte/giorno (ogni indice toccato conta come riga scritta in più), 500 MB per database. **Dal 1/9/2026, superato il tetto giornaliero, tutte le query falliscono fino a mezzanotte UTC.**
- R2 Free: 10 GB al mese, poi si paga (R2 vuole un metodo di pagamento).

Tempi misurati in locale (Node su questa macchina, non su workerd: valgono come ordine di grandezza):
- `new Intl.DateTimeFormat(...).format()`: ~56 µs l'uno.
- `JSON.stringify` di 100.000 righe `records`: ~130 ms, 33 MB.
- `crc32` JS su 15 MB: ~46 ms.

Nessun dato reale di traffico, profili o EXPLAIN è disponibile: le stime per 1k/10k utenti sono derivazioni con le ipotesi scritte accanto.

---

## Verdetto: NON PRONTO (prima del lancio servono le correzioni BLOCCANTI)

| # | Gravità | Dove | In breve |
|---|---|---|---|
| 1 | BLOCCANTE | `src/sync.ts:114-117` + `RIPRISTINO.md` §1-2 | Dopo un ripristino del DB ogni telefono cancella i suoi dati locali, anche quelli più recenti della copia |
| 2 | BLOCCANTE | `server/reminders.ts:328-348`, `cron/worker.ts:17-20,41-49` | Il CPU del giro promemoria cresce di ~2,7 ms per utente: con pochi utenti alla stessa ora si superano i 10 ms |
| 3 | BLOCCANTE | `cron/worker.ts:12,28,34,48` | Tetto di 40 utenti/ora + recupero di 6 h + stesso ordine ogni giorno: oltre ~240 utenti alla stessa ora gli stessi utenti non ricevono mai promemoria |
| 4 | ALTO | `cron/backup.ts:140-156` | Copia settimanale del DB tutta in memoria, in una sola invocazione: oltre i 10 ms di CPU e poi i 128 MB; se fallisce, salta anche la pulizia degli inattivi e il controllo della quota |
| 5 | ALTO | `server/api.ts:534-553` | La pagina statistiche admin fa 4 scansioni complete di `records`: a 10k utenti un'apertura può consumare buona parte dei 5 M di letture al giorno e fermare l'API per tutti |
| 6 | ALTO | `server/api.ts:347-395`, `server/zip.ts:62-66,106` | L'export dei dati (diritto GDPR) calcola il CRC in JS su ogni file: ~46 ms di CPU per 15 MB, oltre i 10 ms |
| 7 | ALTO | `functions/api/_middleware.ts:426`, `server/sentry.ts:410-419` | Sentry SDK completo su ogni richiesta `/api`: lo stesso SDK che il cron ha tolto perché costava ~10 ms (`cron/sentryLite.ts:1`) |
| 8 | ALTO | `server/api.ts:18,93`, `src/sync.ts:114-117` | Sessione di 180 giorni senza rinnovo: alla scadenza la sessione si chiude da sola e il telefono cancella le modifiche non inviate e gli allegati rifiutati |
| 9 | MEDIO | `server/api.ts:138-151`, `server/ratelimit.ts:383-386` | Scritture D1: ~5 + 2N righe per ogni invio di sync; a 10k utenti attivi si va oltre le 100k/giorno (D1 si ferma per tutti) |
| 10 | MEDIO | `cron/backup.ts:130,158-173` | File: copiati solo i caricati negli ultimi 8 giorni, al massimo 300 a settimana, tenuti 30 giorni: la maggior parte dei file non ha copia |
| 11 | MEDIO | `server/ratelimit.ts:370,374,392-393` | Limiti per IP (login 20/10 min, sync 1.500/giorno) con IPv4 intero: chi esce dallo stesso CGNAT del gestore mobile riceve 429 |
| 12 | MEDIO | `server/api.ts:631`, `server/sentry.ts:416`, `cron/worker.ts:35,82,98-104` | Monitoraggio: un tetto D1 superato produce un evento Sentry per richiesta (si esaurisce la quota di Sentry); il cron promemoria che salta utenti scrive solo `console.warn` (non arriva a Sentry); nessun controllo su righe lette o scritte |
| 13 | MEDIO | `server/api.ts:533`, `cron/worker.ts:98-104` | R2: 500 MB per utente, nessun tetto globale; la copia dei file raddoppia lo spazio e non viene contata |
| 14 | MEDIO | `src/main.tsx:34-56` | Interruttore "azzeramento": cambiare `EPOCH` cancella IndexedDB su ogni telefono |
| 15 | MEDIO | `src/sync.ts:257-266` | Nessun nuovo tentativo dopo un errore 5xx o 429 e nessun pull quando l'app torna in primo piano |
| 16 | BASSO | `server/api.ts:98` | `DELETE FROM sessions WHERE expires_at < ?` a ogni login, senza indice su `expires_at`: scansione completa |
| 17 | BASSO | `.github/workflows/ci.yml` | Le migrazioni D1 non sono nel deploy: restano un passo a mano, con rischio di pubblicare codice prima dello schema |
| 18 | BASSO | `server/api.ts:408-416`, `:161-169` | Prima si cancellano i file R2, poi il batch D1: se il batch fallisce restano record che puntano a file che non esistono più |

---

## Dettaglio

### 1 — BLOCCANTE — Il ripristino cancella i dati sui telefoni
**Dove:** `src/sync.ts:114-117` (su 401: `clearLocal()` svuota tutti gli store, anche i record `dirty`); `server/api.ts:44-51` (`userOf` richiede una sessione valida e l'utente in `users`); `RIPRISTINO.md` §2 ("Le sessioni non sono nella copia") e §1 (Time Travel).
**Problema:** il piano di ripristino conta sui telefoni ("rimandano al server ciò che manca"). Il codice fa il contrario:
- (a) Ripristino dalla copia settimanale: non ci sono sessioni. Alla prima sync ogni telefono riceve 401 e cancella IndexedDB, compresi i dati più recenti della copia (fino a 7 giorni) e gli allegati che non sono mai arrivati sul server.
- (b) Time Travel a un istante precedente: le sessioni create dopo quell'istante spariscono e succede la stessa cosa.
- (c) Chi ha ancora una sessione valida ha `cursor` oltre `users.rev` ripristinato. Il pull non riceve niente. Le scritture nuove prendono un `rev` più basso del cursore degli altri dispositivi, che quindi non le vedono mai. I record non `dirty` più recenti del ripristino non vengono rimandati.
**Scenario:** un incidente con ripristino dalla copia del sabato fa perdere per sempre a tutti gli utenti i dati da sabato in poi, proprio la copia sul telefono su cui il piano contava.
**Correzione minima:** su 401 di un account Google, non cancellare i dati locali. Tenerli, chiedere di nuovo l'accesso e chiamare `markAllDirty()` dopo il login, come già fa `startAccount`. Il wipe resta solo per l'uscita volontaria. Lato server, dopo un ripristino portare `users.rev` oltre ogni valore già distribuito (per esempio `UPDATE users SET rev = rev + 1000000`) e fare in modo che i client azzerino il cursore e reinviino tutto (un "epoch" di sync restituito da `/sync/pull`). Aggiungere il passo a RIPRISTINO.md.

### 2 — BLOCCANTE — CPU del cron promemoria: costruzioni di `Intl.DateTimeFormat` dentro i cicli
**Dove:** `server/reminders.ts:328-332`: `localParts` costruisce 2 `Intl.DateTimeFormat` a ogni chiamata. `server/reminders.ts:343-348`: `remindAt` chiama `localParts` fino a 24-50 volte. `cron/worker.ts:17-20`: `done()` chiama `remindAt` per ogni utente, anche per chi viene solo saltato (riga 49). Altre chiamate alle righe 41-42 e 48.
**Problema:** ~48 costruzioni per utente ≈ **2,7 ms di CPU per utente** (stima dal tempo misurato in locale). Il piano gratuito dà 10 ms per invocazione del cron, quindi già 4-5 utenti alla stessa ora bastano a superarli.
**Scenario:** l'ora proposta è le 09:00 (`src/Notifications.tsx:46`, `renewGuestPush` riga 32), quindi la maggior parte degli utenti italiani è in scadenza nello stesso giro. Con 1k utenti con notifiche, il giro delle 08:00 UTC prova a elaborare 200 righe (40 complete e le altre saltate) e viene terminato per CPU. Il monitor Sentry va in errore e il recupero (finding 3) cancella i promemoria del giorno. È il caso tipico con 1k utenti, non solo con 10k.
**Correzione minima:** una cache di formatter per fuso, per esempio `const fmt = new Map<string, [Intl.DateTimeFormat, Intl.DateTimeFormat]>()` in `reminders.ts`. Scende di ~50 volte. Poi misurare con `wrangler tail` (`cpuTime` nel log dell'invocazione, si può fare in produzione).

### 3 — BLOCCANTE — Promemoria persi per sempre dagli stessi utenti
**Dove:** `cron/worker.ts:12` (`MAX_USERS = 40`), `:28` (`ORDER BY COALESCE(remind_at,0), u.id`), `:34-36` (`return` al tetto), `:48-50` (oltre 6 h: `done(false)`, giorno saltato), `:52` (`seen++` conta anche chi non ha niente da ricevere).
**Problema:** la capacità è 40 utenti all'ora e conta tutti gli utenti in scadenza, anche quelli con 0 promemoria (la maggior parte, perché si avvisa solo a 30, 7 e 0 giorni). Nella finestra di recupero di 6 h passano al massimo 240 utenti per ora scelta. Gli altri passano al giorno dopo con lo stesso `remind_at`, quindi a parità vince di nuovo `u.id ASC`: **gli stessi ~240 vengono serviti ogni giorno e i restanti mai**. Il messaggio è solo `console.warn`, che `monitored` non raccoglie.
**Scenario:** con 1k utenti alle 09:00, circa 760 non ricevono mai l'avviso "la revisione scade tra 7 giorni" e nessuno se ne accorge.
**Correzione minima:**
- Contare per `MAX_USERS` solo chi riceve davvero una push: `seen++` subito prima dell'invio.
- Il tetto vero è quello delle 50 fetch esterne. Le query D1 rientrano nelle 1.000 subrequest verso Cloudflare, quindi `MAX_USERS` può salire a qualche centinaio dopo il finding 2.
- A parità di `remind_at`, ordinare per `last_reminded_at ASC NULLS FIRST`.
- Trasformare l'avviso di tetto in `console.error`, così arriva a Sentry.

### 4 — ALTO — Copia settimanale del DB in una sola invocazione da 10 ms / 128 MB
**Dove:** `cron/backup.ts:140-156`. Il commento `shortcut:` alla riga 129 lo ammette già. La sequenza è in `cron/worker.ts:118`.
**Problema:** tutte le righe di 4 tabelle stanno in memoria, poi `JSON.stringify`, poi gzip. Stima: 100k righe di `records` (circa 1k utenti × 100 record, ipotesi) richiedono ~130 ms solo di stringify, cioè 13 volte il limite. Verso 3-4k utenti (~300k righe, ~100 MB di stringa più gli oggetti) si supera anche la memoria. Le pagine D1 da 1.000 righe superano le 1.000 subrequest a ~1 M di righe. Il giro settimanale lancia `runBackup`, `runInactive` e `checkQuota` in sequenza: se il backup va in errore, non partono nemmeno la pulizia degli account inattivi (obbligo dell'informativa) e l'avviso di quota.
**Scenario:** dalla prima settimana con qualche centinaio di utenti la copia di riserva fallisce ogni domenica. Resta solo Time Travel a 7 giorni. Il monitor `revkeeper-backup` avvisa, ed è un bene, ma non c'è modo di fare la copia nel piano gratuito.
**Correzione minima:** separare i tre lavori con `Promise.allSettled` o con cron diversi. Per la copia: esportare con `wrangler d1 export` da GitHub Actions (cron settimanale, token già presente), poi `wrangler r2 object put`. Niente limiti di CPU e un SQL ripristinabile direttamente.

### 5 — ALTO — Statistiche admin: scansioni complete su `records`
**Dove:** `server/api.ts:537-552`. `COUNT(DISTINCT user_id) FROM records WHERE updated_at > ?` due volte (non c'è indice su `updated_at`), `GROUP BY kind` su tutta la tabella, `json_extract(...) WHERE kind='bikes'` (la PK parte da `user_id`, quindi scansione completa), più 5 scansioni di `users`. `src/AdminStats.tsx:38-42` la carica a ogni apertura.
**Problema e scenario (stima):** a 10k utenti con 50 record l'uno (500k righe) un'apertura legge ~2 M righe, il 40% del tetto giornaliero. 2-3 aperture più il traffico normale fanno superare i 5 M: **da quel momento ogni query D1 fallisce per tutti gli utenti fino alle 00:00 UTC.** A 1k utenti ~200k righe per apertura, quindi nessun rischio.
**Correzione minima:** indice `records(updated_at)` oppure contare gli attivi da `users.seen_at` (già scritto una volta al giorno), che ha molte meno righe. Togliere `makes` o calcolarlo nel cron settimanale e salvare il risultato.

### 6 — ALTO — L'export GDPR supera la CPU con qualche foto
**Dove:** `server/api.ts:379-386` (`arrayBuffer` di ogni file), `server/zip.ts:62-66` (CRC32 byte per byte in JS), `:106`.
**Problema:** ~3 ms di CPU per MB (misura locale). Un account con 10 foto da 1 MB richiede ~30 ms, il triplo del limite delle Pages Functions gratuite. Lo stream si interrompe a metà e il client (`src/sync.ts:238`, `res.blob()`) riceve un errore o uno ZIP troncato.
**Scenario:** l'utente chiede "Scarica i miei dati" e non riceve mai lo ZIP completo. Il diritto alla portabilità non viene rispettato.
**Correzione minima:** non calcolare il CRC sul server. Usare il bit 3 del ZIP (data descriptor) non basta, perché il CRC serve comunque. Alternative: lasciare i file fuori dallo ZIP e mettere nel JSON gli URL `/api/files/<id>` che il client scarica e impacchetta da sé, oppure fare l'export lato client (`src/localExport.ts` esiste già per la copia locale).

### 7 — ALTO — Sentry SDK su ogni richiesta API
**Dove:** `functions/api/_middleware.ts:426` (`sentryPagesPlugin`), `server/sentry.ts:416-417` (`captureConsoleIntegration`, `tracesSampleRate: 0.05`).
**Problema:** il progetto ha già misurato in `cron/sentryLite.ts:1` che inizializzare l'SDK costa "~10 ms di CPU a giro (oltre il tetto del piano gratuito)". Lo stesso SDK gira su ogni `/api/*`, che hanno lo stesso tetto di 10 ms, più la logica della richiesta (`login` aggiunge la verifica RSA).
**Scenario:** con traffico continuo la tolleranza dell'isolato finisce e si vedono errori 1102 "Worker exceeded CPU" intermittenti su sync e login. Confidenza media: nessuna misura sulle Functions.
**Correzione minima:** misurare con `wrangler pages deployment tail` (`cpuTime`). Se è sopra 5 ms, usare la stessa strada di `sentryLite`: `try/catch` in `handle()` e una sola `fetch` di envelope con `ctx.waitUntil` solo quando c'è un errore.

### 8 — ALTO — Sessione di 180 giorni, nessun rinnovo, cancellazione locale alla scadenza
**Dove:** `server/api.ts:18,93-97` (scadenza fissa, mai prorogata: nessun `UPDATE sessions SET expires_at`); `src/sync.ts:114-117`.
**Problema:** ogni utente Google viene disconnesso dopo 180 giorni anche se usa l'app ogni giorno. Al 401 il client chiama `clearLocal()` senza la conferma che `Account.tsx:72` chiede per l'uscita volontaria. Si perdono le modifiche non ancora inviate e gli allegati rifiutati (507/413), che per scelta "restano sul telefono" (`src/sync.ts:43-48`).
**Scenario:** dopo 6 mesi di uso, un intervento registrato offline e un PDF rifiutato per quota spariscono quando si riapre l'app.
**Correzione minima:** rinnovo scorrevole dentro `userOf`, per esempio una volta al giorno `UPDATE sessions SET expires_at = ? WHERE token_hash = ? AND expires_at < ?` e il cookie riemesso. Insieme al finding 1: su 401 tenere i dati locali.

### 9 — MEDIO — Righe scritte in D1 (100k/giorno)
**Dove:** per ogni `POST /sync/push`: `hit` × 2 (`server/ratelimit.ts:383`, un upsert su una tabella con 2 indici, e a volte un `DELETE` in più), `UPDATE users SET rev` (1), ogni record (tabella + indice `records_pull`, cioè 2 righe) (`server/api.ts:138-151`). Una volta al giorno: `seen_at` (riga 193) e `done()` del cron (`cron/worker.ts:18`).
**Stima (ipotesi: 3 sync al giorno da 3 record per utente attivo):** ~3 × (2-4 + 1 + 6) ≈ 30 righe per utente attivo al giorno, più ~2. **Con 1k attivi ≈ 32k (ok); con 10k attivi ≈ 320k, cioè 3 volte il tetto.** Anche il primo accesso pesa: `markAllDirty` (`src/sync.ts:126-130`) reinvia tutto. Un giorno di lancio con 3k iscrizioni da ~20 record l'uno fa ~150k righe, oltre il tetto. Superato il tetto, D1 rifiuta ogni query per tutti fino a mezzanotte UTC.
**Correzione minima:** passare a Workers Paid ($5 al mese, 50 M di scritture) prima del lancio pubblico è la correzione più piccola. In alternativa: il limite `syncIp` solo dopo `sync`, cioè una sola scrittura quando il primo basta, e niente `DELETE` delle finestre a ogni nuova chiave (spostarlo nel cron).

### 10 — MEDIO — Copertura delle copie dei file
**Dove:** `cron/backup.ts:130` (`MAX_FILES = 300`), `:159` (solo gli ultimi 8 giorni), `:177` (tenuti 30 giorni); `RIPRISTINO.md` §3.
**Problema:** un file ha una copia solo per i 30 giorni dopo il caricamento. Oltre i 300 file a settimana il resto non viene mai copiato (la finestra di 8 giorni scorre). I bucket di produzione e di copia stanno sullo stesso account, quindi un token compromesso o un errore (`deleteStoredFiles`, `dropFile`) cancella entrambe le copie, o la sola che esiste.
**Scenario:** a 1k utenti con 1-2 foto a settimana si superano i 300 file. Una cancellazione sbagliata in `revkeeper-files` è irrecuperabile per i file vecchi, a meno che l'unico telefono li abbia ancora in IndexedDB.
**Correzione minima:** scriverlo nell'informativa e in RIPRISTINO come limite accettato, oppure copiare i file a pagine su più giri (un cursore salvato in R2) e almeno una volta al mese fuori dall'account (rclone da GitHub Actions).

### 11 — MEDIO — Limiti per IP e CGNAT dei gestori mobili
**Dove:** `server/ratelimit.ts:370` (login: 20 ogni 10 min per IP, condiviso con `/auth/guest`, `server/api.ts:117`), `:374` (`syncIp`: 1.500 al giorno), `:392-393` (IPv4 contato per intero).
**Problema:** molti telefoni sulla rete mobile escono con lo stesso IPv4 pubblico (CGNAT). L'attivazione delle notifiche crea un ospite (`src/Notifications.tsx:20`).
**Scenario:** un post che porta molti nuovi utenti nello stesso momento fa ricevere "Troppi tentativi" a chi è dietro lo stesso indirizzo. Il client non legge `Retry-After`. Confidenza media: dipende dalla grandezza dei pool del gestore.
**Correzione minima:** login 20 → ~200 per IP (il vero freno è la verifica del token Google), `syncIp` molto più alto o tolto (`sync` per utente basta). Lasciare più basso solo `/auth/guest`.

### 12 — MEDIO — Monitoraggio: punti ciechi e quota di Sentry
**Dove:**
- `server/api.ts:631` (`console.error(e)` a ogni 500) e `server/sentry.ts:416`: un evento per richiesta. Con il tetto D1 superato sono migliaia di eventi, si esaurisce la quota di Sentry e si resta senza visibilità per il resto del mese.
- `cron/worker.ts:35,82`: il tetto di invii usa `console.warn` e non arriva a Sentry.
- `cron/worker.ts:98-104`: si controlla solo lo spazio, una volta a settimana. Niente sulle righe lette o scritte, né sulla CPU.
- `src/sync.ts:255`: gli errori di sync del client restano in console (`console.warn`) e non vanno a Sentry, quindi un 500 o un 429 ripetuto lato utente non si vede.

**Correzione minima:**
- `beforeSend` con campionamento per gli errori D1 "exceeded", oppure un rate limit dentro Sentry.
- `console.error` per il tetto del cron.
- Un avviso di utilizzo a partire dalle notifiche di Cloudflare (Notifications → D1/Workers usage).
- `Sentry.captureException` solo per gli errori di sync diversi da rete o 401.

### 13 — MEDIO — R2: tetto per utente maggiore del tetto gratuito
**Dove:** `server/api.ts:17` (500 MB per utente), `:533` (10 GB in totale, usato solo per l'avviso), `cron/backup.ts:167` (copie dei file per 30 giorni nello stesso account, non contate).
**Problema:** 20 utenti pieni bastano a riempire i 10 GB. Con le copie lo spazio usato raddoppia. Non è un'interruzione ma un costo che sale senza nessun tetto globale.
**Correzione minima:** abbassare `userBytes` a una cifra sostenibile (per esempio 100 MB), aggiungere a `reserve` un controllo sulla somma globale, contare `BACKUPS` in `checkQuota`.

### 14 — MEDIO — Interruttore di azzeramento locale in produzione
**Dove:** `src/main.tsx:34-56`. Se `localStorage['revkeeper.epoch'] !== EPOCH`, l'app cancella IndexedDB e `localStorage` e annulla le iscrizioni push. Il commento invita: "Per un nuovo azzeramento basta cambiare la data".
**Problema:** dopo il lancio, una modifica sbagliata o un merge cancella i dati di tutti i telefoni, compresi quelli degli utenti che usano solo il telefono (senza account il server non ha copia). Anche un `localStorage` che lancia un'eccezione o viene svuotato dal browser (Safari ITP) fa ripartire il wipe al prossimo avvio, perché la chiave non si trova più.
**Correzione minima:** togliere il blocco prima del lancio pubblico. Se resta, attivarlo solo se il database ha davvero la versione precedente, e mai quando `localStorage` è vuoto e IndexedDB pieno.

### 15 — MEDIO — Sync: niente nuovi tentativi, niente pull in primo piano
**Dove:** `src/sync.ts:257-266`. La sync parte solo con `revkeeper:changed`, `online` e all'avvio. `quiet` registra soltanto l'errore.
**Problema:** dopo un 5xx o un 429 (finding 9 e 11) i dati restano `dirty` finché l'utente non modifica qualcosa o riavvia l'app. Una PWA tenuta aperta in memoria per giorni non riceve le modifiche dell'altro telefono.
**Correzione minima:** `addEventListener('visibilitychange', () => document.visibilityState === 'visible' && later())` e, dopo un errore che non sia 401, un solo nuovo tentativo con backoff (per esempio 30 s, poi 5 min).

### 16 — BASSO — `DELETE FROM sessions WHERE expires_at < ?` senza indice
`server/api.ts:98`: a ogni login e a ogni nuovo ospite legge tutta la tabella `sessions`. A 10k utenti sono ~10k righe lette per login. Correzione: indice `sessions(expires_at)` oppure spostare la pulizia nel cron settimanale. Anche `dropStaleGuests` (`:106-109`) e `runInactive` usano `LIKE 'guest-%'`, che in SQLite con il LIKE senza distinzione di maiuscole non usa la PK: si leggono tutti gli utenti, ma una volta per login o a settimana, quindi accettabile.

### 17 — BASSO — Migrazioni fuori dalla pipeline
`.github/workflows/ci.yml`: il cron viene pubblicato automaticamente, Pages dall'integrazione git, `d1 migrations apply` a mano. Una colonna nuova usata dal codice prima della migrazione dà 500 ovunque. Correzione: un passo `npx wrangler d1 migrations apply revkeeper --remote` prima di `deploy-cron` (le migrazioni attuali sono additive, quindi compatibili all'indietro).

### 18 — BASSO — Ordine delle cancellazioni R2 → D1
`server/api.ts:408-416` (`deleteAccount`) e `:161-169` (`dropFile`): prima R2, poi il batch D1. Se D1 fallisce (per esempio per il tetto giornaliero), l'account resta con file che non esistono più. `deleteAccount` è comunque ripetibile, quindi l'impatto è basso. Correzione: prima D1 (o marcare l'utente come in cancellazione), poi R2.

---

## Cosa succede con 1k e 10k utenti (derivazioni; ipotesi: ~50-100 record per utente, 3 sync al giorno da 3 record per utente attivo, il 50% attivo ogni giorno, la maggior parte con notifica alle 09:00)

| Risorsa | Uso per utente nel codice | 1k utenti | 10k utenti |
|---|---|---|---|
| CPU del cron promemoria | ~2,7 ms per utente in scadenza (finding 2) | **oltre i 10 ms nel giro delle 09:00** | oltre |
| Capacità dei promemoria | 40 utenti/h, 240 per fascia oraria (finding 3) | **~760 mai serviti** | **~9.700 mai serviti** |
| Copia settimanale del DB | tutto in memoria (finding 4) | **CPU oltre il limite** | **memoria e subrequest oltre il limite** |
| Righe D1 lette/giorno (5 M) | reminders ~24 × utenti, pull e sessione ~poche, admin ~4 × record | ok (~0,3 M) | ok senza admin, **rischio con l'admin** (finding 5) |
| Righe D1 scritte/giorno (100k) | ~30 per utente attivo (finding 9) | ok (~16k) | **~160k-320k, oltre** |
| Spazio D1 (500 MB) | ~record × (dati + 2 indici) | ok | da tenere d'occhio (dipende dalla grandezza dei record; `checkQuota` avvisa all'80%) |
| R2 (10 GB) | fino a 500 MB per utente, più le copie | **dipende dalle foto**: costo | costo |
| Richieste Functions (100k/giorno) | ~2-5 per apertura dell'app | ok | ok fino a ~20k aperture al giorno |
| Push esterne (50 per invocazione) | 40 al massimo, più 1 per Sentry | ok | il tetto diventa il collo di bottiglia |

---

## Backup e ripristino

| Aspetto | Stato |
|---|---|
| Time Travel D1 (7 giorni, piano gratuito) | ok, provato (RIPRISTINO.md "Prove") |
| Copia settimanale del DB | funziona oggi; si rompe con la crescita (4) |
| Script `scripts/restore-backup.mjs` | corretto per lo scopo (SQLite di prova, integrità, FK); non ripristina `sessions` né `rate_limits`, come documentato |
| Copia dei file | parziale (10) |
| Ruolo dei telefoni come copia | **non vero oggi** (1, 8): il client cancella su 401 e non reinvia i record non `dirty` |
| RPO | Time Travel ~0 entro 7 giorni; oltre i 7 giorni fino a 7 giorni di dati persi |
| Copia fuori dall'account Cloudflare | assente |

## Offline

- Service worker Workbox con precache, `navigateFallbackDenylist /api`, catalogo per marca con `CacheFirst` (`vite.config.ts`). Va bene.
- IndexedDB come fonte primaria e `navigator.storage.persist()` (`src/App.tsx:253`). Va bene.
- Allegati scaricati solo su richiesta: offline, `getAttachment` (`src/db.ts:105-107`) restituisce `undefined` senza un messaggio specifico (BASSO, non verificato nella UI).
- Problemi: 15 (nessun nuovo tentativo) e 1/8 (cancellazione su 401).

## Lato frontend (lente frontend/perf)

Non ho trovato problemi materiali di rendering: `startAutoSync` e i listener vengono rimossi correttamente (`src/App.tsx:169-189`). `pushAll` e `unsynced` caricano tutti gli store a ogni sync (`src/sync.ts:36,152`): O(n) su pochi record, trascurabile. `pullAll` fa una `put` per transazione (`src/sync.ts:84-88`): il primo accesso con centinaia di record è lento ma va (BASSO). La mancata segnalazione degli errori di sync a Sentry è trattata nel finding 12.

## Cose fatte bene
- La quota per utente con UPDATE condizionale è atomica (`reserve`).
- Il CPU del cron è già stato ottimizzato con `sentryLite`.
- Ci sono monitor Sentry sui due cron.
- L'inserimento di una push subscription è limitato ai soli host dei servizi push.
- `pageOf` evita di saltare record a cavallo tra lotti.
- I test coprono il ripristino e il caso dei record illeggibili.

## Validazione consigliata
- `npx wrangler tail revkeeper-cron --format json`: guardare `cpuTime` e `outcome` del giro delle 08:00 UTC. Si può fare in produzione.
- `npx wrangler pages deployment tail --project-name revkeeper`: `cpuTime` di `/api/sync/*` e di `/api/account/export`. Si può fare in produzione.
- Dashboard D1 → Metrics → Row Metrics: righe lette e scritte al giorno di oggi, da proiettare per utente. Si può fare in produzione.
- Test di carico del cron in locale (non in produzione): `FakeD1` con 1.000 utenti alle 09:00 Europe/Rome in `cron/worker.test.ts`, contando chi riceve la push in 7 giri consecutivi.

Non verificato: dimensione reale del bundle (`npm run build` non eseguito), CPU reale su workerd, grandezza media dei record in produzione e configurazione di Sentry e Cloudflare dal pannello.
