# Ripristino in caso di guasto

Cosa c'è per ripartire:

| Cosa | Dove | Quanto indietro |
|---|---|---|
| Database (utenti, garage, notifiche) | **D1 Time Travel**, automatico su Cloudflare | un istante qualsiasi degli ultimi 7 giorni (piano gratuito) |
| Database, copia di riserva | R2 `revkeeper-backups` (UE), `d1/revkeeper-AAAA-MM-GG.json.gz` | ogni domenica, tenuta 5 settimane |
| Foto e PDF caricati nella settimana | R2 `revkeeper-backups`, `files/AAAA-MM-GG/<utente>/<file>` | ogni domenica, tenuti 30 giorni |

I telefoni hanno anche la loro copia locale e rimandano al server ciò che manca alla prossima sincronizzazione.

Per tutti i comandi: `export CLOUDFLARE_ACCOUNT_ID=…` e un token API con permessi D1 e R2 (`CLOUDFLARE_API_TOKEN`).

## 1. Database: tornare a un istante (Time Travel) — primo tentativo

```bash
npx wrangler d1 time-travel info revkeeper --timestamp=2026-12-01T10:00:00Z   # stampa il bookmark di quell'istante
npx wrangler d1 time-travel restore revkeeper --bookmark=<bookmark>
```

Usare il bookmark: il ripristino diretto con `--timestamp` ha dato un errore interno di Cloudflare nella prova, quello con `--bookmark` no.

Sovrascrive il database con lo stato di quel momento: le modifiche successive si perdono (i telefoni le rimandano se le hanno ancora). Il comando stampa un bookmark per annullare il ripristino.

## 2. Database: dalla copia settimanale — se Time Travel non basta

```bash
# scarica la copia (arriva già decompressa: lo script gestisce entrambi i casi)
npx wrangler r2 object get revkeeper-backups/d1/revkeeper-AAAA-MM-GG.json.gz --jurisdiction eu --file copia.json.gz --remote
# ricostruisce un SQLite di prova e controlla integrità e conteggi
node scripts/restore-backup.mjs copia.json.gz prova.sqlite migrations
# genera l'SQL dei soli dati e lo carica in un database D1 vuoto con lo schema già applicato
sqlite3 prova.sqlite ".dump users records files push_subs" | grep '^INSERT' > dati.sql
npx wrangler d1 migrations apply <nuovo-db> --remote
npx wrangler d1 execute <nuovo-db> --remote --file=dati.sql
```

Poi puntare `database_id` in `wrangler.toml` e `cron/wrangler.toml` al nuovo database e pubblicare. Le sessioni non sono nella copia: gli utenti devono rifare l'accesso.
Se l'account di qualcuno è stato eliminato dopo la copia, va rieliminato (Account → dati, o `DELETE` per `user_id`).

## 3. File degli utenti

```bash
npx wrangler r2 object get revkeeper-backups/files/AAAA-MM-GG/<utente>/<file> --jurisdiction eu --file f --remote
npx wrangler r2 object put revkeeper-files/<utente>/<file> --jurisdiction eu --file f --content-type <tipo> --remote
```

I file caricati prima dell'ultima copia ma oltre i 30 giorni non hanno copia: restano solo sul telefono che li ha caricati.

## Dopo un incidente

- Annotare cosa è successo, quando e quali utenti sono coinvolti.
- Se dati personali sono andati persi o esposti: avviso agli utenti coinvolti (notifica ed email) e, se c'è rischio per loro, notifica al Garante entro 72 ore (`docs/registro-trattamenti.md`).

## Prove (27/11/2026)

- Copia del database ripristinata in un SQLite di prova: integrità ok, conteggi uguali alla produzione, meno di 1 secondo.
- Time Travel su un database D1 di prova (poi eliminato): righe cancellate tornate con `--bookmark`, 4 secondi.
- File: caricato e riscaricato da `revkeeper-backups` con `wrangler r2 object put/get --jurisdiction eu`, contenuto identico (SHA-256).
