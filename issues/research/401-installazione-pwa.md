# 401 — Installazione PWA obbligatoria su telefono

Ricerca del 2026-11-21. Contesto: `vite.config.ts` ha già `display: 'standalone'`, `start_url: '/'`, icone 192/512 + maskable, Workbox `generateSW` (che include un gestore `fetch`); `index.html` ha già `apple-mobile-web-app-capable`, `black-translucent`, `viewport-fit=cover` e `apple-touch-icon`.

Legenda: **[verificato]** = letto su fonte ufficiale; **[non verificato]** = da fonti terze, da memoria o non confermato su un dispositivo reale. Le etichette italiane dei menu cambiano tra una versione e l'altra: provarle su un dispositivo prima di metterle nel testo.

## Risposta breve

- **App installata o no:** `matchMedia('(display-mode: standalone)')` funziona ovunque ci serve (Chrome/Samsung/Firefox Android, Safari iOS 12.2+). Su iOS si aggiunge `navigator.standalone === true` come riserva.
- **Telefono o desktop:** `navigator.userAgentData.mobile` esiste solo su Chrome e Opera Android, quindi serve anche lo user agent (`Android.*Mobile|iPhone|iPod`). iPadOS si presenta come "Macintosh": va riconosciuto con `maxTouchPoints > 1`. **Consiglio: l'iPad (e i tablet Android) restano "sito normale"**, come il desktop. Il blocco vale solo per i telefoni.
- **Android:** `beforeinstallprompt` si ottiene su Chrome, Samsung Internet e Opera, ma **non su Firefox** [verificato, MDN BCD]. Va catturato subito (prima che React monti), con `preventDefault()`, poi si chiama `prompt()` dal pulsante "Scarica app". Senza l'evento (Firefox, prompt rifiutato, criteri non ancora soddisfatti) mostrare i passaggi manuali.
- **iPhone:** da iOS 16.4 si può aggiungere alla schermata Home da Safari, Chrome, Edge, Firefox e Orion [verificato, MDN/WebKit]. Su iOS 26 Safari il percorso è: "Menu della pagina" (…) → **Condividi** → **Aggiungi alla schermata Home** → **Apri come app web** attivo → **Aggiungi** [verificato, Apple Support IT].
- **Browser interni** (Instagram, Facebook, TikTok…): non possono aggiungere alla Home. Chiedere di aprire in Safari: provare `x-safari-https://` (non documentato da Apple, funziona da iOS 17), e come riserva mostrare il link da copiare.
- **App già installata:** su Android Chrome si rileva con `navigator.getInstalledRelatedApps()` (serve `related_applications` nel manifest). **Su iOS non si può rilevare.**
- **Notifiche su iOS:** funzionano solo con l'app aggiunta alla Home (iOS 16.4+), e il permesso va chiesto da un tocco dell'utente [verificato, WebKit].

## Rilevare app installata e telefono

```ts
// src/lib/piattaforma.ts
const ua = navigator.userAgent

export const installata =
  ['standalone', 'fullscreen', 'minimal-ui'].some(m => matchMedia(`(display-mode: ${m})`).matches) ||
  (navigator as { standalone?: boolean }).standalone === true // solo iOS, non standard

export const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1 // iPadOS 13+ si presenta come Mac
export const ios = /iPhone|iPod|iPad/.test(ua) || iPadOS
export const android = /Android/.test(ua)

// userAgentData esiste solo su Chromium Android (Chrome 90+, Opera 64+). Samsung Internet, Firefox e Safari non ce l'hanno.
const uaData = (navigator as { userAgentData?: { mobile: boolean } }).userAgentData
export const telefono = uaData ? uaData.mobile : /iPhone|iPod/.test(ua) || /Android.*Mobile/.test(ua)
```

- `display-mode` è supportato da Chrome Android 42+, Samsung 4+, Firefox Android 47+ e Safari iOS 12.2+ [verificato, MDN BCD 7.3]. Con `display: 'standalone'` il valore atteso è `standalone`. `fullscreen` e `minimal-ui` sono controllati solo per sicurezza. `display_override` non ci serve: Safari iOS e Firefox non lo supportano, e il nostro `display` basta.
- Per accorgersi dell'installazione mentre la pagina è aperta: `matchMedia('(display-mode: standalone)').addEventListener('change', …)` e l'evento `appinstalled`.
- Su Android i tablet non hanno "Mobile" nello user agent, e `userAgentData.mobile` vale `false`: con le regole sopra restano "sito".
- **iPad: consiglio di trattarlo come desktop.** Schermo grande, Safari "desktop-class", e la richiesta parla di telefoni. Se un giorno si vorrà il blocco anche su iPad, basta usare `ios` al posto di `telefono` per il ramo Apple.
- **[non verificato]** Su iOS 26, un sito aggiunto alla Home con "Apri come app web" disattivato diventa un semplice segnalibro: si apre in Safari e `display-mode` resta `browser`. È il comportamento corretto: la pagina di installazione verrà mostrata di nuovo.

## Android

### Chi espone `beforeinstallprompt` (MDN browser-compat-data 7.3.17, maggio 2026)

| Browser | `beforeinstallprompt` | `appinstalled` | Tipo di installazione |
|---|---|---|---|
| Chrome (con Google Play services) | sì (44+) | sì | WebAPK, app vera |
| Samsung Internet | sì (5.0+) | sì | WebAPK sui Galaxy; altrove scorciatoia |
| Opera | sì (32+) | no (evento mai generato) | scorciatoia con il marchio del browser |
| Edge Android | probabilmente sì (Chromium) **[non verificato]** | ? | scorciatoia con il marchio del browser (MDN) |
| Firefox Android | **no** | no | menu "Installa", scorciatoia |

MDN: solo Chrome con GMS e Samsung Internet sui Samsung creano un WebAPK. Gli altri creano una scorciatoia con il marchio del browser, che apre il sito nel browser stesso [verificato]. **[non verificato]** Se quella scorciatoia apra in `display-mode: standalone` o in una normale scheda dipende dal browser: per Firefox ed Edge va provato. Se si apre come scheda, l'utente rivedrebbe la pagina di installazione.

### Criteri di installabilità di Chrome (web.dev, developer.chrome.com) [verificato]

- HTTPS; app non già installata.
- Manifest con `name` o `short_name`, `icons` 192 e 512, `start_url`, `display` tra `fullscreen`/`standalone`/`minimal-ui`/`window-controls-overlay`, `prefer_related_applications` assente o `false`. **Revkeeper li soddisfa già tutti.**
- Coinvolgimento dell'utente: almeno un clic o tocco sulla pagina (anche in una visita precedente) e almeno 30 secondi di visualizzazione (anche in un'altra visita). **Il primissimo accesso può quindi non avere ancora l'evento.** Il pulsante deve funzionare comunque, mostrando i passaggi manuali.
- Service worker: dal menu non serve più (Chrome 108 mobile). Per **il prompt** (`beforeinstallprompt`) Chrome richiede ancora un service worker con un gestore `fetch`, e ignora quelli vuoti. Workbox `generateSW` ne ha uno: ok.

### Codice

Catturare l'evento **prima** che React monti, altrimenti si può perdere:

```ts
// src/main.tsx, in cima
type EventoInstallazione = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}
export let richiestaInstallazione: EventoInstallazione | null = null

addEventListener('beforeinstallprompt', e => {
  e.preventDefault() // niente mini-infobar di Chrome: usiamo il nostro pulsante
  richiestaInstallazione = e as EventoInstallazione
  dispatchEvent(new Event('installabile')) // la pagina di installazione si aggiorna
})
addEventListener('appinstalled', () => {
  richiestaInstallazione = null
  // mostrare: "Installata! Apri Revkeeper dalla schermata Home"
})
```

```ts
// click su "Scarica app"
async function scarica() {
  if (!richiestaInstallazione) return mostraPassaggiManuali()
  await richiestaInstallazione.prompt() // solo da un gesto dell'utente; ogni evento si usa una volta sola
  const { outcome } = await richiestaInstallazione.userChoice
  richiestaInstallazione = null
  if (outcome === 'dismissed') mostraPassaggiManuali()
}
```

- `preventDefault()` sopprime la mini-infobar di Chrome (da Chrome 76) [verificato, developer.chrome.com]. L'icona di installazione nel menu di Chrome resta comunque disponibile.
- Dopo un rifiuto bisogna aspettare un nuovo `beforeinstallprompt` (web.dev). La mini-infobar rifiutata resta nascosta per circa 3 mesi (post di Chrome del 2019). **[non verificato]** Se e quando Chrome rigeneri `beforeinstallprompt` dopo un `dismissed` dal nostro `prompt()`: in pratica di solito torna alla navigazione successiva, ma non è documentato. Per questo dopo un rifiuto si mostrano subito i passaggi manuali.
- Sul desktop Chrome genera lo stesso evento: ignorarlo, cioè non chiamare `preventDefault()` se `!telefono`, così il desktop resta come oggi.

### Passaggi manuali (quando non c'è l'evento)

- **Chrome:** menu **⋮** ("Altro", a destra della barra degli indirizzi) → **"Installa e crea scorciatoia"** → **"Installa"** [verificato, Guida Chrome IT]. Nelle versioni precedenti la voce era "Aggiungi a schermata Home" / "Installa app" **[non verificato]**: nel testo si può scrivere "Installa app o Aggiungi a schermata Home".
- **Samsung Internet:** icona di installazione (un "+" o un'icona di download) nella barra degli indirizzi, oppure menu **≡** → "Aggiungi pagina a" → "Schermata Home" **[non verificato: etichette italiane non trovate su fonti ufficiali]**.
- **Firefox:** menu **⋮** → **"Installa"**. Sui siti senza manifest la voce è "Aggiungi alla schermata principale" **[non verificato, solo forum Mozilla]**.
- **Edge / Opera:** menu → "Aggiungi al telefono" / "Schermata Home" **[non verificato]**.

### Browser interni su Android

Le WebView non generano `beforeinstallprompt`. Si può aprire Chrome con un link `intent:` (documentato da Chrome, "Android Intents with Chrome"):

```html
<a href="intent://revkeeper.pages.dev/#Intent;scheme=https;package=com.android.chrome;end">Apri in Chrome</a>
```

**[non verificato]** Alcune app (Instagram, TikTok) bloccano i link `intent:`. Come riserva: "Tocca ⋮ e scegli Apri nel browser".

## iPhone

Requisito: iOS/iPadOS 16.4+ per i browser diversi da Safari (MDN: "Safari, Chrome, Edge, Firefox, and Orion"). Su iOS 26 qualunque sito aggiunto alla Home si apre come app web per impostazione predefinita, anche senza manifest (WebKit, Safari 26.0) [verificato]. Il pulsante Condividi è sempre il quadrato con la freccia in su.

| Browser (token UA) | Può installare? | Passaggi (etichette IT) |
|---|---|---|
| **Safari iOS 26** (nessun token, `Safari/` senza `CriOS/FxiOS/EdgiOS`) | sì | 1. Tocca **…** ("Menu della pagina", accanto alla barra degli indirizzi) → **Condividi**. Con il layout "In basso" o "In alto" il pulsante **Condividi** è già visibile. 2. Scorri e tocca **"Aggiungi alla schermata Home"**. Se manca: in fondo **"Modifica azioni"** e aggiungila. 3. Lascia attivo **"Apri come app web"**. 4. Tocca **Aggiungi**. [verificato, Apple Support IT] |
| **Safari iOS 17–18** | sì | Tocca **Condividi** nella barra in basso → **"Aggiungi alla schermata Home"** → **Aggiungi** (in alto a destra). [etichette coerenti con la guida Apple; percorso per iOS 18 non riletto: **non verificato**] |
| **Chrome** (`CriOS/`) | sì (16.4+) | Tocca **Condividi** nella barra degli indirizzi (in alto a destra) → **"Aggiungi alla schermata Home"** → **Aggiungi**. In alternativa menu **…** → Condividi. [**non verificato**: fonti terze 2023 (iPhoneItalia, GHacks); le versioni recenti spostano le voci] |
| **Edge** (`EdgiOS/`) | sì (16.4+) | Menu **…** → **Condividi** → **"Aggiungi alla schermata Home"** → **Aggiungi**. [**non verificato**] |
| **Firefox** (`FxiOS/`) | sì (16.4+) | Tocca **Condividi** nella barra degli indirizzi (oppure menu ≡ → Condividi) → **"Aggiungi alla schermata Home"** → **Aggiungi** (in alto a destra). [supporto Mozilla in inglese; etichette IT **non verificate**] |
| **Opera** (`OPT/`; il vecchio `OPiOS/` era Opera Mini) | probabilmente sì **[non verificato]** | Istruzioni generiche: Condividi → "Aggiungi alla schermata Home" |
| Brave, DuckDuckGo, Orion | Brave ha lo stesso UA di Safari; gli altri **[non verificato]** | Mostrare le istruzioni di Safari, che coincidono con il foglio Condividi di iOS |
| **Browser interni** (sotto) | **no** | "Apri questa pagina in Safari" |

Note:

- Il passaggio finale ("Aggiungi alla schermata Home" → Aggiungi) avviene nel foglio Condividi di sistema, uguale per tutti i browser. Cambia solo **come si arriva a Condividi**.
- Da iOS 26 la voce "Aggiungi alla schermata Home" può essere nascosta più in basso. Il suggerimento "scorri verso il basso" va sempre incluso.
- Se il browser non si riconosce, mostrare le istruzioni di Safari e aggiungere "se non trovi la voce, apri la pagina in Safari".

## Browser interni

Token dello user agent da riconoscere (fonti terze, ad esempio la libreria `inapp-spy`; **da confermare con UA catturati sui dispositivi reali**):

```ts
// shortcut: lista a mano, va aggiornata quando un'app cambia user agent
const browserInterno = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|LinkedInApp|BytedanceWebview|musical_ly|TikTok|Snapchat|\bLine\/|\bGSA\/|Twitter|Pinterest|MicroMessenger|Threads/i.test(navigator.userAgent)
```

- `GSA/` = app Google (iOS). Le pagine aperte dall'app Google sono un browser interno e non hanno "Aggiungi alla Home" **[non verificato]**.
- Messenger iOS: `FBAN/MessengerForiOS`. Facebook iOS: `[FBAN/FBIOS;FBAV/…]`.
- **WhatsApp, Gmail, X/Twitter e Telegram** di norma aprono i link in Safari, nel browser predefinito o in **SFSafariViewController**. **[non verificato]** dipende dalle impostazioni di ogni app.
- **SFSafariViewController** (il "mini Safari" dentro le app) ha **lo stesso UA di Safari** e nel foglio Condividi **non offre "Aggiungi alla schermata Home"** (WebKit bug 198673). Non c'è un modo affidabile per riconoscerlo: il trucco del font `.Helvetica LT MM` (gist aeharding) non funziona più da iOS 16. Contromisura: le istruzioni Safari includono sempre "Se non vedi la voce, tocca l'icona della bussola / Apri in Safari".
- **WKWebView** (Instagram, Facebook, TikTok, LinkedIn…) non ha il foglio Condividi del sito: non può aggiungere alla Home.

Aprire in Safari:

```html
<a href="x-safari-https://revkeeper.pages.dev/">Apri in Safari</a>
```

- `x-safari-https://` **non è documentato da Apple**. Secondo WebKit bug 240025 e alcuni sviluppatori funziona "almeno da iOS 17.0", su iOS 16 no. **[non verificato su iOS 26]**. Alcune app potrebbero bloccarlo.
- Riserva sempre presente: pulsante "Copia link" (`navigator.clipboard.writeText(location.href)`) più il testo "Tocca **…** (o ⋮) in alto e scegli **Apri nel browser** / **Apri in Safari**, oppure incolla il link in Safari". **[etichette dei menu di Instagram/Facebook non verificate]**.

## App già installata

- **Android Chrome 84+ / Samsung Internet 14+:** `navigator.getInstalledRelatedApps()` restituisce la PWA se la pagina è nello stesso scope [verificato, developer.chrome.com + MDN BCD]. Serve nel manifest:

```ts
// vite.config.ts → manifest
id: '/',
related_applications: [{ platform: 'webapp', url: 'https://revkeeper.pages.dev/manifest.webmanifest' }],
```

```ts
const app = await (navigator as any).getInstalledRelatedApps?.() ?? []
if (app.length) mostra('Revkeeper è già installata: aprila dall\'icona nella schermata Home')
```

  Il nome del file manifest generato da vite-plugin-pwa è `manifest.webmanifest` (va verificato in `dist/`). Utile perché un link aperto in Chrome finisce in una scheda anche con l'app installata. Chrome offre anche "Apri nell'app" nel menu **[non verificato]**.
- **iOS: impossibile.** Safari non espone nessuna API e la web app sulla Home ha un contesto separato. Il testo della pagina di installazione deve sempre dire: "Hai già aggiunto Revkeeper? Aprila dall'icona nella schermata Home".
- Firefox/Opera Android: nessuna API.

## Notifiche

- iOS/iPadOS 16.4+: "A web app that has been added to the Home Screen can request permission to receive push notifications". Il permesso va chiesto in risposta a un'interazione diretta, ad esempio il tocco su un pulsante [verificato, WebKit blog 13878]. In Safari, cioè non installata, `Notification` è `undefined` (MDN BCD). Il blocco "solo da installata" quindi aiuta anche le notifiche.
- Android: le notifiche funzionano anche nel browser, ma vale la stessa regola del gesto (Chrome ignora o blocca le richieste senza gesto).
- iOS 26: la guida Apple conferma che il sito aperto come app web "può inviare notifiche".

## Insidie

1. **Catturare `beforeinstallprompt` presto**: in `main.tsx`, non in un `useEffect`.
2. **Il service worker va registrato anche nella pagina di installazione**: è il requisito del prompt di Chrome. Non condizionare `registerSW` al fatto che l'app sia installata.
3. **`start_url`/`scope`**: `start_url: '/'` e lo scope implicito `/` vanno bene. Aggiungere `id: '/'` così l'identità dell'app resta stabile anche se un giorno cambia `start_url`. `navigateFallback` di Workbox (index.html) serve già la SPA per ogni percorso, quindi la pagina di installazione è la stessa SPA e non una pagina separata.
4. **Archivio separato su iOS**: la web app sulla Home **non condivide** localStorage, IndexedDB e cookie con Safari. Chi usa il sito in Safari e poi installa riparte da zero, con login da rifare. Con il blocco su telefono il problema quasi sparisce, ma i dati creati in Safari prima dell'aggiornamento andrebbero sincronizzati dal server (vedi 010-strategia-sync) prima di bloccare. **[il WebKit blog sulla storage policy non lo dice esplicitamente; è comportamento noto, non riverificato su iOS 26]**. La web app installata ottiene più facilmente `navigator.storage.persist()` [verificato, WebKit blog 14403].
5. **Meta per la barra di stato**: `apple-mobile-web-app-capable` non è più necessario su iOS 26 (basta il manifest, anzi nemmeno quello), ma resta innocuo per iOS ≤ 18. Chrome segnala come deprecato `apple-mobile-web-app-capable` senza `<meta name="mobile-web-app-capable" content="yes">` **[non verificato]**: aggiungere anche quest'ultimo costa una riga. Con `black-translucent` il contenuto passa sotto la barra di stato: servono `padding-top: env(safe-area-inset-top)` e simili (il `viewport-fit=cover` c'è già).
6. **Schermata di avvio su iOS**: iOS non la genera dal manifest. Senza `<link rel="apple-touch-startup-image">` (un'immagine per ogni risoluzione) mostra uno schermo vuoto, bianco o del colore di sfondo, per un attimo **[non riverificato su iOS 26]**. Android la genera da `name`, `background_color` e icona 512.
7. **Desktop invariato**: decidere il blocco solo con `telefono && !installata`. Sul desktop non chiamare `preventDefault()` su `beforeinstallprompt`.
8. **Sviluppo e test**: per provare la vista "installata" senza installare, aggiungere un override, ad esempio `?standalone=1` in dev. In Chrome DevTools: Application → Manifest → "Installability".
9. **iOS e cache di Workbox**: la web app iOS ha una cache del service worker separata da Safari. Funziona, ma il primo avvio dalla Home riscarica il precache.
10. **Rischio di blocco totale**: se il rilevamento sbaglia (UA strano, scorciatoia Firefox che apre in una scheda), l'utente resta chiuso fuori. Conviene un link discreto "Continua nel browser" o almeno un contatto **[decisione di prodotto]**.

## Fonti

- web.dev, Install criteria: https://web.dev/articles/install-criteria
- web.dev, Installation prompt: https://web.dev/learn/pwa/installation-prompt
- Chrome, Revisiting installability criteria: https://developer.chrome.com/blog/update-install-criteria
- Chrome, Mini-infobar (Chrome 76): https://developer.chrome.com/blog/mini-infobar-update/
- Chrome, Changes to A2HS behavior (circa 3 mesi): https://developer.chrome.com/blog/a2hs-updates
- Chrome, getInstalledRelatedApps: https://developer.chrome.com/docs/capabilities/get-installed-related-apps
- Chrome, Android Intents with Chrome: https://developer.chrome.com/docs/android/intents
- Guida Chrome (IT), installare app web su Android: https://support.google.com/chrome/answer/9658361?hl=it&co=GENIE.Platform%3DAndroid
- MDN, beforeinstallprompt: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
- MDN, Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN, display-mode: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode
- MDN browser-compat-data 7.3.17 (2026-05-22): https://cdn.jsdelivr.net/npm/@mdn/browser-compat-data@7/data.json
- WebKit, Web Push for Web Apps on iOS and iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit, Safari 16.4: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/
- WebKit, Safari 26.0: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- WebKit, Updates to Storage Policy: https://webkit.org/blog/14403/updates-to-storage-policy/
- Apple Support (IT), Aprire un sito come un'app web: https://support.apple.com/it-it/guide/iphone/iphea86e5236/ios
- heise, iOS 26 web app sulla Home: https://heise.de/-10749652
- Mozilla Support, Add a website shortcut on iOS: https://support.mozilla.org/en-US/kb/add-website-shortcut-your-home-screen-ios
- Mozilla Hacks, PWA in Firefox Android: https://hacks.mozilla.org/2017/10/progressive-web-apps-firefox-android/
- Samsung Internet, Home screen: https://samsunginternet.github.io/docs/homescreen
- WebKit bug 198673 (SFSafariViewController senza "Aggiungi alla Home"): https://bugs.webkit.org/show_bug.cgi?id=198673
- WebKit bug 240025 (x-safari-https): https://bugs.webkit.org/show_bug.cgi?id=240025
- Christian Tietze, Safari URL scheme: https://christiantietze.de/posts/2023/05/safari-for-mac-url-scheme
- Gist rilevamento SFSafariViewController: https://gist.github.com/aeharding/08eaafbb7742f78ede9b8d2f5d096354
- inapp-spy (token dei browser interni): https://github.com/shalanah/inapp-spy
- iPhoneItalia, Chrome iOS aggiunge web app alla Home: https://www.iphoneitalia.com/?p=811711
