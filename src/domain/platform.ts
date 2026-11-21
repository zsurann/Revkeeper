// Da quale telefono e browser arriva la pagina: decide cosa mostra la pagina di installazione.
// Regole e fonti: issues/research/401-installazione-pwa.md
export type Browser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'opera' | 'other'
export type Platform = { os: 'ios' | 'android' | 'desktop'; browser: Browser; inApp?: string; safariVersion?: number }

// Browser interni delle app: non possono aggiungere alla schermata Home
const IN_APP: [RegExp, string][] = [
  [/Instagram/, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/, 'Facebook'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/LinkedInApp/, 'LinkedIn'],
  [/\bLine\//, 'LINE'],
  [/Snapchat/, 'Snapchat'],
  [/Twitter/, 'X'],
  [/\bGSA\//, 'Google'],
  [/Telegram/i, 'Telegram'],
  [/WhatsApp/i, 'WhatsApp'],
  [/; wv\)/, "un'app"], // WebView Android generica (Gmail e altre)
]

export const detectPlatform = (ua: string): Platform => {
  const ios = /iPhone|iPod/.test(ua)
  const android = /Android/.test(ua) && /Mobile/.test(ua)
  // iPad si presenta come Mac e i tablet Android non hanno "Mobile": restano un sito normale
  if (!ios && !android) return { os: 'desktop', browser: 'other' }
  const inApp = IN_APP.find(([re]) => re.test(ua))?.[1]
  const browser: Browser = ios
    ? /CriOS/.test(ua) ? 'chrome' : /EdgiOS/.test(ua) ? 'edge' : /FxiOS/.test(ua) ? 'firefox' : /OPiOS|OPT\//.test(ua) ? 'opera' : 'safari'
    : /SamsungBrowser/.test(ua) ? 'samsung' : /EdgA/.test(ua) ? 'edge' : /Firefox/.test(ua) ? 'firefox' : /OPR\//.test(ua) ? 'opera' : /Chrome/.test(ua) ? 'chrome' : 'other'
  // Safari 26 ha il menu "···" in basso; le versioni prima il tasto Condividi nella barra
  const v = /Version\/(\d+)/.exec(ua)?.[1]
  return { os: ios ? 'ios' : 'android', browser, ...(inApp && { inApp }), ...(ios && browser === 'safari' && v && { safariVersion: Number(v) }) }
}

// Aperta dall'icona sulla schermata Home (Android e iOS 12.2+; navigator.standalone per i vecchi iOS)
export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || (navigator as { standalone?: boolean }).standalone === true

// Via d'uscita per test e sviluppo: ?browser=1 una volta e il blocco resta spento su quel browser
export const browserAllowed = () => {
  try {
    if (new URLSearchParams(location.search).get('browser') === '1') localStorage.setItem('revkeeper.browser', '1')
    return localStorage.getItem('revkeeper.browser') === '1'
  } catch {
    return false
  }
}
