# Revkeeper sugli store: Google Play e App Store (ricerca, novembre 2026)

Issue: https://github.com/zsurann/Revkeeper/issues/46
Data della ricerca: 27 novembre 2026. Le pagine ufficiali consultate in quella data sono citate in fondo a ogni sezione. Molte pagine di aiuto Google/Apple non riportano una data di aggiornamento visibile: in quel caso indico "consultata il 2026-11-27".

Contesto: Revkeeper è una PWA gratuita (revkeeper.pages.dev), gestita da un privato, con web push, login Google opzionale e dati offline in IndexedDB. Nessuna monetizzazione.

---

## 1. Sintesi

| | Google Play (TWA) | App Store (Apple) |
|---|---|---|
| Quota | 25 USD una tantum | 99 USD all'anno (in Italia prezzo in valuta locale) |
| Tipo di account per un privato | Personale | Individual |
| Identità | Documento d'identità + prova di indirizzo; verifica di un dispositivo Android con l'app Play Console | Apple Account con 2FA, nome legale reale (diventa il nome venditore), indirizzo (no caselle postali) |
| Blocco iniziale | **Test chiuso con almeno 12 tester per 14 giorni consecutivi** prima della produzione | Nessun test obbligatorio, ma revisione umana |
| Dati pubblici | Nome legale, Paese, email sviluppatore. Indirizzo completo solo se monetizzi o ti dichiari "trader" | Nome legale come venditore. Se ti dichiari "trader" DSA (UE): indirizzo, telefono, email pubblici |
| Tecnologia | TWA: la PWA gira in Chrome a schermo intero, quasi zero codice nativo | Wrapper WKWebView (PWABuilder) da compilare con Xcode su un **Mac** |
| Push | Web push funziona (notification delegation, permesso POST_NOTIFICATIONS su Android 13+) | **Web Push non funziona in WKWebView**: serve push nativo APNs |
| Rischio rifiuto | Basso (sito tuo + Digital Asset Links) | **Alto** (linea guida 4.2, sito "reimpacchettato") |
| Scheda privacy | Data safety obbligatoria + privacy policy + link per eliminazione account | App Privacy ("nutrition label") obbligatoria + privacy policy |

---

## 2. Google Play

### 2.1 Costo e account
- Quota di registrazione: **25 USD una tantum**.
- Account personale: nome legale e indirizzo verificati con documento d'identità ufficiale; email e telefono verificati. Non si può pubblicare finché l'identità non è verificata (circa qualche giorno lavorativo).
- I titolari di account personali devono verificare l'accesso a un dispositivo Android reale tramite l'app mobile Play Console prima di pubblicare.
- Account organizzazione: richiede numero D-U-N-S (fino a ~30 giorni) e mostra pubblicamente telefono e indirizzo. Per un privato non conviene.

Fonti:
- Play Console Help, "Required information to create a Play Console developer account" — https://support.google.com/googleplay/android-developer/answer/13628312 (consultata 2026-11-27)
- Play Console Help, "Verify your identity" — https://support.google.com/googleplay/android-developer/answer/9198012 (consultata 2026-11-27)
- Play Console Help, registrazione e quota — https://support.google.com/googleplay/android-developer/answer/6112435 (consultata 2026-11-27)

### 2.2 Cosa diventa pubblico (indirizzo)
- Account personali: Google mostra **nome legale, Paese e email sviluppatore**. L'**indirizzo completo** viene mostrato solo se l'account monetizza (app a pagamento o acquisti in-app).
- UE/SEE/UK (Digital Services Act): chi si dichiara **trader** espone nome, indirizzo, telefono ed email; chi è **non-trader** espone solo email e Paese. Un privato che distribuisce un'app gratuita senza finalità commerciali può dichiararsi non-trader, ma è un'autodichiarazione di cui si è responsabili (nel dubbio sentire un consulente).
- Consiglio pratico: creare un indirizzo email dedicato (es. revkeeper.dev@...) perché diventa pubblico e va tenuto attivo, pena rimozione delle app.

Fonte: Play Console Help, "Contact information requirements for developer accounts" — https://support.google.com/googleplay/android-developer/answer/10840893 (consultata 2026-11-27)

### 2.3 Test chiuso obbligatorio (account personali nuovi)
- Gli account personali creati dopo il **13 novembre 2023** devono eseguire un **test chiuso con almeno 12 tester che restino iscritti per 14 giorni consecutivi** prima di poter richiedere l'accesso alla produzione.
- I 12 tester devono essere ancora iscritti al momento della richiesta; uscire e rientrare fa ripartire il conteggio. Google valuta anche le risposte al questionario sulla richiesta di accesso e il coinvolgimento dei tester: richieste con test "finti" vengono respinte (riportato da fonti non ufficiali, nessuna conferma Google di criteri numerici).
- È il vero ostacolo per un privato: servono 12 persone reali con account Google e dispositivo Android, disposte a installare dal link di test e a non disiscriversi per due settimane.

Fonte: Play Console Help, "App testing requirements for new personal developer accounts" — https://support.google.com/googleplay/android-developer/answer/14151465 (consultata 2026-11-27)

### 2.4 Requisito livello API
- Dal **31 agosto 2026** le nuove app e gli aggiornamenti devono avere target **Android 16 (API 36)**. Bubblewrap/PWABuilder vanno quindi usati in una versione aggiornata (o va alzato `targetSdkVersion` a mano).

Fonte: Play Console Help, "Target API level requirements" — https://support.google.com/googleplay/android-developer/answer/11926878 (consultata 2026-11-27)

### 2.5 Trusted Web Activity, Bubblewrap, PWABuilder, Digital Asset Links
- Una TWA apre la PWA in Chrome a schermo intero, senza barra URL, con stesso storage del browser (IndexedDB, service worker, cookie).
- **Digital Asset Links obbligatori**: il file deve stare esattamente in `https://revkeeper.pages.dev/.well-known/assetlinks.json` (unico percorso controllato da Chrome) e contenere package name e fingerprint SHA-256 del certificato. Se la verifica fallisce, compare la barra URL di Custom Tabs (l'app sembra un browser e rischia la policy anti-webview).
- Attenzione con Play App Signing: Google firma l'app con la propria chiave, quindi in `assetlinks.json` va messo **anche** il fingerprint SHA-256 della "chiave di firma dell'app" mostrato in Play Console (Configurazione > Integrità app), non solo quello della chiave di upload. Bubblewrap gestisce più fingerprint (`bubblewrap fingerprint add` / `generateAssetLinks`).
- Su Cloudflare Pages il file in `/.well-known/` si pubblica come asset statico; verificare che venga servito con `Content-Type: application/json` e senza redirect.
- Requisiti Bubblewrap CLI: Node.js 18+, **JDK 17**, Android command line tools. PWABuilder (pwabuilder.com) fa lo stesso lavoro dal browser e restituisce AAB firmato + `assetlinks.json`.
- Login Google: dentro una TWA è Chrome, quindi il flusso OAuth web funziona come nel browser.

Fonti:
- Chrome for Developers, "Trusted Web Activity integration guide" — https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide (consultata 2026-11-27)
- Bubblewrap CLI README — https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md (consultata 2026-11-27)

### 2.6 Policy Google sulle web app incapsulate
- La policy spam "Webviews and Affiliate Spam" vieta app il cui scopo principale è mostrare un sito **senza il permesso del proprietario** o generare traffico affiliato. Google raccomanda comunque di offrire funzionalità che arricchiscano l'esperienza, non un semplice involucro di un sito.
- Per Revkeeper il rischio è **basso**: il sito è dello sviluppatore (dimostrato dai Digital Asset Links), funziona offline, ha notifiche e una funzione propria. Le TWA sono la via promossa da Google stessa per le PWA.

Fonti:
- Play Console Help, policy Spam — https://support.google.com/googleplay/android-developer/answer/9899034 (consultata 2026-11-27)
- Android Developers Blog, "Developer tips and guides: Common policy violations" (ottobre 2020) — https://android-developers.googleblog.com/2020/10/developer-tips-and-guides-common-policy.html

### 2.7 Notifiche push in TWA
- Con `enableNotifications: true` in `twa-manifest.json` Bubblewrap attiva la **notification delegation**: le web push della PWA vengono mostrate come notifiche dell'app Android (icona e nome dell'app), non di Chrome.
- Su Android 13+ serve il permesso runtime `POST_NOTIFICATIONS`; il servizio Jetpack `TrustedWebActivityService` lo richiede. Il server push (VAPID) resta quello attuale: nessun FCM nativo necessario.
- Esistono segnalazioni di delega che non scatta (prompt in stile browser invece di quello nativo), di solito legate a Digital Asset Links non verificati: testare su dispositivo reale prima del test chiuso.

Fonti:
- Bubblewrap CLI README (campo `enableNotifications`) — link sopra
- Android Developers, "Notification runtime permission" — https://developer.android.com/develop/ui/views/notifications/notification-permission (consultata 2026-11-27)
- AndroidX, `TrustedWebActivityService` — https://developer.android.com/reference/androidx/browser/trusted/TrustedWebActivityService

### 2.8 Data safety e eliminazione account
- La scheda **Data safety** è obbligatoria per ogni app pubblicata (anche tracce di test chiuso/aperto), anche se non raccoglie dati; richiede un link alla **privacy policy**.
- I dati elaborati solo sul dispositivo e mai trasmessi (IndexedDB locale) **non** vanno dichiarati come "raccolti". Vanno dichiarati invece: email/nome dal login Google (se inviati al backend), endpoint/token push, eventuali dati sincronizzati.
- **Eliminazione account**: se l'app permette di creare un account (il login Google opzionale lo è, se crea un profilo lato server), serve un'opzione di eliminazione **dentro l'app** e un **link web** indicato in Play Console; disattivare l'account non basta, i dati associati vanno cancellati.

Fonti:
- Play Console Help, "Provide information for Google Play's Data safety section" — https://support.google.com/googleplay/android-developer/answer/10787469 (consultata 2026-11-27)
- Play Console Help, "Understanding Google Play's app account deletion requirements" — https://support.google.com/googleplay/android-developer/answer/13327111 (consultata 2026-11-27)

---

## 3. App Store (Apple)

### 3.1 Costo e account
- **Apple Developer Program: 99 USD per anno di iscrizione** (prezzo in valuta locale). Esenzione solo per non profit, istituzioni scolastiche, enti pubblici.
- Account Individual: Apple Account con autenticazione a due fattori, maggiore età, **nome legale reale** (diventa il nome venditore pubblico sull'App Store), email, telefono e indirizzo verificati (niente caselle postali).
- Serve un **Mac con Xcode** per compilare e caricare il progetto generato da PWABuilder (o un servizio CI macOS a pagamento).

Fonte: Apple Developer, "Enrollment" — https://developer.apple.com/programs/enroll/ (consultata 2026-11-27)

### 3.2 Trader DSA (UE)
- Per distribuire nell'UE va dichiarato lo status di trader. Un individuo che si dichiara **trader** deve fornire indirizzo (o casella postale), telefono ed email, **mostrati sulla pagina dell'app nell'UE**. Chi non è trader risponde "This is not a trader account" e non fornisce contatti pubblici.
- App gratuita di un privato senza fini commerciali: plausibile non-trader, ma è un'autodichiarazione.

Fonte: App Store Connect Help, "Manage European Union Digital Services Act trader requirements" — https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/ (consultata 2026-11-27)

### 3.3 Linea guida 4.2 (Minimum Functionality) e PWA incapsulate
Testo (App Review Guidelines, consultate 2026-11-27):
> 4.2 "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."
> 4.2.2 "Other than catalogs, apps shouldn't primarily be marketing materials, advertisements, web clippings, content aggregators, or a collection of links."

E nell'introduzione: "...we provide Safari for a great web experience too."

- Apple **non vieta** le app basate su web view, ma respinge quelle che non offrono nulla in più del sito in Safari. Il messaggio tipico di rifiuto: "not sufficiently different from a mobile browsing experience".
- PWABuilder genera un progetto Xcode con la PWA in WKWebView. Il team PWABuilder dichiara di non aver ottenuto da Apple una posizione ufficiale sulle PWA, pur riportando casi di pubblicazione riusciti.
- Valutazione: per Revkeeper il rischio di rifiuto con un wrapper puro è **alto**. Per avere chance realistiche serve aggiungere funzioni native: push APNs nativo, eventualmente widget, condivisione/Share Sheet, Face ID, notifiche locali. Questo significa scrivere e mantenere codice Swift.

Fonti:
- Apple, "App Review Guidelines" — https://developer.apple.com/app-store/review/guidelines/ (consultata 2026-11-27)
- PWABuilder blog, "Publish your PWA to the iOS App Store" — https://blog.pwabuilder.com/posts/publish-your-pwa-to-the-ios-app-store/

### 3.4 Login (4.8) e account (5.1.1)
- **4.8**: se usi Google Sign-In per l'account principale devi offrire anche un'altra opzione equivalente che limiti i dati a nome ed email, permetta di nascondere l'email e non tracci per pubblicità (in pratica **Sign in with Apple**). Implementarla in una WKWebView richiede configurazione Apple (Services ID, dominio verificato).
- **5.1.1(v)**: se l'app non ha funzioni significative basate su account, deve funzionare senza login (Revkeeper lo fa già, login opzionale); se permette di creare un account, deve offrire **l'eliminazione dell'account dall'app**.

Fonte: App Review Guidelines (link sopra).

### 3.5 Notifiche push su iOS
- **Dentro un'app WKWebView le Web Push non funzionano** (dichiarazione di un ingegnere Apple DTS sui forum sviluppatori). I service worker funzionano, ma la push deve passare da **APNs nativo** (es. via Firebase Cloud Messaging per iOS) con un bridge verso la pagina web: secondo backend di invio e codice nativo.
- Fuori dallo store: da iOS/iPadOS **16.4** le web app aggiunte alla schermata Home ricevono Web Push standard (permesso chiesto solo dopo un gesto dell'utente), con Badging API e integrazione con le modalità Full immersione (Focus). Apple ha poi introdotto la **Declarative Web Push** (formato dichiarativo che mostra la notifica senza eseguire JavaScript).

Fonti:
- Apple Developer Forums, thread su PWABuilder e push — https://developer.apple.com/forums/thread/789719 (consultata 2026-11-27)
- WebKit blog, "Web Push for Web Apps on iOS and iPadOS" (16 febbraio 2023) — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit blog, "Meet Declarative Web Push" — https://webkit.org/blog/16535/meet-declarative-web-push/ (pagina non raggiungibile al momento della verifica, errore 502)

### 3.6 Scheda privacy (App Privacy)
- Le "App Privacy details" sono **obbligatorie** per inviare nuove app e aggiornamenti, e serve un **URL di privacy policy** pubblico.
- Come su Google, i dati elaborati solo sul dispositivo non sono "raccolti". Vanno dichiarati email/nome del login, token push, ecc., anche se raccolti da SDK terzi (es. Firebase).

Fonte: Apple, "App privacy details on the App Store" — https://developer.apple.com/app-store/app-privacy-details/ (consultata 2026-11-27)

---

## 4. Cosa si perde (o non si perde) restando solo web

### Android
Quasi nulla dal punto di vista tecnico: Chrome installa la PWA (WebAPK), le web push funzionano, l'icona sta nel launcher. Si perde la **scopribilità** (ricerca nel Play Store, recensioni, fiducia dell'utente medio che "le app si prendono dallo store") e la facilità di installazione per chi non conosce il menu "Installa app".

### iOS
- **Installazione solo manuale**: Safari (o, da iOS 16.4, altri browser) > Condividi > "Aggiungi alla schermata Home". Nessun prompt di installazione automatico: bisogna spiegarlo all'utente con istruzioni in-app.
- **Push solo dalla web app installata** sulla schermata Home, non da una scheda di Safari; il permesso va chiesto dopo un tap dell'utente.
- Lo storage della web app installata è **separato** da quello di Safari: i dati in IndexedDB creati nel browser non si ritrovano nell'app installata (rilevante: suggerire di installare prima di iniziare a inserire dati, oppure offrire export/import o sync).
- WebKit può cancellare lo storage dei siti non usati da tempo (politiche ITP sui siti visitati nel browser); le web app sulla schermata Home sono trattate diversamente, altro motivo per spingere l'installazione.
- **UE**: Apple aveva annunciato la rimozione delle web app dalla schermata Home nell'UE con iOS 17.4 (DMA), poi ha fatto marcia indietro e le ha mantenute (marzo 2024), sempre basate su WebKit. Non ho trovato annunci successivi che cambino la situazione.

Fonti:
- WebKit blog (16.4) — link sopra
- Apple Developer, "Update on apps distributed in the European Union" — https://developer.apple.com/support/dma-and-apps-in-the-eu/ (consultata 2026-11-27)

---

## 5. Raccomandazione

1. **Google Play: fattibile**, costo 25 USD. Il vero collo di bottiglia è trovare 12 tester reali per 14 giorni. Prerequisiti: `assetlinks.json` su Cloudflare Pages con entrambi i fingerprint, privacy policy pubblica, pagina web di eliminazione account (se il login Google crea un profilo lato server), target API 36, email pubblica dedicata, scelta consapevole "non-trader".
2. **App Store: sconsigliato per ora.** 99 USD all'anno, Mac obbligatorio, Sign in with Apple da aggiungere, push da riscrivere su APNs, e rischio alto di rifiuto per 4.2 con un wrapper puro. Ha senso solo se si è disposti a scrivere funzioni native.
3. **iOS restando web**: aggiungere nella PWA una guida "Aggiungi alla schermata Home" per Safari e chiedere il permesso push solo dopo l'installazione e un tap.

## Limiti della ricerca
- Diverse pagine di aiuto Google/Apple non espongono una data di aggiornamento; i contenuti possono cambiare.
- Criteri di "coinvolgimento" dei tester Google e tempi di revisione citati da blog di terze parti non sono confermati da Google.
- Non è consulenza legale sullo status di trader DSA.
