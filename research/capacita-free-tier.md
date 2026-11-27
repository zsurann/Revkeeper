# Capacità dei piani gratuiti: quanti utenti regge Revkeeper

Issue: [#45](https://github.com/zsurann/Revkeeper/issues/45). Codice letto su `origin/main` (4c9d9d0), limiti verificati sulla documentazione Cloudflare il 27/11/2026.

## Risposta breve

Con i numeri che Cloudflare documenta per il piano gratuito, il primo limite non è una quota giornaliera. È la **CPU dei due cron** (10 ms per esecuzione): secondo la stima, la copia notturna la supera già a **circa 40 utenti** e il giro dei promemoria a **circa 50-80 utenti con le notifiche**. Questa stima va confermata con le metriche di Cloudflare (vedi "Cosa verificare"). Se Cloudflare tollera gli sforamenti, i limiti successivi sono:

1. **Promemoria in ritardo o persi** (`MAX_USERS = 40` per giro, 6 ore di recupero): oltre i **240 utenti** (o 138 nella lettura più severa, vedi sotto) che hanno scelto la stessa ora, qualcuno salta il promemoria del giorno. Con il 60% degli utenti alle 09:00, l'ora predefinita, il limite arriva a **circa 330-570 utenti sul server**.
2. **50 query D1 per esecuzione** nella copia notturna (pagine da 1000 righe): circa **550 utenti**.
3. **5 milioni di righe lette al giorno su D1**: circa **1.300 utenti**. A pesare non sono i dati ma due query che leggono intere tabelle e crescono col quadrato degli utenti: la pulizia di `rate_limits` e la ricerca degli ospiti scaduti. Senza queste due query, il limite delle letture sale a circa 35.000 utenti.

Richieste Workers, scritture D1, spazio D1 e operazioni R2 arrivano molto più tardi, tra 13.000 e 60.000 utenti. Lo spazio R2 (10 GB) si esaurisce a **circa 4.000 utenti dopo un anno**.

"Utente" qui vuol dire **utente presente sul server**: chi ha fatto l'accesso con Google o ha attivato le notifiche (account ospite). Chi usa l'app solo sul telefono non chiama mai `/api` (`syncNow` esce subito senza account né ospite) e non costa nulla, perché i file statici di Pages sono gratuiti e illimitati.

## Limiti del piano gratuito (documentazione ufficiale)

| Servizio | Limite gratuito | Fonte |
| --- | --- | --- |
| Workers + Pages Functions | 100.000 richieste/giorno, **condivise** tra Functions e Worker (azzeramento alle 00:00 UTC, poi errore 1027); i file statici di Pages sono gratuiti e illimitati | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/) |
| CPU | **10 ms** per richiesta HTTP **e per esecuzione cron**; durata reale del cron fino a 15 min; 128 MB di memoria | Workers limits |
| Subrequest | **50 esterne** (`fetch`) + 1.000 verso servizi Cloudflare per invocazione (changelog dell'11/02/2026) | Workers limits, [changelog](https://developers.cloudflare.com/changelog/post/2026-02-11-subrequests-limit/) |
| Query D1 per invocazione | **50 (Free)** / 1000 (Paid); un `batch()` conta come una sola query | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| Cron | 5 per account (Revkeeper ne usa 2) | Workers limits |
| D1 letture | **5.000.000 righe/giorno**: conta le righe *scansionate*, non quelle restituite | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| D1 scritture | **100.000 righe/giorno**; ogni indice toccato aggiunge una riga scritta | D1 pricing |
| D1 spazio | 500 MB per database (5 GB per account) | D1 limits |
| R2 | 10 GB-mese, 1 M operazioni di classe A (put, list), 10 M di classe B (get, head) al mese; le cancellazioni sono gratuite | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |

Due novità rispetto alle ricerche precedenti (`issues/research/002`, `010`):

- **Dal 1° settembre 2026 D1 applica davvero i limiti giornalieri**: superata la soglia, ogni query fallisce fino a mezzanotte UTC ([changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)). Prima si poteva sforare senza conseguenze. Ora chi supera la soglia blocca l'API per tutti, accesso compreso.
- **Le query D1 per invocazione**: la pagina dei limiti di D1 dice 50 per il piano Free, quella dei Workers dice 1.000 subrequest verso i servizi Cloudflare. La ricerca 002 seguiva la seconda. Le due pagine non sono coerenti. Qui uso **50 come ipotesi prudente** e indico entrambi i risultati.

## Cosa costa ogni azione (dal codice)

Righe lette e scritte stimate dai piani di esecuzione SQLite. Li ho ricavati con `EXPLAIN QUERY PLAN` sullo schema di `migrations/`; D1 è SQLite.

| Azione | Richieste | Righe lette | Righe scritte |
| --- | --- | --- | --- |
| Qualsiasi chiamata autenticata (`userOf`: sessions + users per chiave) | — | 2 | 0 |
| Apertura dell'app (`startAutoSync` → 1 `GET /sync/pull` se non ci sono modifiche) | 1 | ~1 (indice `records_pull`) | 0 |
| Modifica (debounce di 2 s, 1 `POST /sync/push` per tipo di record modificato) | 1 per tipo | 2 `hit()` + 1 users + ~2 per record | 2×2 (`rate_limits` + indice) + 1 users + ~3 per record (riga + 2 indici) |
| Prima finestra dell'ora per utente (e del giorno per IP) in `hit()` | — | **intera tabella `rate_limits`** (`DELETE … WHERE window < ?`: SCAN, la chiave primaria inizia da `key`) | righe vecchie cancellate |
| Upload di un file (`PUT /files/:id`) | 1 | ~5 | ~3; R2: 1 classe A |
| Apertura di un allegato su un altro telefono | 1 | 2 | 0; R2: 1 classe B (poi resta in IndexedDB) |
| Nuovo ospite (`/auth/guest`, attivazione delle notifiche senza Google) | 1 | **tutta `users` × `sessions`** (`dropStaleGuests`: SCAN users + sottoquery correlata con SCAN sessions, perché `sessions.user_id` non ha indice) + tutta `sessions` (`DELETE … expires_at <`) | ~4 |
| Cron promemoria, ogni ora | (1 invocazione) | **tutta `users`** + 1 per utente con notifiche | — |
| Cron, per utente nella sua ora (una volta al giorno) | — | **tutti i suoi record** (indice `(user_id, kind)`, comprese le cancellazioni logiche dei 5 tipi) + push_subs + 1 | 1 (`last_reminded_at`) |
| Copia notturna | (1 invocazione) | tutte le righe di users, records, files, push_subs | 0; R2: 1 put + 1 list (classe A) |

Il cron legge tutti i record di un utente, ma una sola volta al giorno per utente. Con 74 record a testa costa circa 54.000 righe al giorno ogni 1.000 utenti: è **l'1% della quota**. Non è questo il problema.

## Ipotesi del modello

Utente "tipico" sul server, dopo circa un anno d'uso:

- 1 moto con 12 voci di manutenzione, 50 letture dei km (una a settimana), 8 interventi, 3 documenti: **R = 74 record**. Utente "pesante": R = 200.
- **Al giorno**: 1 apertura (1 pull), 0,5 invii di modifiche con 1,5 record ciascuno, 0,1 visite a Notifiche o Account (`/api/me`), 1 upload al mese. In totale **circa 1,6 richieste al giorno**. Utente pesante: 5 aperture, 3 invii da 3 record, 6 upload al mese, circa 9 richieste al giorno.
- Il 70% ha le notifiche attive. Il 50% degli utenti sul server sono ospiti. In media 1,2 sessioni per utente.
- Il 40% degli utenti invia modifiche in un giorno qualsiasi, in una sola ora del giorno.
- Ogni giorno lo 0,5% degli utenti crea un nuovo ospite (nuove installazioni, telefono cambiato, rinnovo dopo 180 giorni).
- Spazio: circa 500 byte per record su D1 (JSON più due indici), 2,4 MB di file l'anno per utente (foto della moto più 6 allegati, JPEG a 1600 px).
- Fuso orario quasi sempre `Europe/Rome`. Ora predefinita delle notifiche: 09:00 (`HourSelect` parte da 9).

## Soglia per ogni limite

| Limite | Cosa lo consuma | Utenti massimi (tipico) | Note |
| --- | --- | --- | --- |
| **CPU 10 ms, copia notturna** | `JSON.stringify` + gzip di tutto il database, circa 3 µs per riga | **~40** | 1.000 utenti = 74.000 righe = 224 ms misurati. Oltre i 128 MB di memoria si arriva a circa 1.500-2.000 utenti |
| **CPU 10 ms, cron dei promemoria** | `localParts` crea 2 `Intl.DateTimeFormat` (~120 µs) **per ogni utente con le notifiche, a ogni giro**, prima ancora di controllare l'ora; poi 0,37 ms per ogni utente elaborato e ~1,6 ms per ogni push (ECDH + firma ES256 + AES-GCM) | **~50-80 con le notifiche** (~70-110 sul server) | Con 40 invii servirebbero ~65 ms. La ricerca 002 l'aveva già previsto ("in un'esecuzione stanno poche decine di invii") |
| Promemoria al giorno (`MAX_USERS = 40` per giro, recupero di 6 ore) | utenti elaborati in un giro, anche quelli senza nulla da notificare | **240 per ora scelta** (40 × 6); 138 se valgono le 50 query (vedi riga sotto). Con il 60% alle 09:00: **~570 utenti** (330 nella lettura severa); con le ore distribuite tra le 7 e le 22: ~900 | Oltre la soglia gli esclusi vengono serviti il giorno dopo, ma il promemoria "tra 30/7/0 giorni" scatta solo nel giorno esatto: **si perde, senza nessun avviso** |
| 50 query D1 per invocazione, cron dei promemoria | 1 + 2 query per utente senza scadenze, 3 con scadenze (il 13% dei giorni) | 23 utenti per giro invece di 40 | Al ventiquattresimo utente il giro si interrompe con un'eccezione: il monitor Sentry `revkeeper-cron` lo segnala |
| 50 query D1 per invocazione, copia notturna | una query ogni 1.000 righe per tabella, più R2 put/list | **~550** | Nella lettura "1.000 servizi interni" il limite sale a ~12.000 |
| Subrequest esterne (50) | push (≤ 40) + check-in Sentry (2+) | non è un limite: `MAX_SENDS` lo rispetta | |
| **D1 righe lette (5 M/giorno)** | soprattutto le due scansioni quadratiche (sotto) | **~1.300** (~2.400 senza la ricerca degli ospiti scaduti; ~35.000 se le due scansioni avessero un indice) | Esempio a 1.000 utenti: 2,5 M letture al giorno, di cui 1,5 M dalla ricerca degli ospiti e 0,8 M da `rate_limits` |
| R2 spazio (10 GB) | allegati, più 7 copie gzip del database | **~4.000 dopo un anno**, ~2.000 dopo due | Il tetto di 500 MB per utente permetterebbe a **20 utenti** di riempire tutto |
| D1 spazio (500 MB per database) | record e indici, circa 38 kB per utente | ~13.000 (con R = 74), ~5.000 (con R = 200) | |
| D1 righe scritte (100k/giorno) | invii di modifiche (~4,8 per utente), pulizia di `rate_limits`, `last_reminded_at` | **~14.000** (pesante: ~2.000) | |
| Richieste Workers (100k/giorno) | ~1,6 per utente al giorno; il cron ne usa 25 | **~61.000** (pesante: ~11.000) | |
| R2 classe A (1 M/mese) e B (10 M/mese) | upload (~1 al mese per utente), copia notturna | > 900.000 | |
| Cron (5 per account) | 2 usati | — | |

Totale delle letture D1 al giorno nel modello: 0,17 M con 300 utenti, 2,5 M con 1.000, 15,7 M con 2.000. La curva è cubica:

- **Ricerca degli ospiti scaduti**: a ogni nuovo ospite legge circa U + G·S/2 righe (G ospiti vecchi, S sessioni), perché `sessions(user_id)` non ha indice. Al giorno: g × G × S/2.
- **`rate_limits`**: la pulizia scansiona tutta la tabella (~2,5 righe per utente attivo) ogni volta che un utente usa una nuova finestra oraria o un IP una nuova finestra giornaliera. Al giorno: ~5·A², dove A sono gli utenti che sincronizzano.

### Il cron dei promemoria in dettaglio

- A ogni giro `SELECT … FROM users` legge **tutta** la tabella users (SCAN + ordinamento temporaneo) e prova push_subs per ogni utente con l'ora impostata: 24 × (U + N) righe al giorno, cioè 41 per utente al giorno. È lineare e accettabile.
- `seen` conta **tutti** gli utenti nella loro finestra, anche quelli senza scadenze, cioè circa l'87% dei giorni. Per questo il limite vero è `MAX_USERS = 40`, non `MAX_SENDS`: in pratica i giri finiscono quasi sempre per gli utenti elaborati, non per gli invii.
- Massimo teorico: 40 × 24 = 960 utenti al giorno, solo se le ore scelte fossero distribuite uniformemente su tutte le 24 ore. Per una singola ora, ad esempio le 09:00, i giri utili sono 6 (dalle 09 alle 14): **240 utenti**.
- Superata la soglia, l'ordinamento per `last_reminded_at` fa ruotare gli utenti: con 480 utenti alle 09:00 ognuno viene servito un giorno sì e uno no. Si perde così circa metà dei promemoria a 30, 7 e 0 giorni, perché scattano solo nel giorno esatto (`NOTICE_DAYS.includes(days)`).

### Limiti per singolo utente (non di capacità, ma rilevati strada facendo)

- **CGNAT**: `syncIp` (1.500 invii al giorno per IP) e `login` (20 ogni 10 minuti per IP) contano l'IPv4 intero. Sulle reti mobili italiane molti utenti condividono lo stesso IP: in caso di grande diffusione questi tetti possono bloccare utenti estranei tra loro.
- **Esportazione dell'account**: il CRC32 dello ZIP è scritto in JavaScript (2,5 ms/MB misurati). Oltre circa 4 MB di file, l'esportazione supera i 10 ms di CPU.
- **Primo pull di un utente pesante**: 500 record da analizzare e serializzare in una richiesta. È vicino ai 10 ms, da tenere d'occhio.

## Cosa verificare (le cifre di CPU sono misurate in Node, non su Cloudflare)

Ho misurato i tempi di CPU con Node 22 in questo container. Le funzioni sono quelle del repository: `server/reminders.ts`, `@block65/webcrypto-web-push`, `crc32` di `server/zip.ts`, e stringify + gzip come in `cron/backup.ts`. Il runtime `workerd` usa lo stesso V8, quindi l'ordine di grandezza dovrebbe tenere, ma i valori reali possono essere 2-3 volte diversi. Cloudflare dice inoltre che ogni isolate ha "un po' di flessibilità" sugli sforamenti occasionali, e interrompe solo chi supera il limite in modo sistematico. Per confermare:

1. Dashboard Cloudflare → Workers → `revkeeper-cron` → Metrics: tempo di CPU (mediana e p99) ed errori "Exceeded CPU". Oppure `wrangler tail revkeeper-cron`.
2. Sentry: i monitor `revkeeper-cron` e `revkeeper-backup` segnalano i giri falliti.
3. D1 → Metrics → Row Metrics: le righe lette al giorno, da confrontare con il modello.

## Interventi, in ordine di guadagno (solo indicazioni, nessuna modifica al codice qui)

1. **CPU del cron**: creare i formattatori `Intl.DateTimeFormat` una sola volta per fuso orario (una `Map`): da ~120 µs a pochi µs per utente. Selezionare in SQL solo gli utenti nella loro finestra, invece di caricarli tutti e scartarli nel ciclo.
2. **Copia notturna**: D1 Time Travel copre già 7 giorni anche sul piano gratuito. La copia su R2 ha senso solo contro la cancellazione del database: si può fare ogni settimana, oppure dividerla in più esecuzioni (una tabella o un intervallo di rowid per giro).
3. **Letture D1**: aggiungere un indice su `sessions(user_id)` (elimina la scansione degli ospiti e rende veloci `DELETE … WHERE user_id`) e un indice su `rate_limits(window)`, oppure pulire `rate_limits` dal cron invece che a ogni prima finestra. Dopo questi tre indici, il limite delle letture passa da ~1.300 a ~35.000 utenti.
4. **Promemoria**: contare in `MAX_USERS` solo gli utenti a cui si invia davvero qualcosa, oppure precalcolare ogni giorno chi ha una scadenza. Rendere `NOTICE_DAYS` tollerante ai ritardi ("entro 7 giorni e non ancora avvisato"), così un giro saltato non fa perdere il promemoria.
5. **R2**: ridurre il tetto di 500 MB per utente (oggi 20 utenti bastano a riempire i 10 GB gratuiti), oppure aggiungere un tetto globale.
