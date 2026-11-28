# 06 · Accessibilità, UI/UX e prontezza legale (GDPR) — Revkeeper

Data: 28/11/2026 · Repo in sola lettura (nessuna modifica) · Build `dist/` servita con `npx vite preview` (porta 4173)
Strumenti: scansione del codice in `src/`, calcolo dei contrasti dei token (`design/tokens.css`, importato da `src/index.css`), axe-core 4 via Playwright (Chromium, emulazione iPhone 13, temi Chiaro e Notte), prove da tastiera, screenshot.
Screenshot e script: `ui/` (`v-*.png` = viewport, `NN-*.png` = pagina intera usata per axe, `axe.json` = risultati axe, `contrast.mjs`, `run.cjs`, `run2.cjs`).

Come ho raggiunto le schermate senza login: con UA iPhone si vede la pagina d'installazione; con `?browser=1` l'app parte in locale (local-first), quindi ho percorso benvenuto → scheda moto → cruscotto → Manutenzione → Interventi → Documenti → foglio km → nuovo intervento → Account → Garage. Le API `/api/*` non girano in `vite preview`: login Google, notifiche, sync, export ed eliminazione account li ho valutati **solo dal codice**.

## Sintesi

| Area | Esito |
|---|---|
| Contrasto testo (chiaro e Notte) | **Supera AA** per tutti i token di testo (minimo 4,97:1, ink-3 su sunken) |
| axe-core (25 schermate) | 0 violazioni su benvenuto, scheda moto, Account, Garage, privacy, termini, installazione; 2 regole ripetute sulle schede (vedi A-04, A-05) |
| Tastiera / focus | **Problema principale**: i fogli (Sheet) non trattengono il focus e il focus si perde a ogni cambio schermata |
| Motion | Buono: `prefers-reduced-motion` gestito in CSS e in Motion (`MotionConfig reducedMotion="user"`), lo splash non compare |
| Reflow 320 px | OK, niente scroll orizzontale |
| GDPR | Base solida (informativa, termini, registro, export ed eliminazione per account Google, niente cookie di tracciamento). Due lacune da chiudere prima del lancio: account ospite senza export/eliminazione in app (e informativa che dice il contrario) e pulsante Google caricato prima di qualsiasi azione |

Verdetto: **APPROVATO CON MODIFICHE**. Nessun BLOCCANTE tecnico assoluto per l'accessibilità; per il lancio pubblico UE considero **BLOCCANTE** la frase falsa dell'informativa sui diritti degli utenti ospite (L-01).

---

## 1. Accessibilità (a11y-check + audit a11y-eng)

| # | Gravità | Dove | Problema | Fix minimo |
|---|---|---|---|---|
| A-01 | **ALTO** | `src/ui.tsx:133-161` (Sheet), schermate: foglio km, nuovo intervento, elimina account/moto | Il foglio ha `role="dialog" aria-modal="true"` ma niente trappola del focus né `inert` sullo sfondo. Verificato: dal foglio km, Shift+Tab esce subito su "Documenti", "Interventi", "Manutenzione"… della barra in basso coperta dal velo. Con VoiceOver lo scorrimento a dita esce anch'esso dal foglio. | Mentre `open`, mettere `inert` sul resto: es. `document.getElementById('root')` non va bene perché il foglio è dentro; più semplice: renderizzare il Sheet con `createPortal(…, document.body)` e impostare `root.inert = true` nell'effetto di apertura (`false` in pulizia). Stesso per `PhotoEditor.tsx:101`. |
| A-02 | **ALTO** | `src/App.tsx:386-393` (cambio pagina), `toTop` `App.tsx:130` | A ogni cambio scheda/vista il pulsante premuto viene smontato e il focus finisce su `BODY` (misurato dopo l'apertura di Account). Il lettore di schermo non annuncia la nuova pagina e chi usa la tastiera riparte dall'inizio. Il `<title>` resta sempre "Revkeeper". | In `onExitComplete` (o in un effetto su `pageKey`) spostare il focus sull'`h1` della nuova pagina (`h1.tabIndex=-1; h1.focus({preventScroll:true})`) e aggiornare `document.title = \`${titolo} · Revkeeper\``. Per i cambi scheda dalla barra in basso, basta aggiornare il titolo e lasciare il focus sul pulsante della scheda (che resta montato). |
| A-03 | **MEDIO** | `src/Maintenance.tsx:145` | Campo "Nuova voce" senza etichetta: solo `placeholder`, che sparisce scrivendo e non è un nome accessibile affidabile (WCAG 1.3.1, 4.1.2). Gli altri due campi hanno `aria-label`. | `aria-label="Nome della voce"` (o avvolgerlo nel `Field` come nel resto dell'app). Lì c'è anche `autoFocus`: ok perché segue un tocco esplicito. |
| A-04 | **MEDIO** | `src/App.tsx:369` (header delle schede, tutte e 4) — axe `label-content-name-mismatch` | `aria-label="Yamaha MT-07, apri il garage"` sostituisce il testo visibile "Yamaha MT-07 · 1 moto nel garage": chi usa il controllo vocale e dice "1 moto nel garage" non lo trova (WCAG 2.5.3). | Togliere `aria-label` e aggiungere testo solo per SR: `<span className="sr-only">, apri il garage</span>`. |
| A-05 | **MEDIO** | `src/Dashboard.tsx:144-170` — axe `page-has-heading-one` | Il Cruscotto è l'unica pagina senza `h1` (le altre usano `PageHead`). Navigando per titoli si parte da "Catena (lubrificazione)" (h2). | `<h1 className="sr-only">Cruscotto · {make} {model}</h1>` in cima. |
| A-06 | **MEDIO** | `src/Dashboard.tsx:146` | `<button role="alert">`: il ruolo `alert` sovrascrive quello di pulsante, quindi lo SR non lo annuncia come attivabile; in più a ogni ritorno sul cruscotto viene riletto come allarme. | Togliere `role="alert"` dal pulsante; se serve l'annuncio, mettere il testo in una regione `role="status"` separata, una sola volta. |
| A-07 | **MEDIO** | `src/Attachments.tsx:71-73`, `src/BikeForm.tsx:122,131` | Input file `sr-only` dentro/accanto a una `label` stilizzata: da tastiera il focus va sull'input invisibile e **non si vede alcun indicatore** (WCAG 2.4.7). Le chip di `Services.tsx:56` invece usano bene `has-focus-visible:outline`. | Aggiungere alla label `has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink` (Attachments: usare `peer` + `peer-focus-visible:` perché l'input è fratello, non figlio). |
| A-08 | **MEDIO** | `src/PhotoEditor.tsx:108-119` | Lo spostamento della foto si fa solo trascinando (WCAG 2.2 · 2.5.7 Movimenti di trascinamento): niente alternativa a tocco singolo o tastiera. Lo zoom ha lo slider, lo spostamento no. | Quattro pulsanti freccia (o frecce da tastiera sullo stage con `tabIndex=0`) che spostano `tx/ty` di un passo. |
| A-09 | BASSO | `src/Attachments.tsx:31,32,79` | Bersagli di 28 px ("Togli"), 28 px e 24 px (X), senza `hitbox`: passano il minimo AA 2.5.8 (24 px) ma sono sotto i 44 px che il resto dell'app rispetta. | Aggiungere la classe `hitbox` già esistente. |
| A-10 | BASSO | `src/Welcome.tsx:137`, `src/Notifications.tsx:111` | Messaggi d'errore (testo rosso) in `role="status"` (cortese); in Welcome, se `busy`, il testo diventa "Attendi…" in rosso. Altrove gli errori usano `role="alert"` (`ErrorText`). | Usare `ErrorText` (o `role="alert"`); mostrare "Attendi…" fuori dal paragrafo d'errore. |
| A-11 | BASSO | `src/BikeForm.tsx:78-82` + `ErrorText` in fondo | Errore di invio mostrato in fondo al modulo, mentre il focus va al campo vuoto in cima: il campo non ha `aria-invalid` né `aria-describedby`, quindi lo SR sente solo il nome del campo. | Sul campo vuoto: `aria-invalid="true"` e `aria-describedby` verso il messaggio. |
| A-12 | BASSO | `src/Combobox.tsx:307` | `aria-selected={i === active \|\| selected}` confonde "evidenziata da tastiera" con "scelta": due opzioni possono risultare selezionate. L'evidenza è già data da `aria-activedescendant`. | `aria-selected={selected}`. |
| A-13 | BASSO | `src/toast.tsx:26,54` | `role="status"` dentro un contenitore già `aria-live="polite"`: alcuni SR annunciano due volte. I toast spariscono in 3,8 s e da pagina intera coprono la testata (bike switcher e Account) per quel tempo (visto in `v-04-dash.png`). | Tenere solo `aria-live` sul contenitore. Valutare 5-6 s e un'altezza che non copra la testata (o toast in basso sopra la tab bar). |
| A-14 | BASSO | `src/App.tsx:87` | La schermata d'errore mostra `error.message` grezzo (spesso in inglese/tecnico). | Mostrare un codice breve o niente; c'è già "Segnala il problema" in `sentry.tsx`. |
| A-15 | BASSO | dimensioni testo in `px` ovunque (`text-[15px]` ecc.) | Il testo non segue la dimensione carattere preferita del browser (solo lo zoom). In una PWA iOS il Dynamic Type non arriva comunque; Chrome Android scala tutto. Prova con root al 200%: i margini in rem crescono, il testo no (`v-13-account-zoom.png`). | Nessuna urgenza; a lungo termine passare le dimensioni del testo a `rem`. |

Cose fatte bene (verificate): contrasti del testo, `:focus-visible` globale ben visibile (`index.css:37-38`), anello del campo a fuoco, `aria-current="page"` sulle schede, `Segmented` con `radiogroup/radio`, `aria-expanded` sulle voci di manutenzione, combobox con `aria-activedescendant` e frecce/Invio/Esc funzionanti (compilata la scheda moto solo da tastiera), `Esc` chiude fogli e editor, il focus torna al pulsante d'origine dopo la chiusura del foglio ("Aggiorna km"), `RevBar` nascosta agli SR con percentuale in `sr-only`, contachilometri con `role="img"` e nome, `progressbar` del benvenuto, area di tocco 44 px tramite `hitbox`, gesto "indietro dal bordo" con pulsante Indietro equivalente.

### Percorso da tastiera (misurato)

| Passo | Azione | Focus atteso | Risultato |
|---|---|---|---|
| 1 | Benvenuto → "Più tardi" → "Non ora" → "Aggiungi moto" | pulsanti raggiungibili | OK |
| 2 | Scheda moto: Marca/Modello/Anno con frecce + Invio, Km | combobox | OK |
| 3 | "Salva moto" vuoto | primo campo vuoto + errore | Focus OK, errore lontano e non collegato (A-11) |
| 4 | Cruscotto → "Aggiorna km" | campo km nel foglio | OK (focus iniziale sul campo) |
| 5 | Shift+Tab nel foglio | resta nel foglio | **KO: esce sulla tab bar** (A-01) |
| 6 | Esc | torna su "Aggiorna km" | OK |
| 7 | Avatar → Account | h1 "Account" | **KO: focus su BODY** (A-02) |
| 8 | Foto moto / allegati | indicatore di focus | **KO: invisibile** (A-07) |

## 2. Contrasto dei colori (contrast)

Calcolato con la formula WCAG 2.x su ogni coppia testo/fondo usata (script `contrast.mjs`).

| Coppia | Chiaro | Notte | Esito |
|---|---|---|---|
| ink su bg | 17,34 | 17,66 | AA |
| ink-2 su bg / surface / sunken | 7,58 / 8,26 / 7,11 | 10,16 / 9,38 / 8,63 | AA |
| ink-3 su bg / surface / sunken | 5,30 / 5,78 / **4,97** | 6,68 / 6,17 / 5,67 | AA (al limite su sunken in chiaro) |
| lime-ink su surface / lime-soft | 6,74 / 6,37 | 15,54 / 12,76 | AA |
| amber-ink su surface / amber-soft | 6,62 / 6,01 | 10,48 / 8,90 | AA |
| red-ink su surface / red-soft / sunken | 6,57 / 5,53 / 5,65 | 7,07 / 6,53 / 6,50 | AA |
| display-dim su display | 7,42 | 7,86 | AA |
| testo nero su lime (pulsanti) | 16,36 | 16,36 | AA |
| bianco su red-ink (pulsante elimina) | 6,57 | 6,57 (fisso #B4231A) | AA |
| corpo toast #AEB6C2 su #0E1116 | 9,25 | 9,25 | AA |

Problemi (tutti **BASSO**, non testo essenziale):

| # | Dove | Valore | Nota / fix |
|---|---|---|---|
| C-01 | `src/KmSheet.tsx:124` placeholder `text-ink-3/60` | 2,53 (chiaro), 3,02 (Notte) | Il valore è ripetuto in "Ultimo dato: …" sotto, quindi non è informazione persa. Fix: `placeholder:text-ink-3` (5,78). |
| C-02 | `src/ui.tsx:22` campi `bg-sunken` su card `surface` | 1,16 (chiaro), 1,09 (Notte) | Il bordo del campo è quasi invisibile (1.4.11 contrasto non testuale; difendibile perché ogni campo ha etichetta visibile). Fix: `ring-line-strong` a riposo invece di `ring-transparent`… che dà comunque 1,52: per 3:1 serve un bordo tipo `#8F96A3`. |
| C-03 | stato "in scadenza" `amber` #F5A300 su bianco (pallino `StatusPill`, `MiniBar`) | 2,07 | Lo stato è sempre accompagnato da testo ("In scadenza", "tra N km"): OK per 1.4.1. Nessun fix necessario. |
| C-04 | pillola lime della scheda attiva su `surface` (chiaro) | 1,16 | Lo stato attivo è anche nel colore del testo (ink vs ink-3) e nello spessore dell'icona, più `aria-current`. Accettabile. |

## 3. Revisione UI (ui-review) — viste davvero su iPhone 13, chiaro e Notte

Per cosa serve: tenere il libretto della moto e avvisare prima di tagliandi e scadenze; l'azione principale è "Aggiorna km" e vedere il prossimo intervento.

**Da sistemare (impatto sull'uso)**
1. **Foglio non modale per tastiera/SR** (A-01) e **focus perso al cambio pagina** (A-02).
2. **Toast sopra la testata** per 3,8 s subito dopo il salvataggio della prima moto (`v-04-dash.png`): copre proprio il selettore moto e l'avatar. Fix: toast in basso sopra la tab bar, o margine superiore sotto la testata quando `inTabs`.
3. **Errore della scheda moto lontano dal campo** (A-11): con Marca vuota si apre il menu della marca, l'errore è in fondo dopo ~1.500 px.

**Da migliorare**
4. Sul primo avvio la scheda moto non ha "Indietro" (`App.tsx:299`, `onCancel` undefined): chi ha toccato "Aggiungi moto" per curiosità non può tornare al benvenuto. È voluto (serve una moto) ma conviene dirlo nel sottotitolo.
5. Bordo dei campi quasi invisibile su card bianca (C-02): nei gruppi "Gomme e pressioni" i campi vuoti sembrano blocchi grigi, non input.
6. Il pulsante Google si presenta come "Continue with Google" nel browser di test (locale en-US) nonostante `locale: 'it'` (`GoogleButton.tsx:71`): verificare su un telefono in italiano; se resta in inglese, accanto c'è testo italiano e il mix si nota.
7. Il campo data in Documenti mostra il formato del sistema (in prova `mm/dd/yyyy`): su iPhone italiano sarà gg/mm/aaaa; nessun fix, solo da verificare.

**Già buono:** gerarchia chiara del cruscotto (un numero grande, una sola azione lime), stati vuoti con spiegazione e azione (Interventi, Ultimo intervento, Documenti), sistema di token coerente e niente "look generico", tema Notte curato, reflow a 320 px senza scroll orizzontale, conferme di eliminazione specifiche ("Elimina moto e dati", "Elimina definitivamente").

## 4. UX (audit-as-ux-eng)

Percorso utente: Benvenuto (OK) → Google o "Più tardi" (OK) → Promemoria "Attiva / Non ora" (OK) → Aggiungi moto (WARN: niente indietro) → Scheda moto (WARN: errore lontano) → Cruscotto con toast (OK) → Aggiorna km (OK, festeggiamento e ricalcolo) → Account: copia locale (OK), **eliminare i dati inviati al server da ospite (FAIL, vedi L-01)**.

| # | Gravità | Dove | Problema | Fix minimo |
|---|---|---|---|---|
| U-01 | **ALTO** | `src/Account.tsx:200-206`, `src/Notifications.tsx:75-81` | Un ospite con notifiche attive ha garage, foto e PDF sincronizzati sul server (`sync.ts:99`), ma in Account vede solo "Scarica una copia" (locale) e "Disattiva" notifiche, che cancella **solo** l'iscrizione push (`server/api.ts:609-612`): i dati restano online fino a ~6 mesi. Nessun modo in app per toglierli. | Mostrare la sezione "I tuoi dati" anche quando `getMeta('guest')` è vero, con "Elimina i dati dal server" che chiama il `deleteAccount()` esistente (l'endpoint `/account/delete` funziona già per gli ospiti, usa `userId`). Opzionale: quando l'ospite disattiva le notifiche, chiedere "Eliminare anche la copia sul server?". |
| U-02 | MEDIO | `src/main.tsx:35-58` | `resetLocalData` cancella IndexedDB e localStorage di ogni dispositivo alla prima apertura dopo l'"epoca" 2026-11-25. Va bene prima del lancio; dopo il lancio, cambiare la data per errore cancellerebbe i dati locali di tutti gli utenti senza conferma. | Rimuovere il blocco prima dell'apertura pubblica (o lasciarlo legato a un flag che non si tocca per sbaglio). |
| U-03 | BASSO | `src/Account.tsx:73,88,130` | Le conferme con modifiche non sincronizzate usano `confirm()` nativo, diverso dai fogli usati per tutte le altre conferme. | Riutilizzare `Sheet` (coerenza, testo più leggibile). |
| U-04 | BASSO | `src/App.tsx:380-381` | "Unisci" due moto duplicate parte subito, senza dire quale dato vince né come annullare. | Una riga in più ("Tengo i dati più recenti; non si può annullare") o il foglio di conferma. |

## 5. Prontezza legale / privacy (GDPR, lancio pubblico UE)

Presenti e corretti: informativa art. 13 (`src/Legal.tsx`, pagina `/privacy` raggiungibile anche senza installare: `main.tsx:21` esclude le pagine legali dal blocco), termini (`/termini`), titolare ed email reali da `.env.production` (`VITE_OWNER_NAME`, `VITE_CONTACT_EMAIL=revkeeper.app@gmail.com`), registro art. 30 (`docs/registro-trattamenti.md`), basi giuridiche, destinatari, trasferimenti (DPF/SCC), tempi di conservazione inclusi i backup, diritti e reclamo al Garante, età minima 14 anni (coerente con l'art. 2-quinquies Codice privacy), export completo (`/account/export`) ed eliminazione account con file R2 e push (`server/api.ts:347-416`), pulizia degli ospiti scaduti (`api.ts:107-110`), Sentry configurato senza utente, cookie, intestazioni, corpi e query (client `sentry.tsx:16-24`, server `server/sentry.ts:16-19`), link Privacy/Termini sotto login e notifiche.

**Banner cookie: non serve**, a queste condizioni: localStorage/IndexedDB contengono solo dati necessari al servizio richiesto (garage, sessione, tema); il cookie di sessione `__Host-` HttpOnly è tecnico; Cloudflare Web Analytics è senza cookie; Sentry non usa cookie. L'unico punto grigio è Google (L-02).

| # | Gravità | Dove | Problema | Fix minimo |
|---|---|---|---|---|
| L-01 | **BLOCCANTE** | `src/Legal.tsx:41` | L'informativa dice "Nell'app, in Account, puoi già scaricare tutti i tuoi dati ed eliminare l'account". Non è vero per gli ospiti (U-01), che hanno comunque garage, targa, telaio e allegati sul server. Un'informativa inesatta sui diritti è una violazione degli artt. 12-13 e 17. | Fare U-01 (preferibile) **oppure** correggere la frase: "Con l'account Google puoi farlo da Account; da ospite scrivici a … e cancelliamo i dati entro 30 giorni." |
| L-02 | ALTO | `src/Welcome.tsx:96`, `src/Account.tsx:175`, `src/GoogleButton.tsx:17-29,53-75` | Lo script e l'iframe di Google Identity Services si caricano da soli sulla prima schermata (e in Account), prima che l'utente scelga di accedere: Google riceve IP, user-agent e può leggere i propri cookie anche per chi tocca "Più tardi". L'informativa (`Legal.tsx:31`) cita Google solo come "accesso con Google". Il Garante (linee guida cookie 2021) considera tecnico solo ciò che serve al servizio *richiesto*. | Caricare GIS solo al tocco di un pulsante "Accedi con Google" disegnato dall'app (poi `renderButton`/`prompt`), **oppure** dichiararlo nell'informativa: "La schermata di accesso carica il pulsante di Google, che riceve indirizzo IP e dati del browser anche se non accedi". La prima opzione evita discussioni. |
| L-03 | MEDIO | `src/Legal.tsx:23`, `docs/registro-trattamenti.md:11`, `server/sentry.ts:5-6` | Informativa e registro dicono "senza IP", ma il codice stesso ricorda che l'IP lo toglie solo l'opzione d'organizzazione Sentry "Prevent Storing of IP Addresses". Non verificabile da qui. | Verificare nel pannello Sentry (entrambi i progetti, `revkeeper` e `revkeeper-api`) e annotarlo in `RIPRISTINO.md`/registro. Se non attivabile, togliere "IP" dall'informativa. |
| L-04 | MEDIO | `docs/registro-trattamenti.md:10` | La riga "Account ospite e notifiche" elenca solo codice, endpoint, ora e fuso; ma l'ospite sincronizza tutto il garage (targa, telaio, foto, PDF). L'informativa (`Legal.tsx:19`) lo dice, il registro no. Conservazione "Sessione + 7 giorni" vs "circa 6 mesi" nell'informativa: coerenti solo se la sessione è 180 giorni, va scritto. | Aggiungere "dati del garage" alla riga ospite e "sessione di 180 giorni + 7". |
| L-05 | BASSO | `src/Legal.tsx:16` | Art. 13 chiede anche: se il conferimento è obbligatorio e cosa succede se manca; l'assenza di decisioni automatizzate. | Una riga: "Fornire i dati è facoltativo: senza, l'app funziona solo sul telefono. Nessuna decisione automatizzata." |
| L-06 | BASSO | `src/Legal.tsx:12-16` | Contatto solo via email Gmail. Va bene per un privato, ma conviene almeno indicare il comune di residenza o un indirizzo per raccomandata (alcuni utenti/autorità lo chiedono). | Facoltativo: aggiungere "residente a …". |
| L-07 | BASSO | `src/Legal.tsx:67-72`, `index.html` | Le pagine `/privacy` e `/termini` hanno il titolo "Revkeeper" e non hanno `noindex`/canonical; il link indietro è "← Revkeeper" (la freccia viene letta). | `document.title = 'Informativa privacy · Revkeeper'`; `aria-hidden` sulla freccia. |
| L-08 | BASSO | `server/sentry.ts:18` | `tracesSampleRate: 0.05` sul server invia tracce (percorsi URL, tempi) a Sentry; l'informativa parla solo di "errori". | Mettere 0 o aggiungere "dati di prestazione anonimi" all'informativa. |

Note: la piattaforma europea ODR è stata chiusa nel 2025, quindi i termini non devono più linkarla. Il servizio è gratuito e di un privato: non servono P. IVA né note legali da e-commerce.

## 6. Cosa non ho verificato

- Login Google, notifiche push, sync, export ed eliminazione reali (le API non girano in `vite preview`): valutati dal codice.
- Lettori di schermo reali (VoiceOver/TalkBack): ho dedotto gli annunci da ruoli e nomi, verificati con axe e con l'albero di accessibilità di Chromium.
- Desktop (≥1024 px, barra laterale) e tablet: solo telefono, come richiesto.
- Impostazioni del pannello Sentry e di Cloudflare (L-03).
