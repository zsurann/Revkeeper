# Revkeeper · note per lo sviluppo

## Pubblicare gli aggiornamenti

La build su Cloudflare Pages legge da sola `.env.production`: ci sono solo l'identificativo pubblico di Google e la chiave pubblica delle notifiche, gli stessi che finiscono nel JavaScript dell'app. Non va copiato niente nel pannello di Cloudflare. `.env` e `.env.local` sono ignorati da git, così un segreto messo lì per sbaglio non finisce nel repository.

I promemoria orari stanno in un Worker separato (`revkeeper-cron`). Dopo l'unione su `main`, GitHub lo pubblica da solo se nelle impostazioni del repository (Settings → Secrets and variables → Actions) c'è il secret **`CLOUDFLARE_API_TOKEN`**. Senza quel secret il passaggio viene saltato e online resta il Worker già pubblicato. Se il token vede più di un account Cloudflare, aggiungi anche **`CLOUDFLARE_ACCOUNT_ID`**.

Prima che il Worker nuovo parta, applica una volta la migrazione del database (dal computer, nella cartella del progetto):

```
npx wrangler d1 migrations apply revkeeper --remote
```

La chiave privata delle notifiche (`VAPID_PRIVATE_KEY`) è già un secret del Worker: la pubblicazione non la cancella.

## Errori su Sentry

L'app e il server mandano gli errori a Sentry (organizzazione `grok-bot-w1`, regione UE). App nel browser con l'SDK; API e cron senza SDK, con un invio diretto (`functions/api/_middleware.ts`, `cron/sentryLite.ts`) per stare nei 10 ms di CPU del piano gratuito:
`revkeeper` per l'app nel browser, `revkeeper-api` per le API e il cron dei promemoria.
Non partono email, cookie, intestazioni, corpi delle richieste o parametri dell'URL.
Gli errori dell'app e delle API portano il commit come release, quelli del cron la versione del Worker; il cron ha due monitor (promemoria ogni 10 minuti e copia della domenica) che avvisano via email se un giro salta o fallisce. Un errore nuovo, o che torna dopo essere stato risolto, arriva per email.

Per avere gli errori dell'app con i nomi veri di file e funzioni serve il token `SENTRY_AUTH_TOKEN`
tra le variabili di build del progetto Pages su Cloudflare: la build carica le mappe dei sorgenti e
poi le cancella, quindi non finiscono online. Senza token tutto funziona lo stesso, con stack minificati.

## Copie del database

Ogni domenica alle 02:30 UTC il cron salva una copia del database D1 nel bucket R2 `revkeeper-backups` (UE),
come `d1/revkeeper-AAAA-MM-GG.json.gz` (tenuta 5 settimane), più i file caricati nella settimana (tenuti 30 giorni).
Ogni giorno c'è anche D1 Time Travel. Procedura di ripristino: [RIPRISTINO.md](../RIPRISTINO.md).

## Limiti

- Accessi con Google e nuovi ospiti: 60 ogni 10 minuti per rete (IPv6: per blocco /64). Oltre l'80% dello spazio D1 o R2 non si creano nuovi ospiti.
- Per utente: 120 sincronizzazioni e 120 file all'ora, 5 notifiche di prova e 5 export all'ora.
- Record: 500 per un ospite, 20.000 per un account Google. Gli ospiti non caricano file.

Oltre un limite il server risponde 429 con `Retry-After`. Gli indirizzi IP non si salvano: il contatore usa un'impronta (hash).

## Anteprime

Ogni branch pubblica un'anteprima su Cloudflare Pages con un database (`revkeeper-preview`) e un bucket (`revkeeper-files-preview`) separati: i dati veri non si toccano (`[env.preview]` in `wrangler.toml`).

## Aggiornamenti dell'app

Quando esce una nuova versione l'app mostra **Aggiornamento disponibile**: tocca **Aggiorna** per ricaricarla,
o continua e la nuova versione parte alla prossima apertura.
