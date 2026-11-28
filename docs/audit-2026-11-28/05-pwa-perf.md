# 05 — PWA, prestazioni, e2e, bundle

Data: 2026-11-28. Strumenti: Lighthouse 12.8.2 (preset mobile, Moto G emulato, rete 4G lenta simulata), Chromium 1243 headless tramite Playwright, `vite build --sourcemap` in una cartella temporanea e source-map-explorer 2.5.3 per la composizione del bundle.
Nessun file del repo è stato modificato. Gli output grezzi sono in `pwa/` (`lh-live.json`, `lh-local.json`, `e2e3.log`, `sme.json`, script `offline.cjs`, `repro.cjs`, `install.cjs`).

## 1. Punteggi Lighthouse (mobile)

| | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|---|---|---|
| Live https://revkeeper.pages.dev | **95** | 100 | 100 | 100 | 2,0 s | 2,7 s | 60 ms | 0,007 | 2,0 s |
| Locale `vite preview` | **96** | 100 | 100 | 100 | 2,1 s | 2,3 s | 0 ms | 0,007 | 2,1 s |

Note sulle misure:
- Il live è stato misurato attraverso il proxy in uscita della sandbox: TTFB 606 ms, quindi il tempo reale degli utenti è probabilmente un po' migliore.
- Con l'user agent mobile, Lighthouse riceve la **pagina di installazione** (il "gate": `main.tsx` blocca il browser del telefono) e non l'app. L'elemento LCP è un `<p>` della scheda Install. I punteggi descrivono quindi la prima visita da telefono, cioè la pagina che conta di più per la conversione.
- Lighthouse 12 non ha più la categoria PWA. L'installabilità è stata verificata a mano (§2.1): l'app è installabile.

### Cosa la rende lenta
L'LCP si scompone in **TTFB 23 % + Render Delay 77 % (2,08 s)**, con Load Delay e Load Time a 0: il testo è pronto subito, ma non compare finché React non ha scaricato, interpretato ed eseguito il bundle principale.
- L'HTML ha `#root` vuoto, quindi FCP e LCP dipendono interamente dal JS.
- Il chunk `index-*.js` pesa 515 kB minificato (160 kB gzip, 188 kB trasferiti sul live), di cui **112 KiB inutilizzati** al primo caricamento: l'audit `unused-javascript` stima 740 ms di risparmio.
- Lavoro sul main thread: 0,8 s (valutazione script 365 ms).
- La catena critica è HTML → CSS → font Archivo latin (90 kB, finisce a 843 ms) in parallelo a HTML → JS (188 kB).

## 2. Risultati

### [ALTO] La pagina di installazione scarica tutta l'app (515 kB)
- **Evidenza:** `src/main.tsx` importa in modo statico `App` e `Legal`; solo `Install`/`Landing` sono `lazy`. Sul telefono nel browser (gate attivo) si vede solo Install, ma si scarica e si interpreta l'intero bundle. Lighthouse sul live: `unused-javascript` 112 KiB su 183 KiB (61 %).
- **Fix minimo:** in `main.tsx`, `const App = lazy(() => import('./App').then(m => ({ default: m.App })))` (stessa cosa per `Legal`), dentro il `<Suspense>` già presente. La pagina di installazione scende a circa react-dom + Install. L'app installata resta offline, perché il chunk è nel precache.

### [MEDIO] Chunk principale oltre 500 kB (avviso della build)
- **Evidenza** (source map, `index-0FGud_38.js`, 515 388 B):

  | Contenuto | Peso |
  |---|---|
  | react-dom (client prod) | 202 KiB |
  | motion-dom + framer-motion | 74 KiB (nonostante `LazyMotion`) |
  | lucide-react | 15 KiB |
  | @sentry/core | 13 KiB |
  | react + scheduler | 11 KiB |
  | idb | 3 KiB |
  | codice dell'app | ~150 KiB (App 13, ui 11, Dashboard 11, Services 11, Account 9, Maintenance 9, Legal 7, Garage 6, Welcome 6, KmSheet 6, AdminStats 5…) |

  Il motore di animazione finisce nel chunk principale perché `src/Mark.tsx` importa `animate`, `useMotionValue` e `useTransform` direttamente da `motion/react`: `LazyMotion` rimanda solo le feature di `m`.

  La build segnala anche `INEFFECTIVE_DYNAMIC_IMPORT`: `src/domain/intervals.ts` è importato con `import()` in App.tsx ma in modo statico da BikeForm/Maintenance, quindi l'import dinamico non serve a niente.
- **Fix minimo:**
  - Rendere `lazy` le schermate secondarie: `Account`, `Services`, `Legal`, `AdminStats`, `Documents`.
  - In `Mark.tsx`, sostituire `animate` con un'animazione CSS o WAAPI, oppure caricare `Mark` in modo lazy.
  - Togliere l'`await import('./domain/intervals')` in App.tsx e usare un import statico (è già nel bundle).
  - Alzare `chunkSizeWarningLimit` solo se si accetta il peso.

### [MEDIO] Test e2e instabile: `gesture.e2e.ts:168` "iPhone in Safari browser…"
- **Evidenza:**
  - Run completo: fallito una volta con `getByRole('region', { name: 'Prossima manutenzione' })` non trovato dopo `page.goBack()` (timeout 15 s).
  - Con `--repeat-each=3`: 1 fallito su 3.
  - Script isolato (`repro.cjs`, 6 ripetizioni senza parallelismo): 6/6 ok, con history.state `rkSeq` 1→1→0 corretto.
  - Il test è instabile sotto carico parallelo, non è un errore funzionale riprodotto.
- **Fix minimo:**
  - Prima di `goBack()`, attendere che lo swipe sia finito, per esempio con `await expect.poll(() => page.evaluate(() => history.state?.rkSeq)).toBe(1)`.
  - In alternativa, `test.describe.configure({ retries: 1 })` solo per questo describe.

### [MEDIO] Offline: la prima scelta di una marca mai aperta lancia un errore non gestito
- **Evidenza:** test Playwright offline (`offline.cjs`, su locale e live) dopo la prima visita. Scegliendo "Kawasaki" compare `PAGEERR Failed to fetch dynamically imported module …/assets/b-kawasaki-*.js`.
  - Causa: `src/BikeForm.tsx:102` chiama `void loadBrand(make).then(...)` senza `.catch`.
  - L'interfaccia degrada bene (campo modello libero "Usa «1400»"), ma l'errore non gestito arriva a Sentry come rumore. È voluto che i cataloghi `b-*.js` non siano nel precache.
- **Fix minimo:** `void loadBrand(make).catch(() => undefined).then(() => live && setReady(make))`.

### [MEDIO] Play Store/TWA: manca `/.well-known/assetlinks.json`
- **Evidenza:** `curl https://revkeeper.pages.dev/.well-known/assetlinks.json` risponde **200 `text/html`**, cioè il fallback SPA con index.html, non JSON.
  - Senza questo file un'eventuale TWA si apre con la barra dell'indirizzo di Chrome (Custom Tab).
  - In quel caso `display-mode` non è `standalone`, quindi `isInstalled()` (`src/domain/platform.ts:36`) è falso e l'utente Android vedrebbe la **pagina di installazione dentro l'app del Play Store**.
- **Fix minimo (solo quando si pubblica una TWA):**
  - Creare `public/.well-known/assetlinks.json` con il package id e lo SHA-256 della chiave di **firma dell'app** (Play Console → App integrity), non della chiave di upload.
  - Aggiungere in `_headers` la regola `/.well-known/assetlinks.json` con `Content-Type: application/json`.
  - Per sicurezza, considerare `document.referrer.startsWith('android-app://')` come "installata".
- **Altri requisiti della TWA:** il manifest soddisfa già i requisiti di Bubblewrap (name, icona 512, start_url, display standalone). Il resto si fa al momento del packaging: versionCode, target API 36, keystore da custodire.

### [BASSO] Manifest: campi mancanti o da migliorare
- **Evidenza** (`dist/manifest.webmanifest`): presenti name, short_name, description, lang, start_url `/`, scope `/`, display standalone, orientation portrait, theme e background `#F4F5F7`, icone 192, 512, maskable 512 e svg. Chrome non riporta errori (`Page.getInstallabilityErrors` segnala solo `in-incognito`, dovuto al test).
  - Manca `id`: Chrome usa start_url come identità, e cambiarla in futuro duplicherebbe l'installazione.
  - Mancano `screenshots`: Android mostra la finestra di installazione semplice invece di quella ricca.
  - Non c'è una maskable a 192: Chrome si arrangia con la 512.
  - `maskable-512.png` è **identico byte per byte** a `icon-512.png` (stesso md5). Va bene perché il disegno sta nella zona sicura dell'80 % (verificato a occhio), ma per l'icona `any` vuol dire fondo pieno quadrato.
- **Fix minimo:** aggiungere `id: '/'` e uno o due `screenshots` (form_factor `narrow`) nella sezione `manifest` di `vite.config.ts`.

### [BASSO] `theme-init.js` blocca il rendering
- **Evidenza:** Lighthouse locale `render-blocking-resources` stima 450 ms (202 ms sul live). È voluto: evita il lampo del tema sbagliato, e la CSP vieta gli script inline.
- **Fix minimo:** nessuno, oppure aggiungere `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/archivo-latin-…woff2">`, che però richiede un plugin per l'hash. In alternativa, accettare il costo.

### [BASSO] Script di terze parti
- **Evidenza:** `static.cloudflareinsights.com/beacon.min.js` ha cache di 1 giorno e 10 KiB di polyfill legacy (`legacy-javascript`, `uses-long-cache-ttl`). Non è controllabile.
- **Fix minimo:** nessuno, oppure disattivare Web Analytics se non serve.

### [BASSO] iOS
- **Evidenza:** presenti `apple-mobile-web-app-capable`, `-status-bar-style`, `-title` e `apple-touch-icon` 180×180 (esiste ed è nel precache). Manca `apple-touch-startup-image`, quindi all'avvio si vede una schermata bianca o del colore di sfondo. `theme-color` ha un solo valore: il tema scuro non si riflette sulla barra di stato.
- **Fix minimo:** facoltativo, aggiungere `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0E1116">`.

### [BASSO] Header di sicurezza (live)
- **Evidenza (curl):**
  - Presenti: CSP con `default-src 'self'`, `frame-ancestors 'none'`, `base-uri` e `form-action 'self'`, HSTS `max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera self, il resto off), COOP `same-origin-allow-popups`.
  - Lievi:
    - `object-src 'self' blob:`: meglio `'none'` se gli allegati PDF si aprono con `<iframe>` o `window.open`.
    - Nessun `report-uri`/`report-to` per la CSP.
    - `access-control-allow-origin: *` sull'HTML, default di Pages e innocuo per contenuti statici.
    - HSTS senza `preload`.
- **Fix minimo:** se nessun `<object>` usa blob:, mettere `object-src 'none'`. Facoltativo: aggiungere un endpoint di report per la CSP.

### OK (nessuna azione)
- **Service worker:**
  - Scope `/`, script `/sw.js`. `sw.js`, `push-sw.js` e il manifest sono serviti con `Cache-Control: public, max-age=0, must-revalidate`, corretto per gli aggiornamenti. `/assets/*` è immutable per un anno.
  - Precache: 21 voci reali, circa 900 KiB (index, CSS, Install, BikeForm, motionFeatures, workbox-window, font latin e latin-ext, icone, `index.html`, `theme-init.js`, `push-sw.js`). Le marche `b-*.js` sono in runtime `CacheFirst` (max 200).
  - `/landing/cruscotto.webp` non è nel precache (manca webp in `globPatterns`): solo la landing desktop ne risente offline.
- **Flusso di aggiornamento:**
  - `registerType: 'prompt'`: `onNeedRefresh` → `offerUpdate` → `UpdatePrompt` → `updateSW(true)`, che invia il messaggio `SKIP_WAITING` (presente in sw.js).
  - Controllo `reg.update()` ogni ora.
  - Alla prima visita la pagina non è controllata (niente `clientsClaim`): è coerente con il prompt e non serve.
- **Offline dopo la prima visita** (locale e live): il ricaricamento offline mostra l'app. Un deep link offline (`/qualcosa/profondo`) usa `navigateFallback` su index.html, e `/api/` è escluso.

## 3. Test e2e (`npx playwright test --trace off`)

**Primo tentativo, come richiesto: 44 falliti, 8 saltati, 0 passati.** Tutti per `Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1255/...`: il `@playwright/test` del repo (build 1255) è più recente dei browser preinstallati (build 1243). È un problema dell'ambiente, non del codice.

**Secondo tentativo con `PW_CHROME=/opt/pw-browsers/chromium` (opzione prevista da `playwright.config.ts`): 38 passati, 5 falliti, 9 saltati.**
- I 4 falliti `[iphone-webkit] install.e2e.ts` sono dovuti all'ambiente. `PW_CHROME` imposta `executablePath` anche per il progetto webkit, che quindi avvia Chromium da root senza `--no-sandbox`; WebKit inoltre non è installato.
- `[telefono] gesture.e2e.ts:168` è instabile (vedi §2): 1 fallimento su 3 ripetendolo, 0 su 6 in isolamento.
- Tutti i flussi principali passano su telefono e computer (`flussi`, `combobox`, gesture Android, guide di installazione iOS su Chromium).

Per un CI affidabile: allineare i browser alla versione di `@playwright/test` (`npx playwright install chromium webkit`), oppure fissare `@playwright/test` alla versione dei browser dell'immagine.

## 4. Bundle
Vedi §2 "Chunk principale oltre 500 kB". In sintesi, il JS iniziale trasferito è di circa 188 kB gzip più 6 kB di Install e 2,5 kB di workbox-window; il CSS è di 12 kB; il font di 90 kB. Le marche sono 140 chunk separati, il più grande `b-harley-davidson` da 110 kB, caricati su richiesta.
