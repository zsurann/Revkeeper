import { expect, test, type Page } from '@playwright/test'

// PNG 1×1: basta per provare allegati e compressione
const png = { name: 'scontrino.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }

const tab = (page: Page, name: string) => page.locator('nav[aria-label=Sezioni]:visible').getByRole('button', { name, exact: true }).click()

const addBike = async (page: Page) => {
  await page.goto('/?browser=1')
  await page.getByRole('button', { name: 'Più tardi' }).click()
  await page.getByRole('button', { name: 'Aggiungi moto' }).click()
  await page.locator('#make').fill('Honda')
  await page.getByRole('option').first().click()
  await page.locator('#model').click()
  await page.getByRole('option').first().click()
  await page.locator('#year').click()
  await page.getByRole('option').first().click()
  await page.locator('#startKm').fill('12000')
  await page.getByRole('button', { name: 'Salva moto' }).click()
  await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible()
}

// Nessun errore JavaScript non gestito durante i flussi
const errors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (e) => errors.get(page)!.push(e.message))
})
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]))

test('ospite: moto, km, cancellazione di una lettura sbagliata', async ({ page }) => {
  await addBike(page)
  await page.getByRole('button', { name: 'Aggiorna km' }).first().click()
  await page.locator('#km').fill('120000') // una cifra in più
  await page.getByRole('button', { name: 'Salva km' }).click()
  await expect(page.getByRole('heading', { name: /km registrati/ })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()

  await page.getByRole('button', { name: 'Aggiorna km' }).first().click()
  await page.getByText('Letture precedenti').click()
  await page.getByRole('button', { name: /Cancella la lettura di 120\.000/ }).click()
  await page.getByRole('button', { name: 'Cancella', exact: true }).click()
  await expect(page.getByText('Lettura cancellata')).toBeVisible()
  await page.locator('#km').fill('12500')
  await page.getByRole('button', { name: 'Salva km' }).click()
  await expect(page.getByRole('heading', { name: '+500 km registrati' })).toBeVisible()
})

test('interventi: registra, modifica, cerca, spese', async ({ page }) => {
  await addBike(page)
  await tab(page, 'Interventi')
  await page.getByRole('button', { name: /Registra/ }).first().click()
  await page.locator('#svc-km').fill('12.500')
  await page.locator('label:has(input[name=itemIds])').first().click()
  await page.locator('#svc-parts').fill('120,50')
  await page.locator('#svc-labour').fill('80')
  await page.locator('#svc-notes').fill('Officina Rossi')
  await page.locator('#svc-files').setInputFiles(png)
  await page.getByRole('button', { name: 'Salva intervento' }).click()
  await expect(page.getByRole('heading', { name: 'Intervento registrato' })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()
  await expect(page.getByText('200,50 €').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('In tutto')).toBeVisible()

  // Modifica: cambia la nota e toglie l'allegato
  await page.getByRole('button', { name: /Modifica l'intervento/ }).click()
  await expect(page.locator('#svc-notes')).toHaveValue('Officina Rossi')
  await page.locator('#svc-notes').fill('Officina Bianchi, olio 10W-40')
  await page.getByRole('button', { name: /Togli l'allegato/ }).click()
  await page.getByRole('button', { name: 'Togli', exact: true }).click()
  await page.getByRole('button', { name: 'Salva modifiche' }).click()
  await expect(page.getByRole('heading', { name: 'Intervento aggiornato' })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()
  await expect(page.getByText('Officina Bianchi, olio 10W-40')).toBeVisible()
  await expect(page.getByRole('link', { name: /scontrino/ })).toHaveCount(0)

  // Ricerca senza accenti né maiuscole
  await page.locator('#svc-search').fill('BIANCHI')
  await expect(page.getByText('1 intervento')).toBeVisible()
  await page.locator('#svc-search').fill('carburatore')
  await expect(page.getByText('Nessun intervento trovato')).toBeVisible()
  await page.getByRole('button', { name: 'Mostra tutti' }).click()
  await expect(page.getByText('Officina Bianchi, olio 10W-40')).toBeVisible()
})

test('documenti: scadenza, allegato tolto, calendario .ics', async ({ page }) => {
  await addBike(page)
  await tab(page, 'Documenti')
  await page.locator('#doc-assicurazione').fill('2027-03-01')
  await page.locator('#doc-files-assicurazione').setInputFiles(png)
  await page.getByRole('button', { name: 'Salva' }).first().click()
  await expect(page.getByText('Scade il 1 mar 2027')).toBeVisible()
  await expect(page.getByRole('link', { name: /scontrino/ })).toBeVisible()

  await page.getByRole('button', { name: /Togli l'allegato/ }).click()
  await page.getByRole('button', { name: 'Togli', exact: true }).click()
  await expect(page.getByRole('link', { name: /scontrino/ })).toHaveCount(0)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Calendario' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^scadenze-honda-.*\.ics$/)
  const ics = await (await file.createReadStream()).toArray()
  expect(Buffer.concat(ics).toString()).toContain('DTSTART;VALUE=DATE:20270301')
})

test('voce di manutenzione: nota salvata', async ({ page }) => {
  await addBike(page)
  await tab(page, 'Manutenzione')
  await page.locator('li button[aria-expanded]').first().click()
  await page.locator('textarea[name=notes]').first().fill('Filtro HF204')
  await page.getByRole('button', { name: 'Salva', exact: true }).first().click()
  await expect(page.getByText('Filtro HF204')).toBeVisible()
})
