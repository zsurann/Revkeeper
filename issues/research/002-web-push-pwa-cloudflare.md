# 002 — Web Push da PWA con backend su Cloudflare Workers

Data ricerca: 2026-11-20. Target: Android Chrome + iOS/iPadOS Safari >= 16.4 (PWA installata sulla Home).

## Risposta breve

Si può fare con un solo Worker sul piano gratuito:

- **VAPID**: una coppia di chiavi P-256 generata una volta. La privata va in un secret del Worker (`wrangler secret put`), la pubblica nel client per `pushManager.subscribe()`.
- **Libreria**: `@block65/webcrypto-web-push@2.0.0` (solo Web Crypto, aes128gcm + VAPID, ha un esempio ufficiale Workers + D1). Alternativa a dipendenze zero: `@pushforge/builder@2.0.5`. Non usare `web-push` (dipende da Node crypto) e non usare `@block65` 1.x, che usa `aesgcm` e Apple lo rifiuta.
- **Scheduling**: un Cron Trigger giornaliero (in UTC) che legge da D1 le scadenze del giorno e invia una push per ognuna.
- **Storage**: D1, non KV. Serve una query per data ("scadenze di oggi"), e KV sul piano gratuito permette solo 1.000 scritture al giorno e non ha query.
- **iOS**: la push funziona solo se la PWA è installata sulla Home. Il permesso va chiesto da un gesto dell'utente. Ogni push deve mostrare una notifica, altrimenti Safari revoca la subscription.
- **Dati lato server**: subscription anonima (endpoint + chiavi) + lista `{dueDate, label}` (o solo `dueDate` + un id opaco, se vuoi zero contenuto in chiaro sul server).

## Architettura consigliata

```
PWA (IndexedDB = fonte di verità)
  │ 1. click "Attiva promemoria" → Notification.requestPermission()
  │ 2. reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })
  │ 3. POST /subscribe  { subscription, reminders: [{dueDate, label}] }
  │ 4. a ogni modifica locale: PUT /reminders (sync completo della lista, idempotente)
  ▼
Cloudflare Worker
  ├─ fetch(): /subscribe, /reminders, /unsubscribe  → D1
  └─ scheduled() (cron "0 7 * * *" UTC): SELECT scadenze di oggi → buildPushPayload → fetch(endpoint)
         └─ risposta 404/410 → DELETE subscription (non è più valida)
  ▼
Push service (FCM per Chrome, *.push.apple.com per Safari) → service worker → showNotification()
```

Note operative:

- **Identità anonima**: il client genera un `deviceId` casuale (UUID) e lo tiene in IndexedDB. Il server usa come chiave la coppia `deviceId` + `endpoint`. Non servono account. Per evitare che chiunque cancelli o sovrascriva i dati di un altro, basta un segreto casuale per device inviato in header (si salva solo il suo hash).
- **Sync**: il client manda sempre la lista completa (replace), così il server non deve fare merge. Le liste sono piccole.
- **Il service worker** deve chiamare `event.waitUntil(self.registration.showNotification(...))` in ogni ramo dell'handler `push`, anche quando c'è un errore (con un testo di fallback). Su Safari una push senza notifica conta come "silent" e porta alla revoca.
- **Payload**: usa il formato JSON di Declarative Web Push (`{"web_push": 8030, "notification": {"title", "body", "navigate"}}`). Da iOS 18.4 Safari mostra la notifica anche senza JS. I browser più vecchi e Chrome lo ricevono come normale JSON e lo gestisce l'handler del service worker. Tienilo sotto qualche centinaio di byte.
- **Fuso orario**: i cron girano in UTC. Salva `dueDate` come data locale (`YYYY-MM-DD`) e, se l'ora conta, anche il fuso o l'offset del device (`tz`). Un solo cron giornaliero va bene se basta "una volta al giorno, circa". Per "alle 9 ora locale" serve un cron orario che seleziona chi ha le 9 in quel momento (sempre 1 solo trigger).
- **TTL/urgency**: imposta un `ttl` di qualche ora (es. 12h). Così, se il telefono è offline, il promemoria arriva comunque e non si accumula.

Schema D1 minimo:

```sql
CREATE TABLE subscription (
  device_id   TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  tz          TEXT,               -- es. "Europe/Rome", opzionale
  created_at  INTEGER NOT NULL
);
CREATE TABLE reminder (
  device_id TEXT NOT NULL REFERENCES subscription(device_id) ON DELETE CASCADE,
  due_date  TEXT NOT NULL,        -- YYYY-MM-DD
  label     TEXT NOT NULL,        -- oppure omesso, vedi "Dati minimi"
  PRIMARY KEY (device_id, due_date, label)
);
CREATE INDEX reminder_due ON reminder(due_date);
```

## Libreria scelta + perché

**Scelta: `@block65/webcrypto-web-push` 2.0.0** (npm, pubblicata 2026-09-03, MIT).

- Usa solo Web Crypto: funziona su Workers senza `nodejs_compat`. Il repo dichiara compatibilità con Node, Cloudflare Workers, Bun e Deno.
- La 2.0.0 cifra con **aes128gcm (RFC 8291)** e firma con **VAPID (RFC 8292)**. La 1.x usava `aesgcm`, che **Apple non accetta**: con la 1.x iOS non funziona.
- Il repo contiene un esempio Workers + Hono + D1 e test e2e contro push service reali.
- L'API è minima: `buildPushPayload(message, subscription, vapid)` restituisce un oggetto da passare direttamente a `fetch(subscription.endpoint, payload)`.
- Fa padding di ogni messaggio a 4096 ottetti, quindi il payload massimo è 3993 byte.

```ts
import { buildPushPayload } from '@block65/webcrypto-web-push';
const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
const res = await fetch(sub.endpoint, await buildPushPayload({ data: JSON.stringify(msg), options: { ttl: 43200 } }, sub, vapid));
if (res.status === 404 || res.status === 410) { /* elimina subscription */ }
```

Alternative valutate:

| Libreria | Versione | Note |
|---|---|---|
| `@pushforge/builder` | 2.0.5 (2026-04-23) | Zero dipendenze, Web Crypto. `buildPushHTTPRequest()` → `{endpoint, headers, body}`. Ha una CLI `npx @pushforge/builder vapid` per generare le chiavi (comoda anche se usi block65). Buona seconda scelta. |
| `webpush-webcrypto` | 1.0.5 (2025-04-22) | Funziona ma è fermo da 1,5 anni. |
| `web-push-neo` | 0.1.2 (2026-03-27) | Giovane, pre-1.0. |
| `web-push` (classico) | — | Usa Node `crypto` e https: non gira su Workers. |
| Implementazione a mano RFC 8291 | — | Fattibile (~150 righe: ECDH, HKDF, AES-GCM, JWT ES256), ma è codice crittografico da mantenere e testare. Non conviene finché esiste una libreria testata. |

**VAPID**:

- Genera le chiavi una volta (`npx @pushforge/builder vapid`, o `npx web-push generate-vapid-keys` in locale).
- `wrangler secret put VAPID_PRIVATE_KEY`. Metti `VAPID_PUBLIC_KEY` e `VAPID_SUBJECT` (`mailto:...` o URL `https:`) in `vars`.
- La chiave pubblica va nel client come `applicationServerKey`.
- Non ruotare le chiavi: rotarle invalida tutte le subscription esistenti.
- Verifica il formato che la libreria si aspetta: il README di block65 non lo specifica, e di solito è base64url raw. È la cosa più semplice da testare nel primo spike.

## Limiti piano gratuito

| Risorsa | Limite Free | Impatto |
|---|---|---|
| Richieste Workers | 100.000/giorno (reset 00:00 UTC) | Ampiamente sufficiente. |
| CPU | **10 ms per richiesta e per esecuzione cron** | È il vincolo vero: ogni push costa un ECDH + una firma ES256 + AES-GCM, circa ms di CPU. L'attesa di rete non conta. In una sola esecuzione cron stanno solo poche decine di invii. |
| Subrequest | **50 per invocazione** | Ogni push è una `fetch` esterna, quindi al massimo ~50 push per esecuzione cron. Le chiamate a D1 contano nel limite separato di 1.000 per servizi interni. |
| Cron Triggers | 5 per account | Ne basta 1. Una modifica impiega fino a 15 min a propagarsi. Orario in UTC. |
| D1 | 5M righe lette/giorno, 100.000 righe scritte/giorno, 5 GB | Ampiamente sufficiente. Con l'indice su `due_date` il cron legge solo le righe del giorno. |
| KV (per confronto) | 100.000 letture/giorno, **1.000 scritture/giorno**, 1 GB, consistenza eventuale | Con sync a ogni modifica lato client, 1.000 scritture al giorno finiscono presto. |

Conseguenza: per un MVP o uso personale (decine di utenti) un cron giornaliero basta. Oltre ~40 push al giorno ci sono due strade:

- **(a)** Più esecuzioni: cron orario, con ogni esecuzione che processa un lotto con `LIMIT 40` e marca come inviato.
- **(b)** Fan-out: il cron mette in coda e un consumer invia (Queues), oppure piano Paid ($5/mese): 30 s di CPU e 10.000 subrequest.

Conviene marcare `sent_on` per ogni promemoria, così una riesecuzione non manda doppioni.

## Caveat iOS

1. **Solo PWA installata**: Web Push funziona solo per web app aggiunte alla Home Screen (iOS/iPadOS >= 16.4), non in una scheda Safari. Il manifest deve avere `display: "standalone"` (o `fullscreen`), altrimenti l'app viene salvata come semplice segnalibro. Sulla UI: rileva `navigator.standalone` / `matchMedia('(display-mode: standalone)')` e, se l'app non è installata, mostra le istruzioni "Condividi → Aggiungi a Home".
2. **Permesso solo da gesto utente**: `Notification.requestPermission()` / `subscribe()` vanno chiamati direttamente nell'handler di un click, non all'avvio né dopo un `await` lungo.
3. **Niente push silenziose**: serve `userVisibleOnly: true`, e ogni push deve mostrare una notifica dentro `event.waitUntil`. Altrimenti WebKit revoca la subscription. Ci sono report aneddotici di revoca dopo ~3 push silenziose.
4. **Payload**: lo standard (RFC 8030) garantisce almeno 4096 byte. Con aes128gcm e padding di block65 restano 3993 byte utili. Per un promemoria `{title, body, navigate}` bastano meno di 200 byte. Non mettere dati grossi nella push.
5. **Rete**: se il backend ha un allowlist in uscita, deve consentire `*.push.apple.com` (gli endpoint Apple). Su Workers non c'è un allowlist di default.
6. **Nessun account Apple Developer richiesto.**
7. **Declarative Web Push** (iOS/iPadOS 18.4+): con payload `{"web_push": 8030, ...}` la notifica appare anche se il service worker fallisce, e questo riduce il rischio di revoca. È retrocompatibile: i browser che non lo supportano passano il JSON al service worker.
8. **Storage e subscription persi**: se l'utente rimuove la PWA dalla Home, la subscription e IndexedDB spariscono. Il server lo scopre al primo invio (404/410) e cancella i dati. Gestisci quindi 404/410 sempre.
9. **Endpoint che cambiano**: Chrome/FCM può ruotare l'endpoint. A ogni avvio, il client chiama `pushManager.getSubscription()` e, se l'endpoint è cambiato, lo ri-registra (upsert per `device_id`).

## Dati minimi lato server

Se i dati utente vivono in IndexedDB, al server serve solo ciò che occorre per decidere quando inviare e a chi:

- **Obbligatori**:
  - `endpoint`, `keys.p256dh`, `keys.auth`: la subscription. È anonima, ma l'endpoint è un identificatore stabile del device.
  - `deviceId` casuale + hash di un segreto per device, per autorizzare update e delete.
  - Per ogni promemoria: `dueDate` (`YYYY-MM-DD`).
- **Opzionali**:
  - `label`: per mostrare "Scade: Assicurazione auto". Se non vuoi contenuto in chiaro sul server, invia solo un `id` opaco o nessuna etichetta e manda una push generica ("Hai 2 scadenze oggi"). La notifica, al click, apre la PWA, che legge i dettagli da IndexedDB. In alternativa il client può cifrare `label` con una chiave locale, ma il service worker dovrebbe poi decifrarla da IndexedDB prima di `showNotification`: si può fare, ma è complessità in più.
  - `tz`: solo se vuoi inviare a un'ora locale precisa.
  - `sent_on`: per idempotenza del cron.
- **Da non salvare**: IP, user agent, email, contenuti oltre la label.

Raccomandazione MVP: `{deviceId, subscription, reminders: [{dueDate, label}]}` con label in chiaro e brevi, più una notifica di privacy che lo dichiari. Si può passare alla variante "solo date" senza cambiare schema (label vuota).

## Sources

- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare D1 pricing/limits: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare KV limits: https://developers.cloudflare.com/kv/platform/limits/
- WebKit, Web Push for Web Apps on iOS and iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit, Meet Declarative Web Push: https://webkit.org/?p=16535
- Apple, Sending web push notifications in web apps and browsers: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- @block65/webcrypto-web-push: https://github.com/block65/webcrypto-web-push , https://github.com/block65/webcrypto-web-push/blob/master/packages/web-push/README.md , https://www.npmjs.com/package/@block65/webcrypto-web-push
- @pushforge/builder: https://github.com/draphy/pushforge
- webpush-webcrypto: https://github.com/rtedge-net/webpush-webcrypto
- web-push-neo: https://github.com/ryoppippi/web-push-neo
- Report revoca dopo push silenziose (aneddotico): https://developer.apple.com/forums/thread/728850 , https://dev.to/progressier/how-to-fix-ios-push-subscriptions-being-terminated-after-3-notifications-39a7
- RFC 8291 (Message Encryption for Web Push): https://www.rfc-editor.org/rfc/rfc8291
- RFC 8292 (VAPID): https://www.rfc-editor.org/rfc/rfc8292
- RFC 8030 (Web Push protocol, payload >= 4096 byte): https://www.rfc-editor.org/rfc/rfc8030
- Versioni npm verificate via https://registry.npmjs.org/ il 2026-11-20.
