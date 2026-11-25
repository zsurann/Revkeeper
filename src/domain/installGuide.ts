import type { Platform } from './platform'

// Posizione della guida iOS: resta nel visualViewport, dal lato opposto al tasto Condividi/···.
// Quando si apre il foglio di condivisione il viewport si accorcia dal basso: la scheda va in alto e resta leggibile.

export type ChromeSide = 'top' | 'bottom'

export type ViewportBox = { offsetTop: number; offsetLeft: number; height: number; width: number }
export type SafeArea = { top: number; right: number; bottom: number; left: number }

export type GuideArrow = { top: number; left: number; direction: 'up' | 'down' }
export type GuideCard = {
  top: number | 'auto'
  bottom: number | 'auto'
  left: number
  width: number
  maxHeight: number
  park: ChromeSide
}
export type GuideLayout = { card: GuideCard; arrow: GuideArrow | null; sheetOpen: boolean }

const PAD = 10
const ARROW_SIZE = 30
const ARROW_GUTTER = 36
const SIDE = 12
const MIN_CARD = 120
/** Sotto questa frazione di altezza del layout il visualViewport è quasi certamente coperto dal foglio di sistema. */
export const SHEET_HEIGHT_RATIO = 0.72

export const shareChromeSide = (p: Pick<Platform, 'browser'>): ChromeSide =>
  p.browser === 'chrome' ? 'top' : 'bottom'

export const sheetLooksOpen = (visualHeight: number, layoutHeight: number) =>
  layoutHeight > 0 && visualHeight < layoutHeight * SHEET_HEIGHT_RATIO

export const inferChromeSide = (fallback: ChromeSide, visual: ViewportBox, layoutHeight: number): ChromeSide => {
  if (sheetLooksOpen(visual.height, layoutHeight)) return fallback
  const topChrome = visual.offsetTop
  const bottomChrome = Math.max(0, layoutHeight - visual.offsetTop - visual.height)
  if (topChrome > 40 && topChrome >= bottomChrome) return 'top'
  if (bottomChrome > 40 && bottomChrome > topChrome) return 'bottom'
  return fallback
}

export const guideLayout = (opts: {
  chrome: ChromeSide
  visual: ViewportBox
  layoutHeight: number
  safe: SafeArea
}): GuideLayout => {
  const { visual, layoutHeight, safe } = opts
  const sheetOpen = sheetLooksOpen(visual.height, layoutHeight)
  const chrome = inferChromeSide(opts.chrome, visual, layoutHeight)
  const park: ChromeSide = sheetOpen ? 'top' : chrome === 'bottom' ? 'top' : 'bottom'

  const visTop = visual.offsetTop
  const visLeft = visual.offsetLeft
  const visBottom = visual.offsetTop + visual.height
  const atLayoutTop = visTop <= 1
  const atLayoutBottom = visBottom >= layoutHeight - 1
  const insetTop = Math.max(PAD, atLayoutTop ? safe.top : PAD)
  const insetBottom = Math.max(PAD, atLayoutBottom ? safe.bottom : PAD)
  const leftPad = Math.max(SIDE, safe.left)
  const rightPad = Math.max(SIDE, safe.right)
  const width = Math.max(0, visual.width - leftPad - rightPad)
  const left = visLeft + leftPad

  const showArrow = !sheetOpen
  const reserveBottom = showArrow && chrome === 'bottom' ? ARROW_GUTTER : 0
  const reserveTop = showArrow && chrome === 'top' ? ARROW_GUTTER : 0

  const maxHeight = Math.max(MIN_CARD, visual.height - insetTop - insetBottom - reserveTop - reserveBottom)
  const top = park === 'top' ? visTop + insetTop + reserveTop : 'auto'
  const bottom = park === 'bottom' ? layoutHeight - visBottom + insetBottom + reserveBottom : 'auto'

  const arrowRight = 8 + Math.max(16, safe.right)
  const arrowLeft = visLeft + visual.width - arrowRight - ARROW_SIZE
  const arrow: GuideArrow | null = !showArrow
    ? null
    : chrome === 'bottom'
      ? { top: visBottom - Math.max(6, atLayoutBottom ? safe.bottom : 6) - ARROW_SIZE, left: arrowLeft, direction: 'down' }
      : { top: visTop + Math.max(6, atLayoutTop ? safe.top : 6), left: arrowLeft, direction: 'up' }

  return { card: { top, bottom, left, width, maxHeight, park }, arrow, sheetOpen }
}
