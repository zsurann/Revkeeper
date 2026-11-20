# Ricerca 010: strategia di sync local-first su Cloudflare (D1 + R2)

Data: 2026-11-20. Ticket: [010](../010-strategia-sync.md). Decisione a valle: [011](../011-decisione-sync.md).

## Risposta breve

- **Nessuna libreria "chiavi in mano" parla con D1.** Zero, PowerSync ed ElectricSQL vogliono Postgres (o Mongo/MySQL) e un loro servizio sempre acceso. Dexie Cloud usa il suo server, non D1/R2. TinyBase sincronizza via WebSocket verso un Durable Object, non D1. Restano due librerie che lasciano a te il backend: **Replicache** (gratis, ma in manutenzione e senza nuove funzioni) e **RxDB** (replication primitives su HTTP). Con entrambe devi comunque scrivere gli endpoint push/pull sul Worker: il lavoro sul server è lo stesso del sync fatto a mano.
- **Raccomandazione: sync fatto a mano, zero dipendenze nuove.** Una tabella generica `records` in D1 (`kind`, `id`, `data` JSON, `updated_at`, `deleted`, `rev`), due endpoint (`POST /sync/push`, `GET /sync/pull?since=`), last-write-wins per record su `updatedAt`, tombstone con `deleted=1`, cursore = `rev` crescente assegnato dal server. Circa 150-200 righe tra client e Worker.
- **Niente HLC.** C'è un solo utente per account e i record si toccano raramente da due telefoni insieme. Il cursore lo dà il server (`rev`), quindi l'orologio del client serve solo a decidere chi vince su uno stesso record. Lo scarto di qualche secondo tra telefoni non conta.
- **Le letture km non hanno conflitti.** Sono solo inserimenti con id casuale: due telefoni producono due righe diverse. Il vincolo "i km non scendono" va verificato in lettura (ordinamento per data), non al sync.
- **Allegati: upload tramite il Worker (binding R2), non URL firmati.** Le foto vanno compresse sul client (JPEG, lato lungo 1600 px, qualità 0,8, quindi circa 200-400 KB). Il limite di 100 MB per richiesta del Worker non pesa. Con il binding non servono le chiavi S3, `aws4fetch` né la CORS sul bucket. Il piano gratuito (10 GB, 1 M operazioni di classe A al mese) basta per decine di migliaia di foto.

## Opzioni a confronto

Dimensioni da bundlephobia (min + gzip, versione corrente il 2026-11-20). Contano solo il pacchetto principale: sono esclusi wasm e moduli aggiuntivi.

| Opzione | Funziona con Workers + D1? | Licenza e costo | Bundle (gzip) | Maturità a fine 2026 | Note per Revkeeper |
|---|---|---|---|---|---|
| **Sync a mano** (LWW per record, tombstone, pull con cursore, push a lotti) | **Sì**, nativo | Nostro codice, 0 € | **~0 KB** (`fetch` + IndexedDB già presenti) | Schema classico e collaudato (è lo stesso modello di Replicache e di RxDB) | Restano i dati e lo schema IndexedDB del ticket 004. Il server è una tabella e due endpoint |
| **Replicache** 15.3 | Sì: è solo client, push/pull li scrivi tu (anche su D1) | Gratis e open source; **in modalità manutenzione**, senza nuove funzioni | 35 KB | Stabile ma congelato; Rocicorp lavora su Zero | Sposta i dati nel suo store KV in IndexedDB (non nel nostro schema) e richiede mutator lato server. Scrivi lo stesso backend del sync a mano, più una dipendenza ferma |
| **Zero** (Rocicorp) 1.12 | **No**: serve `zero-cache` (server Node sempre acceso) + Postgres con replica logica | Apache-2.0; hosting del server a carico nostro | 119 KB | 1.0 uscita a metà 2026, attivo | Fuori da Workers/D1 |
| **TinyBase** 10.1 (MergeableStore + `WsServerDurableObject`) | Workers sì, **D1 no**: sync via WebSocket verso un Durable Object per stanza, persistenza nello storage SQLite del DO | MIT, gratis; i DO costano poco o niente con volumi piccoli | 17 KB (core) + moduli sync/persister | Maturo, rilasci frequenti (v8, v9, v10 nel 2026) | Bello, ma ci obbliga a migrare tutto lo stato in TinyBase (CRDT per cella) e a usare i DO al posto di D1. Le push (ticket 002) leggerebbero le scadenze dal DO, non da D1 |
| **RxDB** 17.6 (replication primitives / HTTP) | Sì: push/pull HTTP li scrivi tu sul Worker | Core Apache-2.0; storage e plugin "premium" a pagamento con contratto | 50 KB + storage (Dexie ~31 KB) | Maturo, molto usato | Più flessibile di Replicache ma più pesante; serve comunque lo stesso backend. Va riscritto lo strato dati con schemi RxDB e RxJS |
| **Dexie Cloud** (addon 4.4) | **No**: server di Dexie (cloud o on-prem in Docker), non D1/R2 | Free: 3 utenti di produzione, 100 MB; Pro €0,12 per utente al mese; on-prem €3.495 una tantum | 74 KB + Dexie 31 KB | Maturo | Il più veloce da attivare se usassimo Dexie, ma i dati restano fuori dal nostro Cloudflare e c'è il lock-in. Login e allegati passano da loro |
| **PowerSync** (web 2.7) | **No**: sorgenti Postgres, MongoDB, MySQL o SQL Server; servizio di sync separato | SDK client Apache-2.0; servizio cloud con piano free, self-host "Open Edition" (FSL) | 15 KB + wa-sqlite wasm (circa 1 MB) | Maturo | SQLite nel browser + Postgres: troppo per 5 tabelle |
| **ElectricSQL** 1.x | **No**: solo Postgres, ed è solo read-path (le scritture le gestisci tu) | Apache-2.0; secondo una fonte (RxDB, concorrente) Electric Cloud chiude a fine 2026: da verificare | n/d | 1.0 a marzo 2025 | Fuori target |
| **Yjs** 13.6 / **Automerge** 3.5 | Sì via Durable Objects (`y-partyserver`, `y-durableobjects`); D1 solo come archivio di blob | MIT, gratis | Yjs 28 KB; **Automerge circa 1,6 MB** (wasm incluso) | Maturi | Sono CRDT per documenti e testo collaborativo. Per record piccoli a utente singolo il merge per carattere non serve. Niente query lato server |

## Raccomandazione

**Sync a mano**, con queste scelte:

1. **Una tabella generica in D1.** Il server non conosce i campi delle entità: salva `data` come JSON. Così una modifica al modello dati non richiede migrazioni D1. Se serve (ad esempio per le push del ticket 002), si legge con `json_extract`.
2. **LWW per record** su `updatedAt` (ms del client), con `deviceId` come spareggio. Niente merge per campo. Il conflitto vero (stessa voce modificata offline su due telefoni) è raro con un solo utente, e perdere la modifica più vecchia è accettabile. *shortcut: LWW per record intero; se gli utenti segnalano modifiche perse, passare a LWW per campo (`updatedAt` per campo nel JSON).*
3. **Cursore assegnato dal server** (`rev` intero per utente), non dall'orologio del client. Evita i buchi del "pull since timestamp" (orologi sfasati, scritture nello stesso millisecondo).
4. **Tombstone conservati per sempre** (`deleted=1`, `data` svuotato). Pesano pochi byte e così anche un dispositivo rimasto offline per mesi riceve le cancellazioni. *shortcut: nessuna pulizia dei tombstone; se D1 si avvicina ai 500 MB, purgare quelli più vecchi di N giorni e forzare un pull completo sui cursori più vecchi.*
5. **Sync quando serve**: all'avvio, a `online`, a `visibilitychange` (visibile) e con debounce di 2 s dopo una scrittura locale. Niente WebSocket: con più dispositivi della stessa persona il tempo reale non serve.

Perché non una libreria: quelle compatibili con D1 (Replicache, RxDB) richiedono gli stessi endpoint push/pull sul Worker e in più sostituiscono il nostro strato IndexedDB. Le altre richiedono Postgres o un server proprietario. Il codice che risparmiano sta tutto sul client ed è il pezzo più semplice: una coda di record "sporchi" e un `put` dei record ricevuti.

Limiti del piano gratuito, con margine enorme per questo uso: D1 5 M righe lette e 100k righe scritte al giorno, 500 MB per database, 5 GB per account. Workers 100k richieste al giorno, 10 ms di CPU per richiesta (un batch di upsert è I/O, non CPU). D1 permette al massimo 100 parametri per query e 50 query per invocazione, quindi il push va diviso in lotti da circa 50 record.

## Protocollo proposto

### Schema D1

```sql
CREATE TABLE users_rev (user_id TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0);

CREATE TABLE records (
  user_id    TEXT    NOT NULL,
  kind       TEXT    NOT NULL,          -- bike | odometer | item | service | document | attachment
  id         TEXT    NOT NULL,          -- UUID generato dal client
  data       TEXT,                      -- JSON del record (NULL se cancellato)
  updated_at INTEGER NOT NULL,          -- ms del client che ha scritto
  device_id  TEXT    NOT NULL,          -- spareggio LWW
  deleted    INTEGER NOT NULL DEFAULT 0,
  rev        INTEGER NOT NULL,          -- ordine di arrivo sul server, usato come cursore
  PRIMARY KEY (user_id, kind, id)
);
CREATE INDEX records_pull ON records(user_id, rev);
```

### Client (IndexedDB)

Ogni record locale ha in più `updatedAt`, `deleted` e `dirty` (0/1). In una store `meta` si tengono `cursor` (ultimo `rev` ricevuto) e `deviceId`. Ogni scrittura locale imposta `updatedAt = Date.now()` e `dirty = 1`. Una cancellazione imposta `deleted = 1` (resta un tombstone) e l'interfaccia filtra i record con `deleted`.

### `POST /sync/push`

Richiesta: `{ deviceId, changes: [{ kind, id, data, updatedAt, deleted }] }`, al massimo circa 50 per chiamata. Il Worker esegue un solo `env.DB.batch([...])`, che è transazionale:

```sql
INSERT INTO users_rev(user_id, rev) VALUES (?1, 1)
  ON CONFLICT(user_id) DO UPDATE SET rev = rev + 1;
-- per ogni change:
INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, (SELECT rev FROM users_rev WHERE user_id = ?1))
ON CONFLICT(user_id, kind, id) DO UPDATE SET
  data = excluded.data, updated_at = excluded.updated_at, device_id = excluded.device_id,
  deleted = excluded.deleted, rev = excluded.rev
WHERE excluded.updated_at > records.updated_at
   OR (excluded.updated_at = records.updated_at AND excluded.device_id > records.device_id);
```

Risposta: `{ ok: true }`. Il client rimette `dirty = 0` solo sui record il cui `updatedAt` non è cambiato nel frattempo (confronto nella stessa transazione IndexedDB). Una change che perde il LWW non è un errore: la versione vincente torna con il pull successivo. Lato server servono validazione di `kind` (lista chiusa), dimensione di `data` (meno di 100 KB) e numero di change; `user_id` viene sempre dalla sessione, mai dal body.

### `GET /sync/pull?since=<rev>`

```sql
SELECT kind, id, data, updated_at, device_id, deleted, rev
FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT 500;
```

Risposta: `{ changes: [...], cursor: <rev massimo restituito>, more: <true se 500 righe> }`. Il client applica ogni change solo se vince il LWW contro la copia locale (stessa regola del server). Questo protegge le modifiche locali ancora `dirty`. Poi salva `cursor` e, se `more`, ripete.

Ordine di un ciclo: **push di tutti i dirty, poi pull fino a `more = false`**. Un record appena spinto torna indietro nel pull: viene scartato perché non vince (stesso `updatedAt`, stesso `deviceId`) oppure riscritto identico. Va bene così.

### Primo login con dati già in locale

Gli id sono UUID, quindi i record di due dispositivi non collidono mai.

1. Al login: `cursor = 0` e `dirty = 1` su tutti i record locali.
2. Ciclo normale: push di tutto (a lotti), poi pull completo da 0. Il risultato è l'unione dei dati locali e di quelli del server.
3. Unico caso da gestire: **la stessa moto creata su due dispositivi prima del login** diventa due moto. Proposta minima: dopo il primo sync, se due moto hanno la stessa targa (o marca + modello + anno), mostrare un avviso "Sembrano la stessa moto: unisci?". L'unione sposta i figli (`bikeId`) sulla prima moto e cancella la seconda con un tombstone. In alternativa si accetta il duplicato e l'utente ne cancella una. Questa scelta spetta al ticket 011.
4. Logout: si cancella l'IndexedDB oppure si tengono i dati e si ricomincia da 1. Da decidere nel ticket 011.

### Casi particolari

- **Letture km**: solo inserimenti, quindi nessun conflitto possibile. Una lettura sbagliata si cancella con un tombstone. Il controllo "i km non scendono" si fa nell'interfaccia sulla lista ordinata per data, perché due telefoni possono inserire letture fuori ordine.
- **Intervento con più voci**: le voci fatte stanno dentro il JSON dell'intervento (array di id), non in una tabella ponte. Così LWW resta per record.
- **Moto cancellata con figli**: il client mette il tombstone sulla moto e su tutti i figli nella stessa operazione locale; il sync li porta tutti.

## Allegati su R2

**Metadati come record normali** (`kind = 'attachment'`: `{ id, ownerKind, ownerId, mime, size, r2Key, width?, height? }`) che passano dal sync descritto sopra. **Il file passa da un canale separato**:

- `PUT /files/:id`: il body è il file. Il Worker controlla sessione, `Content-Type` (`image/jpeg`, `image/png`, `application/pdf`) e `Content-Length` (ad esempio al massimo 15 MB), poi esegue `env.BUCKET.put('u/' + userId + '/' + id, request.body)`. Lo stream passa diretto a R2 senza consumare CPU.
- `GET /files/:id`: il Worker controlla che la chiave appartenga all'utente e risponde con `env.BUCKET.get(...)` (header `ETag`, `Cache-Control: private, max-age=31536000, immutable`, perché un allegato non cambia mai e una modifica crea un nuovo id).
- Cancellazione: quando arriva il tombstone dell'attachment, il Worker esegue `BUCKET.delete` (operazione gratuita).

**Perché il proxy e non gli URL firmati**: gli URL firmati richiedono un token S3 di R2 (Access Key + Secret) come secret, `aws4fetch` (3 KB), la regola CORS sul bucket e due chiamate (firma + PUT). Funzionano solo sul dominio `*.r2.cloudflarestorage.com`, scadono al massimo dopo 7 giorni e non supportano POST da form. Servono quando i file superano il limite di 100 MB del Worker (piani Free/Pro), cosa che con foto compresse e PDF di documenti non succede. *shortcut: upload via Worker con limite di 15 MB; se un giorno servono video o file oltre 100 MB, passare a URL firmati PUT con `aws4fetch`.*

**Coda sul client**: il blob viene salvato subito in IndexedDB (store `blobs`) con `uploaded = 0`. Il record metadati entra nel sync solo dopo che il PUT è riuscito, così gli altri dispositivi non vedono allegati che non possono ancora scaricare. Sugli altri dispositivi il blob si scarica **solo quando serve** (apertura dell'intervento o del documento) e poi resta in cache in IndexedDB. Va chiamato `navigator.storage.persist()` per ridurre il rischio che il browser svuoti lo storage (soprattutto su iOS).

**Compressione sul client** (nessuna libreria):

```js
const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
const c = document.createElement('canvas');
c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
```

- Usare **JPEG**, non WebP: la codifica WebP da canvas su Safari/iOS non è affidabile (a volte torna PNG senza errore), mentre JPEG funziona ovunque. Controllare comunque `blob.type`.
- Le foto HEIC di iPhone: `<input type="file" accept="image/*">` su iOS di solito consegna già JPEG. Se `createImageBitmap` fallisce, conviene caricare l'originale entro il limite di dimensione invece di bloccare l'utente.
- I PDF non si comprimono: si carica l'originale entro il limite.

**Conti sul piano gratuito R2**: 10 GB-mese / circa 300 KB a foto fanno circa 33.000 foto. Classe A (PUT): 1 M al mese, classe B (GET): 10 M al mese, egress gratis, DELETE gratis. Oltre la soglia: $0,015/GB-mese, $4,50 per milione di operazioni A, $0,36 per milione di operazioni B. Ogni upload e ogni download passano anche dal Worker, quindi si consumano le 100k richieste al giorno del piano Free: per uso personale non è un problema.

## Sources

- Replicache, stato e licenza: https://replicache.dev/ · https://forums.basehub.com/rocicorp/mono/1 · https://rocicorp.dev/blog/retiring-reflect
- Zero: https://zero.rocicorp.dev/docs/release-notes/1.0 · https://zero.rocicorp.dev/docs/deployment · https://zero.rocicorp.dev/docs/open-source · https://infoq.com/news/2026/06/zero-version-1
- TinyBase su Durable Objects: https://tinybase.org/guides/integrations/cloudflare-durable-objects · https://tinybase.org/api/synchronizer-ws-server-durable-object/classes/creation/wsserverdurableobject/constructors/creation/constructor/ · https://tinybase.org/guides/synchronization/using-a-synchronizer/
- RxDB: https://rxdb.info/replication-http.html · https://rxdb.info/premium/ · https://rxdb.info/articles/alternatives/replicache-alternative.html
- Dexie Cloud: https://dexie.org/cloud/pricing · https://dexie.org/cloud/purchase/production
- PowerSync: https://docs.powersync.com/intro/powersync-overview.md · https://powersync.com/
- ElectricSQL: https://electric-sql.com/blog/2025/03/17/electricsql-1.0-released · https://rxdb.info/articles/alternatives/electricsql-alternative.html (fonte della notizia su Databricks e la chiusura di Electric Cloud, da verificare)
- Yjs/Automerge: https://loro.dev/docs/performance · https://github.com/threepointone/partyserver · https://www.npmjs.com/package/y-durableobjects
- Dimensioni dei bundle: https://bundlephobia.com/api/size?package=<nome> (interrogato il 2026-11-20)
- Cloudflare R2, prezzi: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2, URL firmati: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare D1, limiti e prezzi: https://developers.cloudflare.com/d1/platform/limits/ · https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare Workers, limiti: https://developers.cloudflare.com/workers/platform/limits/
- WebP da canvas su Safari: https://caniuse.com/mdn-api_htmlcanvaselement_toblob_type_parameter_webp · https://bugs.webkit.org/show_bug.cgi?id=226950
