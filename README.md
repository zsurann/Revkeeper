# Revkeeper

**Il libretto di manutenzione della tua moto, sempre in tasca.**

Revkeeper ricorda per te quando fare il tagliando, cambiare l'olio, tendere la catena o rinnovare l'assicurazione. Inserisci i chilometri e lui ti dice cosa serve e quando, prima che diventi un problema.

👉 **Apri l'app:** [revkeeper.pages.dev](https://revkeeper.pages.dev)

---

## A cosa serve

- **Non dimenticare più una scadenza.** Tagliandi, revisione, bollo e assicurazione in un unico posto.
- **Manutenzione come da libretto.** Per molti modelli gli intervalli arrivano dal libretto ufficiale del costruttore. Per gli altri l'app usa valori tipici del tipo di moto, e puoi sempre cambiarli.
- **Lo storico della moto.** Ogni intervento resta registrato con data, chilometri, costo e foto delle ricevute. È utile anche quando vendi la moto.
- **Tutte le informazioni a portata di mano.** Misura e pressione delle gomme, tipo e quantità di olio, liquido freni, candele, targa e telaio.

## Cosa puoi fare

### 🏍️ Garage
Aggiungi una o più moto. Scegli marca, modello e anno dagli elenchi (puoi anche scrivere per cercare più in fretta): la scheda si compila da sola con cilindrata, potenza, peso, gomme e olio consigliati. Aggiungi una foto e sistemala con zoom e spostamento prima di salvarla.

### 🔧 Manutenzioni
Per ogni voce (olio, filtri, catena, freni, valvole…) vedi quanti chilometri o mesi mancano e una stima della data, calcolata su come usi la moto. Le voci più urgenti stanno in cima. A ogni voce puoi aggiungere una nota (tipo d'olio, codice del filtro, coppie di serraggio). Sul cruscotto vedi i km medi al giorno e quando è previsto il prossimo intervento.

### 📒 Interventi
Registra cosa hai fatto, a quanti km e quanto hai speso. Allega foto o PDF di fatture e ricevute. Puoi correggere un intervento salvato, togliere un allegato e cercare nel libretto per parola, anno o voce. Le spese si vedono per anno, per voce e al km. Con **PDF** stampi il libretto o lo salvi come PDF, utile quando vendi la moto.

### 📄 Documenti
Inserisci le scadenze di assicurazione, bollo e revisione, con il documento allegato. Con **Calendario** scarichi un file da aprire sul telefono: le scadenze finiscono nel tuo calendario con un promemoria 7 giorni prima e la mattina stessa.

### 🔔 Promemoria
Attiva le notifiche e scegli a che ora riceverle. Se sbagli i km, cancella la lettura da **Aggiorna km → Letture precedenti**. Revkeeper ti avvisa 30 giorni, 7 giorni e il giorno stesso di una scadenza, e quando una manutenzione si avvicina ai chilometri previsti.

## Come iniziare

1. Apri **[revkeeper.pages.dev](https://revkeeper.pages.dev)** dal telefono.
2. Installala sulla schermata Home:
   - **Android (Chrome):** menu ⋮ → *Installa app*
   - **iPhone (Safari):** tasto Condividi → *Aggiungi alla schermata Home*
3. Aggiungi la tua moto e i chilometri attuali.
4. Ogni tanto aggiorna i km: al resto pensa Revkeeper.

## Domande frequenti

**Devo creare un account?**
No. L'app funziona subito e i dati restano sul tuo telefono. Se accedi con Google, i dati vengono salvati anche online e li ritrovi su un altro telefono o se cambi dispositivo.

**Funziona senza internet?**
Sì. Puoi consultare e aggiornare tutto anche offline. Quando torni online i dati si sincronizzano da soli.

**Quanto costa?**
Niente. Revkeeper è gratuita.

**La mia moto non è nell'elenco.**
Scrivi marca e modello a mano: funziona lo stesso. L'elenco dei modelli si aggiorna ogni tre mesi.

**I valori di manutenzione sono affidabili?**
Quando l'app li prende dal libretto ufficiale lo indica. In ogni caso fa fede il libretto della tua moto: puoi modificare ogni intervallo.

**Che fine fanno i miei dati?**
Restano tuoi. Non vengono venduti né condivisi, e quelli salvati online restano su server in Europa. Dalla schermata Account puoi scaricare una copia (moto, interventi, documenti e file) ed eliminare l'account quando vuoi. Senza account, dallo stesso schermo scarichi una copia di ciò che è solo su questo telefono.

---

<sub>Elenco dei modelli basato su dati pubblici: NHTSA vPIC, Traficom (CC BY 4.0), DGT, ASTRA/USTRA (Ufficio federale delle strade, Svizzera).</sub>

## Per pubblicare gli aggiornamenti

La build su Cloudflare Pages legge da sola `.env.production`: ci sono solo l'identificativo pubblico di Google e la chiave pubblica delle notifiche, gli stessi che finiscono nel JavaScript dell'app. Non va copiato niente nel pannello di Cloudflare. `.env` e `.env.local` sono ignorati da git, così un segreto messo lì per sbaglio non finisce nel repository.

I promemoria orari stanno in un Worker separato (`revkeeper-cron`). Dopo l'unione su `main`, GitHub lo pubblica da solo se nelle impostazioni del repository (Settings → Secrets and variables → Actions) c'è il secret **`CLOUDFLARE_API_TOKEN`**. Senza quel secret il passaggio viene saltato e online resta il Worker già pubblicato. Se il token vede più di un account Cloudflare, aggiungi anche **`CLOUDFLARE_ACCOUNT_ID`**.

Prima che il Worker nuovo parta, applica una volta la migrazione del database (dal computer, nella cartella del progetto):

```
npx wrangler d1 migrations apply revkeeper --remote
```

La chiave privata delle notifiche (`VAPID_PRIVATE_KEY`) è già un secret del Worker: la pubblicazione non la cancella.

## Errori su Sentry

L'app e il server mandano gli errori a Sentry (organizzazione `grok-bot-w1`, regione UE):
`revkeeper` per l'app nel browser, `revkeeper-api` per le API e il cron dei promemoria.
Non partono email, cookie, intestazioni, corpi delle richieste o parametri dell'URL.
Gli errori dell'app e delle API portano il commit come release, quelli del cron la versione del Worker; il cron ha due monitor (promemoria orari e copia notturna) che avvisano via email se un giro salta o fallisce. Un errore nuovo, o che torna dopo essere stato risolto, arriva per email.

Per avere gli errori dell'app con i nomi veri di file e funzioni serve il token `SENTRY_AUTH_TOKEN`
tra le variabili di build del progetto Pages su Cloudflare: la build carica le mappe dei sorgenti e
poi le cancella, quindi non finiscono online. Senza token tutto funziona lo stesso, con stack minificati.

## Copie del database

Ogni notte alle 02:30 UTC il cron salva una copia del database D1 nel bucket R2 `revkeeper-backups` (UE),
come `d1/revkeeper-AAAA-MM-GG.json.gz`, e cancella quelle più vecchie di 7 giorni. Dentro ci sono utenti, dati
sincronizzati, elenco dei file e iscrizioni alle notifiche; le sessioni no (al ripristino basta accedere di nuovo).
I file allegati stanno già su R2 nel bucket `revkeeper-files`.

## Limiti di frequenza

Per evitare abusi: 20 tentativi di accesso ogni 10 minuti per rete (IPv6: per blocco /64), 5 notifiche di prova all'ora e 120 file caricati all'ora per utente.
Oltre il limite il server risponde 429 con `Retry-After`. Gli indirizzi IP non si salvano: il contatore usa un'impronta (hash).

## Aggiornamenti dell'app

Quando esce una nuova versione l'app mostra **Aggiornamento disponibile**: tocca **Aggiorna** per ricaricarla,
o continua e la nuova versione parte alla prossima apertura.
