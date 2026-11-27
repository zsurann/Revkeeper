import { devices, expect, test, type Page } from '@playwright/test'

const { defaultBrowserType: _d1, ...iphone } = devices['iPhone 13']

const touchSwipe = async (page: Page, x1: number, y1: number, x2: number, y2: number, steps = 10) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1, id: 1 }] })
  for (let i = 1; i <= steps; i++) {
    const x = x1 + ((x2 - x1) * i) / steps
    const y = y1 + ((y2 - y1) * i) / steps
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

const fillCombo = async (page: Page, id: string, text: string) => {
  const el = page.locator(id)
  await el.tap()
  await el.tap()
  await el.fill(text)
}

const setupBike = async (page: Page, url = '/?browser=1') => {
  await page.goto(url)
  await page.getByRole('button', { name: 'Più tardi' }).click()
  await page.getByRole('button', { name: 'Non ora' }).click() // passo notifiche del benvenuto
  await page.getByRole('button', { name: 'Aggiungi moto' }).click()
  await fillCombo(page, '#make', 'Kawasaki')
  await page.getByRole('option', { name: 'Kawasaki', exact: true }).click()
  await fillCombo(page, '#model', '1400 GTR')
  await page.getByRole('option', { name: /^1400 GTR\b/ }).first().click()
  await fillCombo(page, '#year', '2015')
  await page.getByRole('option', { name: '2015', exact: true }).click()
  // Verifica citazione USTRA nel form moto
  await expect(page.getByText(/Ufficio federale delle strade \(USTRA\)/)).toBeVisible()
  await page.locator('#startKm').fill('12000')
  await page.getByRole('button', { name: 'Salva moto' }).click()
  await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()
}

test.describe('gesture Android (Pixel 7)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'telefono', 'Test mobile su emulazione telefono')
  })

  test('Indietro di sistema chiude prima combobox/sheet, poi naviga tra schermate e non esce da sottoschermate', async ({ page }) => {
    await setupBike(page)

    // 1. Apri sheet Km -> Indietro di sistema chiude lo sheet, resta su Cruscotto
    await page.getByRole('button', { name: 'Aggiorna km' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Aggiorna km' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('dialog', { name: 'Aggiorna km' })).toBeHidden()
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()

    // 2. Naviga tab Interventi -> Indietro torna al Cruscotto
    await page.locator('nav[aria-label=Sezioni]:visible').getByRole('button', { name: 'Interventi', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Interventi' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()

    // 3. Garage -> Modifica moto -> apri Combobox -> Indietro chiude Combobox, poi Modifica, poi Garage
    await page.getByRole('button', { name: /apri il garage/i }).click()
    await expect(page.getByRole('heading', { name: 'Garage' })).toBeVisible()
    await page.getByRole('button', { name: /Modifica Kawasaki 1400 GTR/ }).click()
    await expect(page.getByRole('heading', { name: 'Scheda moto' })).toBeVisible()

    await page.locator('#tyreFront').click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Scheda moto' })).toBeVisible()

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Garage' })).toBeVisible()

    await page.goBack()
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()
  })

  test('Sheet si chiude trascinando giù dal contenuto (quando è in cima) e non rompe lo scorrimento interno', async ({ page }) => {
    await setupBike(page)
    await page.locator('nav[aria-label=Sezioni]:visible').getByRole('button', { name: 'Interventi', exact: true }).click()
    await page.getByRole('button', { name: /Registra/ }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Nuovo intervento' })
    await expect(dialog).toBeVisible()
    await page.waitForTimeout(400)

    // Corpo dello sheet: deve scorrere verso il basso (dito verso l'alto) senza chiudersi
    const body = dialog.locator('.overflow-y-auto')
    const box = await body.boundingBox()
    expect(box).toBeTruthy()
    const cx = box!.x + box!.width / 2
    const cy = box!.y + box!.height / 2

    const canScroll = await body.evaluate((el) => el.scrollHeight > el.clientHeight + 20)
    if (canScroll) {
      await touchSwipe(page, cx, cy + 80, cx, cy - 120)
      await expect(dialog).toBeVisible()
      const scrolled = await body.evaluate((el) => el.scrollTop)
      expect(scrolled).toBeGreaterThan(0)

      // Finché scrollTop > 0, trascinare giù riporta in cima senza chiudere lo sheet
      await touchSwipe(page, cx, cy - 40, cx, cy + 160)
      await expect(dialog).toBeVisible()
      await body.evaluate((el) => { el.scrollTop = 0 })
    }

    // Da scrollTop === 0, trascinare giù dal corpo chiude lo sheet
    await touchSwipe(page, cx, cy - 40, cx, cy + 200)
    await expect(dialog).toBeHidden()
  })

  test('Account mostra Ufficio federale delle strade e tema Notte continua a funzionare', async ({ page }) => {
    await setupBike(page)
    await page.getByRole('button', { name: 'Account e impostazioni' }).click()
    await expect(page.getByText(/Ufficio federale delle strade \(USTRA\/ASTRA\)/)).toBeVisible()
    // Tema chiaro di default
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false)
    // Tema Notte selezionabile
    await page.getByRole('radio', { name: 'Notte' }).click()
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
    // Ripristina Chiaro
    await page.getByRole('radio', { name: 'Chiaro' }).click()
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false)
  })
})

test.describe('gesture iPhone (PWA standalone e Safari)', () => {
  test.use(iphone)

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'telefono', 'Test mobile su emulazione telefono')
  })

  test('PWA standalone su iPhone: swipe dal bordo sinistro torna indietro e rispetta reduced-motion', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    })
    await setupBike(page, '/')
    await page.getByRole('button', { name: 'Account e impostazioni' }).click()
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()

    // Swipe dal bordo sinistro (x: 10 -> 210)
    await touchSwipe(page, 10, 320, 210, 325)
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()

    // Swipe giù su Sheet su iPhone
    await page.getByRole('button', { name: 'Aggiorna km' }).first().click()
    const kmDlg = page.getByRole('dialog', { name: 'Aggiorna km' })
    await expect(kmDlg).toBeVisible()
    await page.waitForTimeout(400)
    const box = await kmDlg.locator('.overflow-y-auto').boundingBox()
    await touchSwipe(page, box!.x + box!.width / 2, box!.y + 40, box!.x + box!.width / 2, box!.y + 240)
    await expect(kmDlg).toBeHidden()

    // Anche con reduced-motion attivo lo swipe dal bordo sinistro torna indietro
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: /apri il garage/i }).click()
    await expect(page.getByRole('heading', { name: 'Garage' })).toBeVisible()
    await touchSwipe(page, 10, 320, 200, 325)
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()
  })

  test('iPhone in Safari browser: edge-swipe JS non interferisce con Safari, overscroll-behavior-y e touch-action presenti', async ({ page }) => {
    await setupBike(page, '/?browser=1')
    const styles = await page.evaluate(() => ({
      overscrollY: getComputedStyle(document.body).overscrollBehaviorY,
      btnTouch: getComputedStyle(document.querySelector('button')!).touchAction,
    }))
    expect(styles.overscrollY).toBe('contain')
    expect(styles.btnTouch).toBe('manipulation')

    await page.getByRole('button', { name: 'Account e impostazioni' }).click()
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()

    // In browser Safari (!standalone), il gesto JS non deve scavalcare lo swipe nativo del browser
    await touchSwipe(page, 10, 320, 210, 325)
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()

    // Ma popstate (gestito dal browser) chiude correttamente la schermata
    await page.goBack()
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()
  })
})
