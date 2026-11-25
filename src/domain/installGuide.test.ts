import { expect, it } from 'vitest'
import { detectPlatform } from './platform'
import { guideLayout, inferChromeSide, shareChromeSide, sheetLooksOpen, type SafeArea, type ViewportBox } from './installGuide'

const UA = {
  safari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  edgeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.0.0 Mobile/15E148 Safari/604.1',
  firefoxIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
}

const safe0: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 }
const safeNotch: SafeArea = { top: 47, right: 0, bottom: 34, left: 0 }
const full = (w: number, h: number): ViewportBox => ({ offsetTop: 0, offsetLeft: 0, width: w, height: h })

const fits = (card: { top: number | 'auto'; bottom: number | 'auto'; maxHeight: number }, visual: ViewportBox, layoutHeight: number) => {
  const top = card.top === 'auto' ? layoutHeight - (card.bottom as number) - card.maxHeight : card.top
  const bottom = top + card.maxHeight
  expect(top).toBeGreaterThanOrEqual(visual.offsetTop)
  expect(bottom).toBeLessThanOrEqual(visual.offsetTop + visual.height + 0.01)
}

it('Condividi/··· sta in basso su Safari, Edge e Firefox, in alto su Chrome iOS', () => {
  expect(shareChromeSide(detectPlatform(UA.safari26))).toBe('bottom')
  expect(shareChromeSide(detectPlatform(UA.edgeIos))).toBe('bottom')
  expect(shareChromeSide(detectPlatform(UA.firefoxIos))).toBe('bottom')
  expect(shareChromeSide(detectPlatform(UA.chromeIos))).toBe('top')
})

it('riconosce un foglio aperto quando il visualViewport si accorcia', () => {
  expect(sheetLooksOpen(800, 800)).toBe(false)
  expect(sheetLooksOpen(300, 800)).toBe(true)
  expect(sheetLooksOpen(600, 800)).toBe(false)
})

it('Safari: scheda in alto, freccia in basso, senza sovrapporsi', () => {
  const visual = full(390, 664)
  const layout = guideLayout({ chrome: 'bottom', visual, layoutHeight: 664, safe: safe0 })
  expect(layout.sheetOpen).toBe(false)
  expect(layout.card.park).toBe('top')
  expect(layout.card.top).toBe(10)
  expect(layout.arrow?.direction).toBe('down')
  expect(layout.arrow!.top).toBeGreaterThan((layout.card.top as number) + layout.card.maxHeight - 0.01)
  fits(layout.card, visual, 664)
})

it('Chrome iOS: scheda in basso, freccia in alto', () => {
  const visual = full(390, 664)
  const layout = guideLayout({ chrome: 'top', visual, layoutHeight: 664, safe: safe0 })
  expect(layout.card.park).toBe('bottom')
  expect(layout.card.top).toBe('auto')
  expect(layout.card.bottom).toBe(10)
  expect(layout.arrow?.direction).toBe('up')
  expect(layout.arrow!.top + 30).toBeLessThanOrEqual(664 - (layout.card.bottom as number) - layout.card.maxHeight + 0.01)
  fits(layout.card, visual, 664)
})

it('con il foglio Condividi aperto la scheda sta in alto, senza freccia, anche su Chrome', () => {
  const visual = full(390, 280)
  for (const chrome of ['top', 'bottom'] as const) {
    const layout = guideLayout({ chrome, visual, layoutHeight: 664, safe: safe0 })
    expect(layout.sheetOpen).toBe(true)
    expect(layout.card.park).toBe('top')
    expect(layout.arrow).toBeNull()
    expect(layout.card.maxHeight).toBeLessThanOrEqual(280)
    fits(layout.card, visual, 664)
  }
})

it('rispetta le safe area e lascia spazio alla freccia', () => {
  const visual = full(320, 568)
  const layout = guideLayout({ chrome: 'bottom', visual, layoutHeight: 568, safe: safeNotch })
  expect(layout.card.top).toBe(47)
  expect((layout.card.top as number) + layout.card.maxHeight).toBeLessThanOrEqual(568 - 34)
  expect(layout.arrow!.top + 30).toBeLessThanOrEqual(568)
  expect(layout.arrow!.top).toBeGreaterThanOrEqual((layout.card.top as number) + layout.card.maxHeight)
  fits(layout.card, visual, 568)
})

it('infierisce la chrome in alto se il visualViewport è sceso sotto la barra indirizzi', () => {
  const visual: ViewportBox = { offsetTop: 80, offsetLeft: 0, width: 390, height: 584 }
  expect(inferChromeSide('bottom', visual, 664)).toBe('top')
  const layout = guideLayout({ chrome: 'bottom', visual, layoutHeight: 664, safe: safe0 })
  expect(layout.card.park).toBe('bottom')
})

it('su schermo corto la scheda resta interamente nel viewport', () => {
  const visual = full(320, 500)
  const layout = guideLayout({ chrome: 'bottom', visual, layoutHeight: 500, safe: safeNotch })
  expect(layout.card.maxHeight).toBeGreaterThanOrEqual(120)
  fits(layout.card, visual, 500)
})
