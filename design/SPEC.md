# Revkeeper · design system "Hi-Vis"

Token in [tokens.css](tokens.css) (variabili `--rk-*` mappate in Tailwind v4 con `@theme inline`). Il tema scuro sovrascrive gli stessi token sotto la classe `.dark` su `<html>`.

## Principi

- **Chiaro di default.** Fondo bianco e grigio freddo, inchiostro quasi nero. Il tema scuro ("Notte") si sceglie da Account → Aspetto: Chiaro, Notte o Sistema. Il valore predefinito è Chiaro, non quello del sistema.
- **Il cruscotto resta nero in entrambi i temi.** Il "vetro" (`display`) ospita il numero grande, la RevBar e il contachilometri, come una strumentazione vera.
- **Lime ad alta visibilità** per l'azione principale e lo stato "a posto". Ambra vuol dire "in scadenza", rosso "scaduta". Lo stato è sempre anche testuale.
- Numeri `tabular-nums`. Testi in italiano, sentence case.

## Tema

- Preferenza salvata in `localStorage` con la chiave `revkeeper.theme`: `light`, `dark` o `system`. Valore assente o sconosciuto vale `light`. Non è sincronizzata tra dispositivi.
- `/theme-init.js` gira nel `<head>` prima del primo paint: aggiunge `.dark`, imposta `color-scheme` e `meta[name=theme-color]`. È un file esterno perché la CSP vieta gli script inline.
- `src/theme.ts` gestisce i cambi a runtime e, con "Sistema", ascolta `prefers-color-scheme`. "Cancella i dati locali" conserva la scelta.
- `theme-color`: `#F4F5F7` in chiaro, `#0B0D10` in scuro.

## Tipografia

Archivo Variable (asse `wdth`), self-hosted con `@fontsource-variable/archivo` e messo in cache dal service worker.

| Classe | Uso |
|---|---|
| `.t-display` | titoli di pagina, numero del cruscotto (larghezza espansa, 800) |
| `.t-title` | titoli di card e fogli |
| `.t-num` | cifre tabellari (km, euro, date) |
| `.t-label` | etichette maiuscole spaziate |

## Contrasto (WCAG AA)

Verificato con axe-core su tutte le schermate, in chiaro e in scuro, a 390×844.

| Coppia | Chiaro | Scuro |
|---|---|---|
| ink-3 su surface | 5,8:1 | 6,2:1 |
| ink-3 su sunken | 5,0:1 | 5,7:1 |
| lime-ink su surface | 6,7:1 | 15,5:1 |
| amber-ink su surface | 6,6:1 | 10,5:1 |
| red-ink su surface | 6,6:1 | 7,1:1 |
| testo su lime | 16,4:1 | 16,4:1 |
| display-dim su display | 7,4:1 | 7,9:1 |

Il pulsante distruttivo usa `#B4231A` con testo bianco (6,4:1) in entrambi i temi.

## Componenti

- **Cruscotto** (`Dashboard.tsx`): prossimo intervento, numero grande lime/ambra/rosso, `RevBar` a 28 segmenti (self-test all'apertura, lampeggia se scaduta), contachilometri a rulli (`Odometer`), pulsante "Aggiorna km".
- **Sheet** (`ui.tsx`): foglio dal basso a molla, si trascina dalla maniglia, Esc chiude, scroll del body bloccato; centrato su desktop.
- **Toast** (`toast.tsx`): `toast(titolo, { kind, body })`, massimo 3, in alto, chiusura automatica dopo 3,8 s o con swipe.
- **Segmented, StatusPill, MiniBar, Empty, Skeleton, PageHead** in `ui.tsx`.
- **Splash** (`Splash.tsx`): accensione del marchio una volta per sessione; saltata con riduzione del movimento.

## Motion

- `motion/react` dentro `MotionConfig reducedMotion="user"`; curve e durate in `src/motion.ts` e nei token `--ease-*`, `--duration-*`.
- `prefers-reduced-motion: reduce` porta le durate CSS a 0 e disattiva splash, sweep della RevBar e rulli.

## Icona, notifiche e manifest

- Icone generate da `scripts/icons.mjs` in `public/icons/`: `icon.svg`, `icon-maskable.svg`, PNG 192/512, `maskable-512.png`, `apple-touch-icon.png`.
- Badge delle notifiche: `badge.svg` e `badge-96.png` (monocromo bianco), usati da `public/push-sw.js`.
- Testo delle notifiche invariato (`server/reminders.ts`): titolo = scadenza ("L'assicurazione scade tra 7 giorni"), corpo = nome della moto.
- Manifest: `background_color` e `theme_color` `#F4F5F7`.
