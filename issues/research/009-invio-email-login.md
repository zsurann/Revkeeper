# Ricerca 009: invio email per il login da Cloudflare Workers

Data: 2026-11-20. Ticket: [009](../009-invio-email-login.md).

## Risposta breve

- **Senza un dominio proprio non si va da nessuna parte.** Tutti i servizi seri (Cloudflare Email Service, Resend, Postmark, MailChannels, Brevo) richiedono un dominio verificato con SPF e DKIM per inviare a destinatari qualsiasi. `*.pages.dev` e `*.workers.dev` non si possono usare come mittente. Un mittente `@gmail.com` non si può autenticare: Brevo lo riscrive in `@brevosend.com`, gli altri lo rifiutano. Serve comprare un dominio (circa 10 €/anno, anche da Cloudflare Registrar).
- **Cloudflare Email Service** (sending in public beta dal 2026-04-16) è il più integrato: binding `send_email` nel Worker, nessuna API key, SPF/DKIM/DMARC creati in automatico. Però **sul piano Workers Free l'invio a destinatari arbitrari "non è disponibile"**: serve Workers Paid (5 $/mese, 3.000 email/mese incluse, poi 0,35 $ ogni 1.000). Il dominio deve stare nell'account Cloudflare.
- **Resend** è il migliore sul piano gratuito: 3.000 email/mese (100/giorno), senza carta di credito, un dominio, REST API semplice da chiamare con `fetch` e SDK con guida ufficiale per Workers.
- **Raccomandazione**: dominio proprio su Cloudflare DNS + **Resend Free** chiamato con `fetch` da Worker. Se il progetto passa a Workers Paid, si migra a Cloudflare Email Service cambiando una sola funzione `sendEmail()`.
- **Login**: **codice a 6 cifre** (più un link opzionale nella stessa email), salvato in D1 come hash con scadenza di 10 minuti, monouso e con al massimo 5 tentativi. Sessione in **cookie HttpOnly opaco** (non JWT), dato che PWA e API stanno sulla stessa origine. CSRF gestito con SameSite=Lax più controllo di `Origin`. Limiti di frequenza con il binding Rate Limiting più un contatore in D1 per email.

## Servizi a confronto

| Servizio | Piano gratuito | Funziona senza dominio proprio? | Domini, SPF/DKIM/DMARC | Da Worker | Stato a fine 2026 | Note sulla consegna |
|---|---|---|---|---|---|---|
| **Cloudflare Email Service** (Email Sending) | **Nessuno per l'invio a terzi**: su Workers Free l'invio "non è disponibile". Gratis solo verso gli indirizzi di destinazione verificati (cioè i propri). Workers Paid: 3.000/mese inclusi, poi 0,35 $/1.000 | No. Prima di aver configurato il dominio si può inviare solo agli indirizzi verificati | Il dominio va scelto tra quelli dell'account Cloudflare. Aggiunge in automatico MX, SPF e DKIM su `cf-bounce.<dominio>` e un DMARC `p=reject` se manca | Binding `env.EMAIL.send()` (nessuna chiave), più REST API e SMTP | **Public beta** dal 2026-04-16, nessun GA annunciato. SMTP in beta da giugno 2026. Eventi su Queues da luglio 2026 | Quota giornaliera iniziale "prudente" che cresce nel tempo (numero non pubblicato). Nessuno SLA. È un IP pool giovane |
| **Resend** | **3.000/mese, massimo 100/giorno**, permanente e senza carta, 1 dominio | No. `onboarding@resend.dev` serve solo per i test e invia solo al proprio indirizzo | Si verifica il dominio aggiungendo record SPF e DKIM (consigliato un sottodominio, es. `mail.`); DMARC lo aggiungi tu | SDK `resend` con guida ufficiale per Workers, oppure `fetch` a `POST https://api.resend.com/emails` | Stabile. Pro a 20 $/mese per 50.000 email | Buona reputazione per l'email transazionale |
| **Postmark** | **100/mese**, senza overage | No. Prima dell'approvazione manuale dell'account si può inviare solo a domini verificati | Sender signature o dominio (DKIM + Return-Path) | Solo REST (`fetch`). L'SDK Node non è pensato per Workers | Stabile. Il primo piano a pagamento costa circa 15 $/mese per 10.000 email | **Il migliore per la consegna**: separa i flussi transazionali da quelli marketing. Il piano gratuito però basta solo per i test |
| **MailChannels** | Email API Free: 3.000/mese, **100/giorno** | No (dominio con lockdown via record TXT `_mailchannels`) | SPF + DKIM gestiti da te | REST `fetch` | **L'invio gratuito "nativo" per Workers è finito il 31-08-2024**: oggi serve un account Email API con API key. Le vecchie guide non funzionano più | Discreta |
| **Brevo** | **300/giorno**, conteggio condiviso tra marketing e transazionali, logo Brevo nelle email | Tecnicamente sì, ma un mittente `@gmail.com` viene riscritto in `@brevosend.com`: pessimo per la fiducia e per la consegna. Brevo stessa chiede un dominio proprio | Codice Brevo + DKIM + DMARC sul tuo dominio | REST `fetch` (`api.brevo.com/v3/smtp/email`) | Stabile | Media. Gli IP condivisi del piano gratuito sono più rumorosi |

**Gmail e Outlook.** Dal 2024 Gmail chiede SPF **o** DKIM a tutti i mittenti, e SPF + DKIM + DMARC allineato a chi invia più di 5.000 email al giorno. Microsoft (Outlook.com) applica le stesse regole ai grandi mittenti dal 2025. Con un'app personale siamo molto sotto le soglie, ma configurare subito SPF, DKIM e DMARC (`p=none` all'inizio, poi `quarantine`) costa poco e conta più del servizio scelto. Per un'email di login, il fattore che pesa di più sulla consegna è l'**autenticazione del dominio**, non il provider.

## Raccomandazione

1. **Comprare un dominio** e metterlo su Cloudflare DNS: serve comunque per avere un'URL stabile della PWA invece di `*.pages.dev`.
2. **Resend Free** con mittente `login@mail.<dominio>`: aggiungere i record SPF/DKIM che indica Resend e un `_dmarc` con `p=none`. La chiave va in un secret (`wrangler secret put RESEND_API_KEY`).
3. Invio con `fetch`, senza SDK, così non serve nessuna dipendenza:

   ```ts
   await fetch("https://api.resend.com/emails", {
     method: "POST",
     headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
     body: JSON.stringify({ from: "Revkeeper <login@mail.example.it>", to: [email],
       subject: `Il tuo codice: ${code}`, text, html }),
   });
   ```
4. Tenere tutto dietro una sola funzione `sendLoginEmail()`. Se in futuro si passa a Workers Paid, la si riscrive con `env.EMAIL.send()` di Cloudflare Email Service (niente chiavi e un fornitore in meno). Oggi non conviene: è in beta e costa 5 $/mese.
5. Il limite di 100 email al giorno di Resend Free basta per un'app personale. Il limite per email (sotto) evita anche che un attaccante consumi la quota.

## Flusso di login consigliato

**Tabelle D1**

```sql
CREATE TABLE login_codes (
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,      -- HMAC-SHA256(secret, email || ':' || code), hex
  expires_at INTEGER NOT NULL,  -- unix ms, now + 10 min
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX login_codes_email ON login_codes(email, created_at);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,     -- SHA-256 del token del cookie
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

**1. `POST /api/auth/start` `{ email }`**
- Normalizzare l'email (trim + lowercase) e validarla.
- Limiti di frequenza: binding `env.LOGIN_LIMIT.limit({ key: "email:" + email })` (es. 3 ogni 60 s) e un secondo binding per IP più largo (es. 10 ogni 60 s: l'IP da solo può essere condiviso, ad esempio da un CGNAT). Il binding accetta solo periodi di 10 o 60 s, è approssimato e conta per singola location Cloudflare, quindi serve **anche** un tetto in D1: al massimo circa 5 codici per email all'ora (`SELECT count(*) FROM login_codes WHERE email=? AND created_at > ?`).
- Generare il codice con `crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000` (la distorsione statistica è trascurabile), formattato a 6 cifre. Salvare solo l'**HMAC** con un secret del Worker: con 6 cifre un semplice SHA-256 si inverte per forza bruta in un attimo se il DB trapela.
- Invalidare i codici precedenti ancora aperti per quella email.
- Rispondere **sempre** `200 { ok: true }`, anche se l'utente non esiste, per non rivelare quali email sono registrate. L'account si crea alla prima verifica riuscita.

**2. `POST /api/auth/verify` `{ email, code }`**
- Prendere l'ultimo codice con `used_at IS NULL AND expires_at > now`.
- `UPDATE login_codes SET attempts = attempts + 1 ...`: con `attempts >= 5` il codice è bruciato e si deve chiederne uno nuovo. Così la probabilità di indovinare è al massimo 5 su 10⁶ per codice.
- Confrontare gli HMAC a tempo costante (`crypto.subtle.timingSafeEqual` su Workers).
- Consumo atomico: `UPDATE login_codes SET used_at=? WHERE rowid=? AND used_at IS NULL`. Se `meta.changes` vale 0, il codice era già stato usato.
- Creare la sessione: token di 32 byte casuali (base64url) nel cookie, in D1 solo `SHA-256(token)`, scadenza 30-90 giorni con rinnovo scorrevole.
- `Set-Cookie: __Host-session=<token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000`

**3. Ogni richiesta API**: leggere il cookie, calcolare `SHA-256`, fare `SELECT` su `sessions` e controllare `expires_at`. Il **logout** fa `DELETE` della riga e cancella il cookie (`Max-Age=0`).

**Cookie o JWT.** PWA e Worker stanno sulla **stessa origine** (Pages + route `/api/*` del Worker, oppure Pages Functions), quindi il cookie viene inviato in automatico. È `HttpOnly`, quindi uno script XSS non può leggerlo. Si revoca subito cancellando la riga in D1, e costa una lettura D1 per richiesta, un costo trascurabile. Un JWT in `localStorage` è leggibile da XSS, non si revoca senza una denylist (che di nuovo richiede D1) e non fa risparmiare nulla in questo caso. **Niente JWT.**

**CSRF.** Con `SameSite=Lax` il cookie non parte sulle POST cross-site. In più, nel Worker, rifiutare ogni richiesta che modifica dati se `Origin` è diverso dall'origine dell'app, e accettare solo `Content-Type: application/json` (un form cross-site non può inviarlo senza preflight CORS, e il Worker non risponde ai preflight). Con questo non serve un token CSRF.

**Link magico (se lo si vuole).** Token di 32 byte casuali nell'URL, in D1 solo il suo SHA-256 (qui un hash semplice basta, perché l'entropia è alta). Scadenza 15 minuti, monouso. Attenzione: **gli scanner dei link (Microsoft Defender Safe Links, antivirus aziendali) aprono gli URL delle email** e consumerebbero un token che si attiva con una GET. Il link deve quindi aprire una pagina con un bottone "Accedi" che fa una `POST` con il token: la GET non deve mai consumare nulla.

## Caveat iOS PWA

- Su iOS la PWA installata nella Home ha **cookie e storage separati da Safari**. Un link magico aperto da Mail si apre in **Safari** (o nel browser predefinito), non nella PWA. Il login avviene in Safari e la PWA resta disconnessa. iOS non offre un modo affidabile per far aprire un link nella PWA installata (niente "app links" per le web app).
- Per questo **il metodo principale è il codice a 6 cifre**: l'utente lo legge nella notifica di Mail e lo scrive nella PWA. Va usato `<input inputmode="numeric" autocomplete="one-time-code" maxlength="6">`: da iOS 17 Safari propone in automatico i codici arrivati via Mail. Conviene mettere il codice anche nell'oggetto dell'email ("Il tuo codice Revkeeper: 123456"), così si legge dalla notifica senza aprire l'email.
- Il link nella stessa email è comodo su desktop e su Android, dove la PWA installata può gestire i link del suo scope. Su iOS va considerato un ripiego.
- La sessione su iOS: il cookie HttpOnly della PWA dura quanto il suo `Max-Age`. La regola di WebKit che cancella lo storage dopo 7 giorni senza visite non si applica alle web app aggiunte alla Home, e comunque i cookie impostati dal server della stessa origine non sono limitati come quelli scritti da JavaScript. Se il cookie va perso, basta rifare il login con il codice: non si perde nessun dato, perché IndexedDB è la fonte locale e il sync riparte.

## Sources

- Cloudflare Email Service, panoramica: https://developers.cloudflare.com/email-service/
- Cloudflare Email Service, prezzi (Free "Not available", Paid 3.000/mese + 0,35 $/1.000): https://developers.cloudflare.com/email-service/platform/pricing/
- Cloudflare Email Service, limiti: https://developers.cloudflare.com/email-service/platform/limits/
- Cloudflare Email Service, domini e record DNS: https://developers.cloudflare.com/email-service/configuration/domains/
- Cloudflare Email Service, consegna: https://developers.cloudflare.com/email-service/concepts/deliverability/
- Cloudflare Email Service, changelog (public beta 2026-04-16): https://developers.cloudflare.com/email-service/platform/changelog/
- Workers Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Resend, prezzi: https://resend.com/pricing
- Resend, nuovo piano gratuito (3.000/mese, 100/giorno): https://resend.com/blog/new-free-tier
- Resend con Cloudflare Workers: https://resend.com/docs/send-with-cloudflare-workers
- Postmark, prezzi: https://postmarkapp.com/pricing
- Postmark, approvazione dell'account: https://postmarkapp.com/support/article/1084-how-does-the-account-approval-process-work
- MailChannels, fine del servizio gratuito per Workers: https://support.mailchannels.com/hc/en-us/articles/26814255454093-End-of-Life-Notice-Cloudflare-Workers
- MailChannels, prezzi: https://www.mailchannels.com/pricing/
- Brevo Email API (300/giorno): https://www.brevo.com/features/email-api/
- Brevo, mittenti con indirizzo gratuito riscritti: https://help.brevo.com/hc/en-us/articles/4410613910418
- Brevo, requisiti di Gmail, Yahoo e Microsoft: https://help.brevo.com/hc/en-us/articles/14925263522578
- Google, linee guida per i mittenti: https://support.google.com/a/answer/81126
