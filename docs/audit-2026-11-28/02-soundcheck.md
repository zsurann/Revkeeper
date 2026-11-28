# Revkeeper: soundcheck security-review e contract-review

Commit analizzato: `9234a1d` (main). Sola lettura: nessun file del repo è stato modificato.

Metodo: le skill `soundcheck:security-review` (OWASP Web e LLM Top 10:2025) e `soundcheck:contract-review` (sulle API in `server/`). In questa sessione non c'era il tool Agent, quindi le fasi (threat model, hotspot, revisione, validazione, catene) le ho fatte io in un solo contesto invece che con i subagenti soundcheck. Ogni finding qui sotto l'ho verificato sul codice. Il loop infinito del pull l'ho riprodotto con `node` sulla stessa funzione `pageOf`. `npm audit --omit=dev`: 0 vulnerabilità.

Legenda: **BLOCCANTE** = sfruttabile da chiunque su internet, senza account, prima del lancio va chiuso. **ALTO** = danno serio, sfruttabile con un account ospite (gratuito e anonimo) oppure in uso normale. **MEDIO** = impatto limitato. **BASSO** = difesa in profondità o igiene.

## Modello di minaccia (sintesi)

- **Superficie:** PWA pubblica e API `/api/*` (Pages Functions, `server/api.ts`), D1 e R2 sul piano gratuito (`QUOTA.dbBytes` = 500 MB, `server/api.ts:533`), più un cron Worker orario con un limite di 50 subrequest.
- **Input non fidati:** tutti i corpi e gli URL delle richieste a `/api`, i token ID di Google e i payload delle iscrizioni push.
- **L'account ospite è anonimo e gratuito:** `POST /api/auth/guest` crea un account senza alcuna prova, limitato solo a 20 ogni 10 minuti per IP. Quindi "serve un account" vale come "chiunque su internet".

## Risultati

| # | Severità | Dove | Problema |
|---|---|---|---|
| 1 | BLOCCANTE | `server/api.ts:115-125, 300-316, 624` | R2 riempibile senza limiti da ospiti anonimi |
| 2 | BLOCCANTE | `server/schema.ts:160-166`, `server/api.ts:127-151` | D1 riempibile da un solo IP in poche ore: servizio giù per tutti |
| 3 | ALTO | `cron/worker.ts:23-30, 53-55, 93` | Un utente "avvelenato" blocca i promemoria di tutti, per sempre |
| 4 | ALTO | `server/api.ts:173-177, 501-513` + `src/sync.ts:76-92` | Eliminare una moto con più di 500 record blocca il sync in un loop infinito |
| 5 | MEDIO | `server/api.ts:71, 610, 217`, `server/google.ts:10, 35` | Corpi malformati danno 500 e consumano la quota Sentry |
| 6 | MEDIO | `server/ratelimit.ts:13, 17`, `server/api.ts:68-69, 116-117, 605-606` | Limiti per IP e CGNAT: utenti legittimi ricevono 429 |
| 7 | BASSO | `server/api.ts:216-237` | `subscribe` senza validazione di tipo e con un falso successo |
| 8 | BASSO | `server/api.ts:276-286` | Quota file non atomica (contratto "D1 li serializza" non vero) |
| 9 | BASSO | `cron/worker.ts:44, 59, 65, 72, 89`, `cron/inactive.ts:210` | Id utente (Google `sub`) inviati a Sentry |

---

### 1. BLOCCANTE: R2 riempibile senza limiti da ospiti anonimi
**Dove:** `server/api.ts:115-125` (guestLogin), `server/api.ts:300-316` (putFile), `server/api.ts:624`, `server/api.ts:17` (`userBytes` 500 MB per utente), `server/ratelimit.ts:13` (login 20 ogni 10 minuti per IP), `server/ratelimit.ts:15` (upload 120 all'ora per utente).

**Problema:** la quota è per utente, ma gli utenti costano zero. Ogni ospite ha 500 MB su R2, e non c'è nessun tetto per IP né globale. I file degli ospiti, inoltre, non servono a nulla:
- i promemoria usano solo i record (`cron/worker.ts:54`);
- al login con Google i dati dell'ospite vengono cancellati (`server/api.ts:80-86`).

`dropStaleGuests` (`server/api.ts:105-111`) rimuove solo gli ospiti senza sessione valida, e le sessioni durano 180 giorni.

**Scenario:** uno script da un solo IP crea 20 ospiti ogni 10 minuti (120 all'ora). Ognuno carica 34 file da 15 MB, cioè 500 MB, entro il limite di 120 upload all'ora. Risultato: circa 60 GB all'ora per IP, che restano su R2 per 180 giorni.
- Superati i 10 GB gratuiti, o R2 si ferma per tutti (nessun utente carica più allegati) o, con un metodo di pagamento collegato, il costo cresce senza tetto.
- Anche la copia settimanale (`cron/backup.ts:161-172`) si satura al tetto di 300 file. Così i file dei veri utenti restano senza copia.

**Fix minimo:**
- Server: in `putFile`, `if (userId.startsWith(GUEST)) return fail(403, 'Allegati solo con account Google')`.
- Client: in `src/sync.ts:39`, saltare l'upload degli allegati quando `getMeta('guest')` è vero. In alternativa aggiungere 403 a `REJECTED` (`src/sync.ts:29`), altrimenti il sync si interrompe.
- In più: un limite per IP sugli upload (`uploadIp` in `RATE`, come `syncIp`) e un tetto globale sui byte (`SUM(bytes)` confrontato con `QUOTA.fileBytes`) prima di `reserve`.

---

### 2. BLOCCANTE: D1 riempibile da un solo IP in poche ore, servizio giù per tutti
**Dove:** `server/schema.ts:160-166` (recordError), `server/api.ts:127-151` (push), `server/api.ts:15` (`recordBytes` 20.000), `server/ratelimit.ts:58-59` (sync 120 all'ora per utente, syncIp 1500 al giorno per IP).

**Problema:**
- Non c'è un tetto al numero di record per utente: ogni UUID nuovo è una riga nuova.
- `recordError` controlla solo i campi noti e accetta qualsiasi chiave extra, quindi ogni record può arrivare a 20.000 caratteri di riempitivo.
- `JSON.stringify(...).length` conta caratteri UTF-16, non byte: con caratteri multibyte si scrivono fino a circa 60 kB per record.

**Scenario:** il limite per IP ammette 1500 lotti × 50 record × 20 kB, cioè circa 1,5 GB al giorno da un solo IP. È tre volte i 500 MB del database gratuito, quindi in circa 8 ore D1 è pieno. Da quel momento ogni INSERT fallisce:
- `INSERT INTO sessions` in `newSession` (`server/api.ts:96`), quindi nessun login né accesso da ospite;
- `push`, quindi nessun sync;
- `rate_limits`.

L'app è giù per tutti gli utenti. Il recupero richiede la cancellazione manuale degli ospiti, con D1 Time Travel che riporterebbe indietro anche i dati legittimi. Bastano un account ospite per IP e nessuna credenziale.

**Fix minimo:**
- In `recordError`, rifiutare (o eliminare) le chiavi non previste per ogni `kind`, e misurare in byte (`new TextEncoder().encode(json).byteLength`).
- In `push`, un tetto di record per utente, per esempio 20.000. Si può fare con un contatore `users.records` aggiornato nello stesso batch, oppure con un `SELECT count(*)` prima di accettare id nuovi.
- Rendere `syncIp` molto più basso per gli ospiti.

---

### 3. ALTO: un utente "avvelenato" blocca i promemoria di tutti, per sempre
**Dove:** `cron/worker.ts:23-30` (ordinamento `ORDER BY COALESCE(u.remind_at,0) ASC`), `cron/worker.ts:53-55` (carica tutti i record dell'utente senza LIMIT), `cron/worker.ts:93` (`done()` solo a fine elaborazione), `server/api.ts:219` (l'iscrizione push controlla solo l'host dell'endpoint, non le chiavi).

**Problema:** `remind_at` viene spostato in avanti solo dopo che l'utente è stato elaborato. Se l'elaborazione supera i limiti di CPU o memoria del Worker, il run muore prima di `done()`. Quell'utente resta il primo in coda anche all'ora successiva, e così via per sempre.

**Scenario:**
1. Un ospite anonimo si iscrive alle push con un endpoint finto ma valido per la regex, per esempio `https://fcm.googleapis.com/fcm/send/x`, con `p256dh` e `auth` qualsiasi.
2. Carica decine di migliaia di record con il problema 2.
3. Ogni ora il cron legge e fa `JSON.parse` di tutti i suoi record, supera CPU o memoria e termina.
4. Nessun altro utente riceve più promemoria. Sentry avvisa, ma il problema si ripete da solo finché qualcuno non cancella l'utente a mano.

Un utente vero con moltissimi record produce lo stesso effetto senza alcuna malizia.

**Fix minimo:** "prenotare" l'utente prima del lavoro pesante: chiamare `done(env, u, now, false)` (o un UPDATE di `remind_at`) subito dopo il calcolo di `due`, poi fare il lavoro e infine aggiornare `last_reminded_at`. Così un crash sposta l'utente in avanti invece di bloccare la coda. In più, il tetto di record del problema 2 e un `LIMIT` sulla query dei record.

---

### 4. ALTO: eliminare una moto con più di 500 record blocca il sync in un loop infinito
**Dove:** `server/api.ts:501-513` (deleteBike: un solo `rev = rev + 1` per tutti i record della moto), `server/api.ts:173-177` (pageOf), `src/sync.ts:76-92` (`pullAll`, un `for(;;)` senza guardia).

**Problema (contratto):** il commento di `pageOf` promette che "pushBatch < pullPage, quindi la pagina non si svuota". La promessa vale per `push`, che usa un rev ogni 50 record, ma non per `deleteBike`, che assegna lo stesso rev a tutti i record della moto (letture, interventi, voci, documenti, allegati).

Con almeno 500 righe allo stesso rev:
- `pageOf` scarta l'intera pagina e restituisce `{rows: [], cursor: since, more: true}`;
- il client salva lo stesso cursore e richiede la stessa pagina all'infinito.

Riprodotto con `node`: 500 righe a `rev` 7 con `since` 6 danno `{"rows":0,"cursor":6,"more":true}`.

**Scenario:** un utente che registra i km ogni giorno ha circa 470 letture in un anno e mezzo, più le voci di manutenzione. Quando elimina la moto, ogni suo dispositivo con il cursore precedente entra nel loop:
- il sync resta bloccato per sempre e nessuna modifica arriva più;
- il telefono martella `/api/sync/pull`, che non ha rate limit, e ogni richiesta legge 500 righe da D1, consumando la quota di letture per tutti.

**Fix minimo:** in `deleteBike`, incrementare `rev` per ogni blocco: aggiungere `UPDATE users SET rev = rev + 1 WHERE id = ?` prima di ogni `UPDATE records ... IN (...)` nel ciclo `chunk(ids, 50)`. In più, una guardia lato client: se `page.cursor === since && page.more`, interrompere e segnalare l'errore.

---

### 5. MEDIO: corpi malformati danno 500 e consumano la quota Sentry
**Dove:** `server/api.ts:71`, `server/api.ts:217`, `server/api.ts:610` (`(await req.json()) as {...}` destrutturato senza controllare che sia un oggetto), `server/google.ts:35` (`token.split` su un valore non stringa), `server/google.ts:10` (`atob` lancia una `DOMException` se la firma contiene caratteri non validi), `server/api.ts:628-632` (gestione degli errori).

**Problema:** il blocco catch converte in 4xx solo `AuthError` e `SyntaxError`. Un corpo `null` (TypeError), una `credential` numerica o una firma con caratteri non base64 producono un 500 e un `console.error`, che `captureConsoleIntegration` (`server/sentry.ts:16`) trasforma in un evento Sentry.

**Scenario:** `POST /api/push/unsubscribe` con corpo `null` richiede solo un cookie ospite e non ha rate limit. Qualche migliaio di richieste esaurisce la quota mensile di Sentry, e i veri errori del lancio non arrivano più. Il contratto API dichiara 400 per un input non valido, ma restituisce 500.

**Fix minimo:**
- Un helper `const body = async (req) => { const b = await req.json(); if (!b || typeof b !== 'object') throw new SyntaxError(); return b }`, usato al posto di `req.json()` in `login`, `push`, `subscribe` e `unsubscribe`.
- In `verifyIdToken`, `if (typeof token !== 'string') throw new AuthError(...)` e `b64urlBytes(sig)` dentro un try che rilancia `AuthError`.

---

### 6. MEDIO: limiti per IP e CGNAT, utenti legittimi ricevono 429
**Dove:** `server/ratelimit.ts:13` (login 20 ogni 10 minuti per IP, condiviso con gli ospiti), `server/ratelimit.ts:17` (syncIp 1500 al giorno per IP), `server/api.ts:68-69`, `server/api.ts:116-117`, `server/api.ts:605-606`.

**Problema:** gli operatori mobili italiani usano molto il CGNAT, quindi molti clienti escono dallo stesso IPv4 pubblico. Il tetto per IP vale per tutti loro insieme, e per gli utenti Google si somma a quello per utente.

**Scenario:** dopo un lancio pubblico, con molti utenti dietro lo stesso IP, scatta il 429 su login e sync. Un attaccante sulla stessa rete può anche consumare apposta il bucket `login` per tenere fuori gli altri.

**Fix minimo:** applicare `syncIp` solo agli account `guest-` (gli utenti Google sono già limitati per utente), e separare il bucket di `guestLogin` da quello del login Google.

---

### 7. BASSO: `subscribe` senza validazione di tipo e con un falso successo
**Dove:** `server/api.ts:219-235`.

**Problemi:**
- `tz` assente supera il controllo, perché `Intl.DateTimeFormat('it', {timeZone: undefined})` è valido; poi `bind(undefined)` fa fallire D1 con un 500.
- `p256dh` e `auth` non sono controllati né per tipo né per lunghezza: un oggetto dà 500, una stringa da MB va salvata.
- Se l'endpoint appartiene già a un altro account Google, l'`ON CONFLICT ... WHERE` non aggiorna nulla, ma la risposta è comunque `{ok:true}` e `notify_hour` viene impostato. L'utente crede di ricevere notifiche che non arriveranno.

**Fix minimo:**
- `typeof tz === 'string'`;
- `typeof p256dh === 'string' && p256dh.length <= 200` (e lo stesso per `auth`);
- controllare `meta.changes` del primo statement e restituire 409 se è 0.

---

### 8. BASSO: quota file non atomica (contratto "D1 li serializza" non vero)
**Dove:** `server/api.ts:275-286`.

**Problema:** l'UPDATE su `users` e l'INSERT su `files` sono due richieste separate. Due PUT concorrenti sullo stesso id vedono entrambi `old_size` NULL e aggiungono entrambi la dimensione. Alla fine `files` contiene una sola riga, mentre `bytes` è contato due volte.

**Scenario:** la quota dell'utente "perde" spazio: compare un falso 507 prima dei 500 MB. Non porta a uno sforamento della quota.

**Fix minimo:** eseguire i due statement in un unico `env.DB.batch([...])` (transazionale) e leggere `old_size` dal primo risultato.

---

### 9. BASSO: id utente (Google `sub`) inviati a Sentry
**Dove:** `cron/worker.ts:44`, `cron/worker.ts:59`, `cron/worker.ts:65`, `cron/worker.ts:72`, `cron/worker.ts:89`, `cron/inactive.ts:210`.

**Problema:** `server/sentry.ts:3-6` dichiara "Niente dati personali", ma i `console.error` del cron includono `u.id`, cioè il `sub` Google, un identificativo personale secondo il GDPR. Diventano eventi Sentry: incoerenza con l'informativa.

**Fix minimo:** togliere l'id dai messaggi o sostituirlo con un hash troncato.

---

## Catene di attacco

**Catena A (BLOCCANTE): ospite anonimo, poi D1 pieno e cron fermo.**
1. Un ospite anonimo crea un account (`/auth/guest`).
2. Si iscrive alle push con un endpoint finto (problema 3).
3. Gonfia i record con chiavi extra (problema 2).

Risultato: in poche ore il database è pieno e l'intera app è giù (nessun login, nessun sync). Ancora prima, il cron dei promemoria muore a ogni giro sullo stesso utente e smette di avvisare tutti. Nella stessa finestra la copia settimanale (`cron/backup.ts:143-155`, tutto il database in memoria) non sta più nei 128 MB del Worker, quindi neanche il backup è utilizzabile.

**Catena B (ALTO): ospiti a raffica, poi R2 e backup.** Gli ospiti creati in serie riempiono R2 (problema 1). Il backup dei file copia al massimo 300 file a settimana (`cron/backup.ts:130`), che vengono consumati dai file spazzatura, e i file dei veri utenti restano senza copia.

## Verificato e a posto (nessun finding)

- **SQL:** tutte le query sono parametrizzate. In `deleteBike` i placeholder sono generati da indici; in `runBackup` la tabella viene da una costante.
- **Accesso:** nessun IDOR. Ogni query è filtrata per `user_id` e le chiavi R2 hanno il prefisso `${userId}/`. `/admin/stats` restituisce 404 a chi non è admin, e solo dati aggregati.
- **Sessioni e login:** token da 32 byte casuali, salvato come SHA-256. Cookie `__Host-` con HttpOnly, Secure e SameSite=Lax, più il controllo di Origin sulle scritture: CSRF coperto.
- **Token Google:** firma RS256, `iss`, `aud`, `exp` ed `email_verified` sono tutti verificati.
- **SSRF:** gli endpoint push sono limitati a una lista di host (la regex non è soggetta a ReDoS).
- **File serviti:** `nosniff`, inline solo per immagini e PDF, CSP `default-src 'none'`. Nessun file di un utente è visibile ad altri utenti.
- **Frontend:** nessun `dangerouslySetInnerHTML`; i link esterni sono filtrati con `^https?://`; CSP restrittiva in `public/_headers`.
- **Segreti:** nella storia git ci sono solo identificativi pubblici (client id Google, chiave pubblica VAPID, DSN Sentry). `VAPID_PRIVATE_KEY` non è mai stata committata.
- **CI:** `ci.yml` ha `contents: read`, e il token Cloudflare è usato solo sui push a main. `catalog.yml` ha permessi di scrittura ma niente input non fidati in `run`.
- **Dipendenze:** `npm audit --omit=dev` riporta 0 vulnerabilità.

**Riepilogo:** 9 finding (2 BLOCCANTI, 2 ALTI, 2 MEDI, 3 BASSI) e 2 catene di attacco. Per applicare i fix c'è `/security-cleanup` (non lanciato: il repo è in sola lettura).
