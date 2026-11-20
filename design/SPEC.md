# Revkeeper · design system "Strumentazione"

Fonte: variante A del [prototipo](../prototypes/direzione-visiva.html). Token in [tokens.css](tokens.css) (Tailwind v4 `@theme`).

## Principi

- Il cruscotto della moto: solo tema scuro, con retroilluminazione ambra come unico accento.
- L'ambra significa "azione o in scadenza", il rosso significa "scaduta". Nessun altro colore porta significato.
- Un solo momento animato forte (il contachilometri); il resto dell'interfaccia è quieto.
- Niente riflessi, lucine o texture finte: il bagliore si usa solo su cifre, arco e pulsante principale.
- Numeri sempre `tabular-nums`. Testi in italiano, sentence case.

## Tipografia

| Ruolo | Font | Uso |
|---|---|---|
| Cifre e titoli | Saira Condensed 700 | contachilometri, km nelle schede, nome della moto, pulsante principale |
| Testo | Saira 400/600 | tutto il resto |

Scala: 12 · 14 · 16 · 18 · 22 · 28 px. Google Fonts con `display=swap`; li mette in cache il service worker.

## Contrasto (WCAG AA)

| Coppia | Rapporto |
|---|---|
| dim su dash | 5,8:1 |
| dim su panel | 5,2:1 |
| amber su dash | 10,1:1 |
| amber-ink su amber | 10,6:1 |
| red su panel | 5,7:1 |

## Componenti

### Odometer (contachilometri a rulli)
- 6 rulli `well`, cifre ambra Saira Condensed 26 px con `text-shadow` ambra; sotto c'è l'etichetta "km totali".
- Props: `value` (km), `from?` (km da cui rullare).
- Motion: ogni rullo trasla a `translateY(-cifra × altezza)` in `--duration-roll` con `--ease-needle`. Si attiva al primo montaggio (dagli ultimi 120 km) e dopo ogni "Aggiorna km" (dal valore precedente). Stato a riposo: già sul valore finale.
- Accessibilità: `aria-label="23.418 km"`, rulli `aria-hidden`.

### ServiceArc (arco verso il tagliando)
- Arco SVG di 240°, binario `#2a3240`, riempimento ambra con `drop-shadow` glow. Diventa rosso oltre il 100%.
- Props: `progress` (0–1+), `label`.
- Motion: `stroke-dashoffset` in `--duration-roll`, in sincronia con l'Odometer.

### NextServiceCard
- Pannello `panel`, `radius-panel`. Titolo della voce in Saira Condensed, a destra "tra 582 km" in ambra se in scadenza, rosso se scaduta.
- ProgressBar sotto (8 px, binario `well`, riempimento con gradiente da ambra a rosso), poi la regola in `dim`: "a 24.000 km o entro dicembre 2026, quello che arriva prima".

### DueList
- Righe con separatore `rule`: nome a sinistra, scadenza a destra (`dim` se ok, ambra se in scadenza, rosso se scaduta).
- Lo stato è anche testuale per gli screen reader ("in scadenza", "scaduta").

### PrimaryAction (FAB)
- "+ Aggiorna km": ambra, testo `amber-ink`, `radius-pill`, `shadow-fab`, in basso a destra con gli inset di safe area.
- Alla pressione `scale(0.96)` in `--duration-ui`; apre il foglio "Aggiorna km".

### BikeSwitcher
- Chip in alto a destra ("2 moto"); apre l'elenco del garage.

### Sheet (foglio dal basso)
- Usato per aggiornare i km, registrare un intervento e aggiungere un documento. Entra dal basso in 240 ms, esce in 180 ms; la chiusura si può interrompere.

## Motion: regole

- Si animano solo `transform`, `opacity` e `stroke-dashoffset`.
- `prefers-reduced-motion: reduce` porta tutte le durate a 0: i valori finali compaiono subito.
- CSS per transizioni e fogli. GSAP non serve all'MVP: la regola ponytail vieta dipendenze per poche righe.

## Icona, manifest e splash

- Icona: [icon.svg](icon.svg) (arco ambra, ago rosso, fondo grafite; contenuto nel cerchio sicuro dell'80%, quindi va bene anche come maskable). PNG in [icons/](icons/): 192, 512, apple-touch-icon 180.
- Manifest (generato da `vite-plugin-pwa` nello scaffold):

```json
{
  "name": "Revkeeper",
  "short_name": "Revkeeper",
  "lang": "it",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#14181f",
  "theme_color": "#14181f",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- Splash: su Android la genera il browser da `background_color` più l'icona; su iOS si usano `apple-touch-icon` e `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`. Niente immagini splash per ogni dispositivo: troppi file per poco guadagno.
