import { expect, test, type Page } from '@playwright/test'

// PNG 1×1: basta per provare allegati e compressione
const png = { name: 'scontrino.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }

const tab = async (page: Page, name: string) => {
  await page.locator('nav[aria-label=Sezioni]:visible').getByRole('button', { name, exact: true }).click()
  // fine della transizione di pagina (il cruscotto non ha un titolo di pagina)
  if (name !== 'Cruscotto') await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
}

const fillCombo = async (page: Page, id: string, text: string, isMobile: boolean) => {
  const el = page.locator(id)
  if (isMobile) {
    await el.tap()
    await el.tap()
  }
  await el.fill(text)
}

const addBike = async (page: Page, isMobile: boolean) => {
  await page.goto('/?browser=1')
  await page.getByRole('button', { name: 'Più tardi' }).click()
  // Passo notifiche del benvenuto: c'è solo dove il browser supporta le push (Safari/WebKit qui no, e l'app lo salta)
  const later = page.getByRole('button', { name: 'Non ora' })
  const add = page.getByRole('button', { name: 'Aggiungi moto' })
  await expect(later.or(add)).toBeVisible()
  if (await later.isVisible()) await later.click()
  await page.getByRole('button', { name: 'Aggiungi moto' }).click()
  await fillCombo(page, '#make', 'Honda', isMobile)
  await page.getByRole('option').first().click()
  await page.locator('#model').click()
  await page.getByRole('option').first().click()
  await page.locator('#year').click()
  await page.getByRole('option').first().click()
  await page.locator('#startKm').fill('12000')
  await page.getByRole('button', { name: 'Salva moto' }).click()
  await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible({ timeout: 15_000 }) // carica il catalogo e crea le voci
}

// Nessun errore JavaScript non gestito durante i flussi
const errors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (e) => errors.get(page)!.push(e.message))
})
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]))

test('ospite: moto, km, cancellazione di una lettura sbagliata', async ({ page, isMobile }) => {
  await addBike(page, isMobile)
  await page.getByRole('button', { name: 'Aggiorna km' }).first().click()
  await page.locator('#km').fill('120000') // una cifra in più
  await page.getByRole('button', { name: 'Salva km' }).click()
  await page.getByRole('button', { name: /Sì, salva/ }).click() // salto grande: chiede conferma
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

test('interventi: registra, modifica, cerca, spese', async ({ page, isMobile }) => {
  await addBike(page, isMobile)
  await tab(page, 'Interventi')
  await page.getByRole('button', { name: /Registra/ }).first().click()
  await page.locator('#svc-km').fill('12.500')
  await page.locator('label:has(input[name=itemIds])').first().click()
  await page.locator('#svc-parts').fill('120,50')
  await page.locator('#svc-labour').fill('80')
  await page.locator('#svc-notes').fill('Officina Rossi')
  await page.locator('#svc-files').setInputFiles(png)
  await page.getByRole('button', { name: 'Salva intervento' }).click()
  await expect(page.getByRole('heading', { name: 'Intervento registrato', exact: true })).toBeVisible()
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

test('documenti: scadenza, allegato tolto, calendario .ics', async ({ page, isMobile }) => {
  await addBike(page, isMobile)
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

test('voce di manutenzione: nota salvata', async ({ page, isMobile }) => {
  await addBike(page, isMobile)
  await tab(page, 'Manutenzione')
  await page.locator('li button[aria-expanded]').first().click()
  await page.locator('textarea[name=notes]').first().fill('Filtro HF204')
  await page.getByRole('button', { name: 'Salva', exact: true }).first().click()
  await expect(page.getByText('Filtro HF204')).toBeVisible()
})

test('correzione km in calo: avviso, conferma, ricalcolo automatico e limite intervento', async ({ page, isMobile }) => {
  await addBike(page, isMobile)
  const tapOrClick = async (loc: ReturnType<Page['locator']>) => (isMobile ? loc.tap() : loc.click())

  // Registra un intervento a 15.000 km sulla prima voce di manutenzione
  await tab(page, 'Interventi')
  await page.getByRole('button', { name: /Registra/ }).first().click()
  await page.locator('#svc-km').fill('15000')
  await page.locator('label:has(input[name=itemIds])').first().click()
  await page.getByRole('button', { name: 'Salva intervento' }).click()
  await expect(page.getByRole('heading', { name: 'Intervento registrato', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()

  // Aggiorna i km con un errore di battitura (16.000 invece di 15.500)
  await tab(page, 'Cruscotto')
  await tapOrClick(page.getByRole('button', { name: 'Aggiorna km' }).first())
  await page.locator('#km').fill('16000')
  await tapOrClick(page.getByRole('button', { name: 'Salva km' }))
  await expect(page.getByRole('heading', { name: '+1.000 km registrati' })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()

  // Leggi i km mancanti prima della correzione
  const dueBefore = await page.getByRole('region', { name: 'Prossima manutenzione' }).textContent()

  // Riapri Aggiorna km: prima prova sotto l'intervento (14.500) -> bloccato
  await tapOrClick(page.getByRole('button', { name: 'Aggiorna km' }).first())
  await page.locator('#km').fill('14500')
  await expect(page.getByText(/I km non possono scendere sotto 15\.000 km/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Salva km|Correggi lettura/ })).toBeDisabled()

  // Inserisci 15.500: avviso inline + conferma "Correggi lettura"
  await page.locator('#km').fill('15500')
  await expect(page.getByText(/Stai abbassando i km da 16\.000 km a 15\.500 km/)).toBeVisible()
  await expect(page.getByText(/La lettura da 16\.000 km verrà sostituita con 15\.500 km/)).toBeVisible()
  await tapOrClick(page.getByRole('button', { name: 'Correggi lettura' }))
  await expect(page.getByRole('heading', { name: 'Lettura corretta' })).toBeVisible()
  await expect(page.getByText('Le scadenze sono state ricalcolate su 15.500 km.')).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()

  // Verifica ricalcolo sul cruscotto e pulizia della cronologia
  await expect(page.getByRole('img', { name: '15.500 km' })).toBeVisible()
  const dueAfter = await page.getByRole('region', { name: 'Prossima manutenzione' }).textContent()
  expect(dueAfter).not.toBe(dueBefore)

  await tapOrClick(page.getByRole('button', { name: 'Aggiorna km' }).first())
  await page.getByText('Letture precedenti').click()
  await expect(page.getByRole('button', { name: /Cancella la lettura di 16\.000/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Cancella la lettura di 15\.500/ })).toBeVisible()
})

test('garage: elimina moto con doppia conferma, cambio moto attiva e stato vuoto', async ({ page, isMobile }) => {
  await addBike(page, isMobile)
  const tapOrClick = async (loc: ReturnType<Page['locator']>) => (isMobile ? loc.tap() : loc.click())

  // Aggiungi un intervento con nota e allegato sulla prima moto
  await tab(page, 'Interventi')
  await page.getByRole('button', { name: /Registra/ }).first().click()
  await page.locator('#svc-km').fill('12500')
  await page.locator('label:has(input[name=itemIds])').first().click()
  await page.locator('#svc-notes').fill('Controllo completo')
  await page.locator('#svc-files').setInputFiles(png)
  await page.getByRole('button', { name: 'Salva intervento' }).click()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).last().click()

  // Apri il garage e aggiungi una seconda moto (Yamaha)
  const openGarage = async () => {
    if (isMobile) await page.getByRole('button', { name: /apri il garage/ }).tap()
    else await page.locator('aside nav[aria-label=Sezioni]').getByRole('button', { name: 'Garage' }).click()
  }
  await tab(page, 'Cruscotto')
  await openGarage()
  await tapOrClick(page.getByRole('button', { name: 'Moto', exact: true }))
  await fillCombo(page, '#make', 'Yamaha', isMobile)
  await page.getByRole('option').first().click()
  await page.locator('#model').click()
  await page.getByRole('option').first().click()
  await page.locator('#year').click()
  await page.getByRole('option').first().click()
  await page.locator('#startKm').fill('5000')
  await page.getByRole('button', { name: 'Salva moto' }).click()
  await expect(page.getByRole('region', { name: 'Prossima manutenzione' })).toBeVisible({ timeout: 15_000 }) // carica il catalogo e crea le voci

  // Elimina la moto attiva (Yamaha): passa a Honda
  await openGarage()
  await expect(page.getByText('2 moto')).toBeVisible()
  await tapOrClick(page.getByRole('button', { name: /^Elimina Yamaha / }))
  await expect(page.getByText(/La moto attiva passerà a Honda /)).toBeVisible()
  await tapOrClick(page.getByRole('button', { name: 'Elimina moto e dati' }))
  await expect(page.getByText(/Ultima conferma:/)).toBeVisible()
  await tapOrClick(page.getByRole('button', { name: 'Elimina definitivamente' }))
  await expect(page.getByText('1 moto')).toBeVisible()
  await expect(page.getByText('In uso')).toBeVisible()

  // Elimina l'ultima moto (Honda): mostra il riepilogo completo e passa allo stato vuoto
  await tapOrClick(page.getByRole('button', { name: /^Elimina Honda / }))
  await expect(page.getByText('1 intervento registrato')).toBeVisible()
  await expect(page.getByText('1 nota salvata')).toBeVisible()
  await expect(page.getByText('1 foto o allegato')).toBeVisible()
  await expect(page.getByText(/il garage resterà vuoto/)).toBeVisible()
  await tapOrClick(page.getByRole('button', { name: 'Elimina moto e dati' }))
  await tapOrClick(page.getByRole('button', { name: 'Elimina definitivamente' }))
  await expect(page.getByRole('heading', { name: 'Nessuna moto nel garage' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aggiungi moto' })).toBeVisible()
})
