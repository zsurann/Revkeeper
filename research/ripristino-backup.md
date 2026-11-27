# Prova di ripristino dal backup notturno (27/11/2026)

Ramo di sola documentazione, da non unire.

## Passi
1. Elenco copie: API R2 `GET /accounts/<id>/r2/buckets/revkeeper-backups/objects?prefix=d1/` con intestazione `cf-r2-jurisdiction: eu`.
2. Download: `GET .../objects/d1%2Frevkeeper-AAAA-MM-GG.json.gz` (stessa intestazione). Attenzione: l'oggetto ha `Content-Encoding: gzip`, quindi curl lo consegna già decompresso (10 kB di JSON al posto di 2 kB gzip). `restore.mjs` gestisce entrambi i casi.
3. Ripristino in un database di prova: `node research/restore.mjs copia.json[.gz] prova.sqlite migrations` crea lo schema dalle migrazioni e inserisce users, records, files, push_subs nell'ordine giusto.
4. Verifiche: `PRAGMA integrity_check` ok, nessuna violazione di chiavi esterne, conteggi uguali alla produzione, tutti i record vivi validi per lo schema attuale (`recordError`).

## Risultati
| Tabella | Backup 27/11 02:30 | Produzione 27/11 ~10:15 |
|---|---|---|
| users | 1 | 1 |
| records | 29 | 29 |
| files | 2 | 2 |
| push_subs | 1 | 1 |

Tempo: download e ripristino sotto 1 secondo ciascuno, con i dati attuali.

## Cosa NON copre il backup
- **I file degli utenti** (foto, PDF su R2 `revkeeper-files`): nel backup c'è solo l'elenco, non il contenuto. Un file cancellato o sovrascritto non si recupera.
- **Le modifiche dopo le 02:30**: si possono perdere fino a 24 ore di dati (i telefoni però conservano la loro copia locale e la rimandano al server).
- Sessioni e contatori dei limiti: esclusi apposta (al ripristino basta riaccedere).

## Ripristino in produzione (non provato)
Non esiste ancora uno script per riportare la copia su D1. Strada più semplice: dal file SQLite di prova esportare SQL (`sqlite3 prova.sqlite .dump`) e importarlo con `wrangler d1 execute revkeeper --remote --file=…` su un database vuoto. In alternativa D1 Time Travel (ripristino a un istante degli ultimi giorni) senza bisogno della copia.
