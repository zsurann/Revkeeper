import { expect, test, type Page } from '@playwright/test'

const openMakeList = async (page: Page) => {
  await page.goto('/?browser=1')
  await page.getByRole('button', { name: 'Più tardi' }).click()
  await page.getByRole('button', { name: 'Aggiungi moto' }).click()
  await page.locator('#make').click()
  const list = page.getByRole('listbox')
  await expect(list).toBeVisible()
  return list
}

test('lista marca: si scorre senza scegliere, un tocco fermo conferma', async ({ page, isMobile }) => {
  const list = await openMakeList(page)
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
