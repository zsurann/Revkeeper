import { expect, test, type Page } from '@playwright/test'

// Guida iOS (Safari / Chrome iOS) sulla prima apertura nel browser, non installata.
// I progetti Playwright passano già lo user-agent del telefono; senza ?browser=1.

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (e) => errors.get(page)!.push(e.message))
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch { /* ignore */ }
  })
})
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]))

const guide = (page: Page) => page.getByTestId('install-guide')
const steps = (page: Page) => page.getByTestId('install-guide-step')

const visualBox = (page: Page) =>
  page.evaluate(() => {
    const v = window.visualViewport
    const top = v?.offsetTop ?? 0
    const left = v?.offsetLeft ?? 0
    return { top, left, bottom: top + (v?.height ?? innerHeight), right: left + (v?.width ?? innerWidth), height: v?.height ?? innerHeight, width: v?.width ?? innerWidth, innerHeight }
  })

const simulateShareSheet = async (page: Page, ratio = 0.42) => {
  await page.evaluate((ratio) => {
    const orig = window.visualViewport
    const height = Math.round((orig?.height ?? window.innerHeight) * ratio)
    const width = orig?.width ?? window.innerWidth
    const fake = {
      get height() { return height },
      get width() { return width },
      get offsetTop() { return 0 },
      get offsetLeft() { return 0 },
      get scale() { return 1 },
      get pageTop() { return 0 },
      get pageLeft() { return 0 },
      addEventListener(type: string, fn: EventListenerOrEventListenerObject, opt?: boolean | AddEventListenerOptions) {
        window.addEventListener(type, fn, opt)
      },
      removeEventListener(type: string, fn: EventListenerOrEventListenerObject, opt?: boolean | EventListenerOptions) {
        window.removeEventListener(type, fn, opt)
      },
      dispatchEvent(e: Event) { return window.dispatchEvent(e) },
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake })
    window.dispatchEvent(new Event('resize'))
  }, ratio)
}

test('prima apertura: tutti i passaggi sono nella scheda, visibili o scorrevoli, senza sovrapporsi alla freccia', async ({ page }) => {
  await page.goto('/')
  await expect(guide(page)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aggiungila alla schermata Home' })).toBeVisible()
  const n = await steps(page).count()
  expect(n).toBeGreaterThanOrEqual(3)
  const vv = await visualBox(page)
  const card = await guide(page).boundingBox()
  expect(card).toBeTruthy()
  expect(card!.y).toBeGreaterThanOrEqual(vv.top - 1)
  expect(card!.y + card!.height).toBeLessThanOrEqual(vv.bottom + 1)
  expect(card!.x).toBeGreaterThanOrEqual(vv.left - 1)
  expect(card!.x + card!.width).toBeLessThanOrEqual(vv.right + 1)
  for (let i = 0; i < n; i++) {
    await steps(page).nth(i).scrollIntoViewIfNeeded()
    await expect(steps(page).nth(i)).toBeVisible()
    const box = await steps(page).nth(i).boundingBox()
    expect(box).toBeTruthy()
    expect(box!.y + 8).toBeGreaterThanOrEqual(card!.y)
    expect(box!.y + box!.height - 8).toBeLessThanOrEqual(card!.y + card!.height + 1)
  }
  const arrow = page.getByTestId('install-guide-arrow')
  if (await arrow.count()) {
    const a = await arrow.boundingBox()
    expect(a).toBeTruthy()
    const overlap = !(a!.y + a!.height <= card!.y + 1 || a!.y >= card!.y + card!.height - 1 || a!.x + a!.width <= card!.x + 1 || a!.x >= card!.x + card!.width - 1)
    expect(overlap, 'la freccia non deve coprire la scheda delle istruzioni').toBe(false)
  }
  await expect(guide(page)).toHaveCount(1)
})

test('con il foglio Condividi aperto la guida resta interamente nella parte visibile', async ({ page }) => {
  await page.goto('/')
  await expect(guide(page)).toBeVisible()
  await simulateShareSheet(page, 0.42)
  await expect(guide(page)).toBeVisible()
  await expect(guide(page)).toHaveCount(1)
  await expect(page.getByTestId('install-guide-arrow')).toHaveCount(0)
  const vv = await visualBox(page)
  expect(vv.height).toBeLessThan(vv.innerHeight * 0.72)
  const card = await guide(page).boundingBox()
  expect(card).toBeTruthy()
  expect(card!.y).toBeGreaterThanOrEqual(vv.top - 1)
  expect(card!.y + card!.height).toBeLessThanOrEqual(vv.bottom + 1)
  const n = await steps(page).count()
  for (let i = 0; i < n; i++) {
    await steps(page).nth(i).scrollIntoViewIfNeeded()
    await expect(steps(page).nth(i)).toBeVisible()
  }
})

test('si può nascondere e rimostrare una sola scheda, senza copie sovrapposte', async ({ page }) => {
  await page.goto('/')
  await expect(guide(page)).toHaveCount(1)
  await page.getByTestId('install-guide-dismiss').click()
  await expect(guide(page)).toHaveCount(0)
  await expect(page.getByTestId('install-guide-show')).toBeVisible()
  await expect(page.getByTestId('install-guide-show')).toHaveCount(1)
  await page.getByTestId('install-guide-show').click()
  await expect(guide(page)).toHaveCount(1)
  await expect(page.getByTestId('install-guide-show')).toHaveCount(0)
})

test('Chrome iOS: il primo passo indica Condividi in alto; Safari: in basso', async ({ page }) => {
  await page.goto('/')
  const ua = await page.evaluate(() => navigator.userAgent)
  if (/CriOS/.test(ua)) {
    await expect(steps(page).first()).toContainText(/Condividi/)
    await expect(steps(page).first()).toContainText(/in alto a destra/)
    const card = await guide(page).boundingBox()
    const vv = await visualBox(page)
    // scheda parcheggiata in basso: il bordo inferiore è vicino al fondo del viewport
    expect(card!.y + card!.height).toBeGreaterThan(vv.top + vv.height * 0.7)
  } else {
    await expect(steps(page).first()).toContainText(/in basso/)
    if (/Version\/26/.test(ua)) await expect(steps(page)).toContainText(['··· in basso a destra', 'Condividi', 'Visualizza altro', 'Aggiungi alla schermata Home'])
    const card = await guide(page).boundingBox()
    const vv = await visualBox(page)
    expect(card!.y).toBeLessThan(vv.top + vv.height * 0.3)
  }
})
