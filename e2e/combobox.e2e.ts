import { devices, expect, test, type Page } from '@playwright/test'

const { defaultBrowserType: _d1, ...iphone } = devices['iPhone 13']

const openMakeList = async (page: Page, isMobile: boolean) => {
  await page.goto('/?browser=1')
  await page.getByRole('button', { name: 'Più tardi' }).click()
  await page.getByRole('button', { name: 'Aggiungi moto' }).click()
  if (isMobile) await page.locator('#make').tap()
  else await page.locator('#make').click()
  const list = page.getByRole('listbox')
  await expect(list).toBeVisible()
  return list
}

test('lista marca: si scorre senza scegliere, un tocco fermo conferma', async ({ page, isMobile }) => {
  const list = await openMakeList(page, isMobile)
  const size = await list.evaluate((el) => ({ height: el.scrollHeight, view: el.clientHeight }))
  expect(size.height).toBeGreaterThan(size.view)

  // Un trascinamento sulla voce non deve selezionarla (prima il pointerdown sceglieva subito)
  const option = list.getByRole('option').nth(4)
  const box = await option.boundingBox()
  expect(box).toBeTruthy()
  await option.dispatchEvent('pointerdown', { pointerType: isMobile ? 'touch' : 'mouse', clientX: box!.x + 20, clientY: box!.y + 10, pointerId: 1, bubbles: true, cancelable: true, buttons: 1 })
  await list.dispatchEvent('pointermove', { pointerType: isMobile ? 'touch' : 'mouse', clientX: box!.x + 20, clientY: box!.y - 140, pointerId: 1, bubbles: true, cancelable: true, buttons: 1 })
  await list.dispatchEvent('pointerup', { pointerType: isMobile ? 'touch' : 'mouse', clientX: box!.x + 20, clientY: box!.y - 140, pointerId: 1, bubbles: true, cancelable: true })
  await expect(page.locator('#make'), 'trascinare non deve compilare la marca').toHaveValue('')
  await expect(list).toBeVisible()

  const top = await list.evaluate((el) => el.scrollTop)
  const lb = await list.boundingBox()
  await page.mouse.move(lb!.x + lb!.width / 2, lb!.y + lb!.height / 2)
  await page.mouse.wheel(0, 400)
  await expect.poll(async () => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(top + 80)
  await expect(page.locator('#make')).toHaveValue('')

  const picked = await list.evaluate((el) => {
    const box = el.getBoundingClientRect()
    const li = [...el.querySelectorAll('[role=option]')].find((n) => {
      const r = n.getBoundingClientRect()
      return r.top >= box.top + 4 && r.bottom <= box.bottom - 4
    })
    if (!li) return { text: '', x: 0, y: 0 }
    const r = li.getBoundingClientRect()
    return { text: (li.textContent ?? '').trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  expect(picked.text).toBeTruthy()
  if (isMobile) await page.touchscreen.tap(picked.x, picked.y)
  else await page.mouse.click(picked.x, picked.y)
  await expect(page.locator('#make')).toHaveValue(picked.text)
  await expect(list).toBeHidden()
})

test('desktop: clic o Tab permette subito di scrivere e navigare da tastiera', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Solo desktop')
  const list = await openMakeList(page, false)
  const state = await page.locator('#make').evaluate((el: HTMLInputElement) => ({ readOnly: el.readOnly, inputMode: el.inputMode }))
  expect(state.readOnly).toBe(false)
  await page.locator('#make').fill('Yam')
  await expect(list.getByRole('option', { name: 'Yamaha', exact: true })).toBeVisible()
  await page.locator('#make').press('ArrowDown')
  await page.locator('#make').press('Enter')
  await expect(page.locator('#make')).toHaveValue('Yamaha')
  await expect(list).toBeHidden()
})

test.describe('combobox touch: primo tocco lista alta senza tastiera, secondo tocco tastiera', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'telefono', 'Test touch su profilo telefono')
  })

  test('Android (Pixel 7): primo tocco apre tutta la lista senza tastiera, secondo tocco apre tastiera e filtra', async ({ page }) => {
    const list = await openMakeList(page, true)
    const make = page.locator('#make')

    // Primo tocco: readOnly=true e inputMode="none" -> nessuna tastiera, aria-expanded="true", lista alta e completa (> 80 marche)
    await expect(make).toHaveAttribute('aria-expanded', 'true')
    const afterFirstTap = await make.evaluate((el: HTMLInputElement) => ({ readOnly: el.readOnly, inputMode: el.inputMode }))
    expect(afterFirstTap).toEqual({ readOnly: true, inputMode: 'none' })

    const listMetrics = await list.evaluate((el) => ({
      clientH: el.clientHeight,
      scrollH: el.scrollHeight,
      optionCount: el.querySelectorAll('[role="option"]').length,
    }))
    expect(listMetrics.clientH).toBeGreaterThanOrEqual(280)
    expect(listMetrics.optionCount).toBeGreaterThan(100)

    // Secondo tocco sul campo: sblocca la scrittura e dà focus per aprire la tastiera
    await make.tap()
    await expect(list).toBeVisible()
    const afterSecondTap = await make.evaluate((el: HTMLInputElement) => ({
      readOnly: el.readOnly,
      inputMode: el.inputMode,
      focused: document.activeElement === el,
    }))
    expect(afterSecondTap).toEqual({ readOnly: false, inputMode: '', focused: true })

    // Digita per filtrare e scegli Kawasaki
    await make.fill('Kaw')
    await expect(list.getByRole('option', { name: 'Kawasaki', exact: true })).toBeVisible()
    await list.getByRole('option', { name: 'Kawasaki', exact: true }).tap()
    await expect(make).toHaveValue('Kawasaki')
    await expect(make).toHaveAttribute('aria-expanded', 'false')

    // Campo dipendente Modello: primo tocco apre lista senza tastiera, secondo tocco apre tastiera
    const model = page.locator('#model')
    await expect(model).toBeEnabled()
    await model.tap()
    await expect(page.getByRole('listbox')).toBeVisible()
    expect(await model.evaluate((el: HTMLInputElement) => ({ readOnly: el.readOnly, inputMode: el.inputMode }))).toEqual({ readOnly: true, inputMode: 'none' })
    await model.tap()
    expect(await model.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(false)
    await model.fill('Z650')
    await page.getByRole('option', { name: /^Z650\b/ }).first().tap()

    // Anno 2020 -> prefill Kawasaki Z650 con 68 CV e link scheda ufficiale
    await page.locator('#year').tap()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.locator('#year').tap()
    await page.locator('#year').fill('2020')
    await page.getByRole('option', { name: '2020', exact: true }).tap()
    await expect(page.locator('#hp')).toHaveValue('68')
    await expect(page.getByRole('link', { name: 'scheda ufficiale' })).toHaveAttribute('href', /kawasaki\.com/)

    // Campo già compilato (#tyreFront): primo tocco apre TUTTE le misure (non filtrate a 1) senza tastiera, Indietro Android chiude
    const tyre = page.locator('#tyreFront')
    await expect(tyre).toHaveValue('120/70 ZR17')
    await tyre.tap()
    const tyreList = page.getByRole('listbox')
    await expect(tyreList).toBeVisible()
    expect(await tyre.evaluate((el: HTMLInputElement) => ({ readOnly: el.readOnly, inputMode: el.inputMode }))).toEqual({ readOnly: true, inputMode: 'none' })
    expect(await tyreList.getByRole('option').count()).toBeGreaterThan(20)
    await page.goBack()
    await expect(tyreList).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Aggiungi moto' })).toBeVisible()
  })

  test('fonti in Account e Manutenzione hanno link cliccabili e citazioni corrette', async ({ page }) => {
    await page.goto('/?browser=1')
    await page.getByRole('button', { name: 'Più tardi' }).click()
    await page.getByRole('button', { name: 'Aggiungi moto' }).click()
    await page.locator('#make').tap()
    await page.locator('#make').tap()
    await page.locator('#make').fill('Yamaha')
    await page.getByRole('option', { name: 'Yamaha', exact: true }).tap()
    await page.locator('#model').tap()
    await page.locator('#model').tap()
    await page.locator('#model').fill('MT-07')
    await page.getByRole('option', { name: /^MT-07\b/ }).first().tap()
    await page.locator('#year').tap()
    await page.locator('#year').tap()
    await page.locator('#year').fill('2022')
    await page.getByRole('option', { name: '2022', exact: true }).tap()
    await expect(page.locator('#cc')).toHaveValue('689')
    await page.locator('#startKm').fill('10000')
    await page.getByRole('button', { name: 'Salva moto' }).click()
    await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()

    // Tab Manutenzione mostra la fonte del libretto ufficiale (intervals.json)
    await page.locator('nav[aria-label=Sezioni]:visible').getByRole('button', { name: 'Manutenzione', exact: true }).click()
    await expect(page.getByText(/Fonte intervalli:/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Yamaha MTN690/ })).toHaveAttribute('href', /yamaha-motor\.eu/)

    // Account mostra i link delle fonti aperte e licenza CC BY 4.0
    await page.getByRole('button', { name: 'Account e impostazioni' }).click()
    await expect(page.getByRole('link', { name: 'NHTSA vPIC' })).toHaveAttribute('href', /vpic\.nhtsa\.dot\.gov/)
    await expect(page.getByRole('link', { name: 'Traficom' })).toHaveAttribute('href', /avoindata\.suomi\.fi/)
    await expect(page.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', /creativecommons\.org\/licenses\/by\/4\.0/)
    await expect(page.getByRole('link', { name: 'DGT' })).toHaveAttribute('href', /dgt\.es/)
    await expect(page.getByRole('link', { name: /Ufficio federale delle strade/ })).toHaveAttribute('href', /astra\.admin\.ch/)
  })
})

test.describe('combobox touch su iPhone (iPhone 13)', () => {
  test.use(iphone)

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'telefono', 'Test touch su profilo telefono')
  })

  test('iPhone: primo tocco lista senza tastiera, secondo tocco tastiera e lista visibile anche con viewport ridotto', async ({ page }) => {
    const list = await openMakeList(page, true)
    const make = page.locator('#make')
    expect(await make.evaluate((el: HTMLInputElement) => ({ readOnly: el.readOnly, inputMode: el.inputMode }))).toEqual({ readOnly: true, inputMode: 'none' })
    await make.tap()
    expect(await make.evaluate((el: HTMLInputElement) => ({ readOnly: el.readOnly, inputMode: el.inputMode }))).toEqual({ readOnly: false, inputMode: '' })

    // Simula riduzione del viewport (tastiera aperta) e verifica che la lista resti dentro lo schermo visibile
    await page.setViewportSize({ width: 390, height: 420 })
    await page.waitForTimeout(100)
    const box = await list.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(420)
  })
})
