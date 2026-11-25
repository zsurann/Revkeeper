import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import {
  addReading,
  bikeDeleteSummary,
  correctReading,
  db,
  KmBelowServiceError,
  KmDecreasingError,
  listBikes,
  listByBike,
  remove,
  removeBikeCascade,
  save,
} from './db'
import { currentKm } from './domain/due'

it('salva, elenca, rifiuta km in calo e cancella in modo logico', async () => {
  const bike = await save('bikes', { make: 'Vespa', model: 'GTS 300', year: 2021, startKm: 100, startDate: '2021-05-01' })
  expect(await listBikes()).toHaveLength(1)

  await addReading(bike, '2026-11-01', 5000)
  await expect(addReading(bike, '2026-11-02', 4999)).rejects.toBeInstanceOf(KmDecreasingError)
  const [r] = await listByBike('readings', bike.id)
  expect(r?.km).toBe(5000)

  await remove('bikes', bike.id)
  expect(await listBikes()).toHaveLength(0)
})

it('correctReading corregge un errore di battitura, rimuove le letture oltre il nuovo valore e rispetta il limite degli interventi', async () => {
  const bike = await save('bikes', { make: 'Kawasaki', model: 'Z650', year: 2017, startKm: 12000, startDate: '2025-01-01' })
  await addReading(bike, '2026-11-25', 15001)
  await addReading(bike, '2026-11-25', 16000)
  await save('services', { bikeId: bike.id, date: '2026-10-01', km: 14000, itemIds: [], attachmentIds: [] })

  // Non può scendere sotto il chilometraggio di un intervento registrato
  await expect(correctReading(bike, '2026-11-25', 13500)).rejects.toBeInstanceOf(KmBelowServiceError)
  expect(currentKm(bike, await listByBike('readings', bike.id))).toBe(16000)

  // Correzione valida: 16.000 viene rimossa, 15.001 resta, 15.500 diventa il dato attuale
  const res = await correctReading(bike, '2026-11-25', 15500)
  expect(res.removedCount).toBe(1)
  expect(res.startKmAdjusted).toBe(false)
  const readings = (await listByBike('readings', bike.id)).map((x) => x.km).sort((a, b) => a - b)
  expect(readings).toEqual([15001, 15500])
  expect(currentKm(bike, await listByBike('readings', bike.id))).toBe(15500)

  // Se non ci sono interventi più alti, abbassare sotto startKm aggiorna anche startKm
  const bike2 = await save('bikes', { make: 'Honda', model: 'CB500', year: 2022, startKm: 10000, startDate: '2026-01-01' })
  const res2 = await correctReading(bike2, '2026-11-25', 9500)
  expect(res2.startKmAdjusted).toBe(true)
  const updatedBike2 = (await listBikes()).find((b) => b.id === bike2.id)!
  expect(updatedBike2.startKm).toBe(9500)
  expect(currentKm(updatedBike2, await listByBike('readings', bike2.id))).toBe(9500)
})

it('removeBikeCascade riepiloga ed elimina tutti i record figli e gli allegati esclusivi', async () => {
  const sharedAtt = await save('attachments', { name: 'shared.png', type: 'image/png', size: 10, blob: new Blob(['a']) })
  const photoAtt = await save('attachments', { name: 'moto.jpg', type: 'image/jpeg', size: 20, blob: new Blob(['b']) })
  const svcAtt = await save('attachments', { name: 'fattura.pdf', type: 'application/pdf', size: 30, blob: new Blob(['c']) })
  const docAtt = await save('attachments', { name: 'polizza.pdf', type: 'application/pdf', size: 40, blob: new Blob(['d']) })

  const bikeA = await save('bikes', { make: 'Ducati', model: 'Monster', year: 2023, startKm: 1000, startDate: '2024-01-01', photoId: photoAtt.id })
  const bikeB = await save('bikes', { make: 'Yamaha', model: 'MT-07', year: 2023, startKm: 2000, startDate: '2024-01-01', photoId: sharedAtt.id })

  await save('readings', { bikeId: bikeA.id, date: '2026-06-01', km: 2500 })
  await save('items', { bikeId: bikeA.id, item: 'engine_oil', label: 'Olio', action: 'replace', km: 10000, months: 12, origin: 'preset', notes: '10W-40' })
  await save('services', { bikeId: bikeA.id, date: '2026-06-01', km: 2500, itemIds: [], notes: 'Tagliando', attachmentIds: [svcAtt.id, sharedAtt.id] })
  await save('documents', { bikeId: bikeA.id, kind: 'assicurazione', dueDate: '2027-01-01', attachmentIds: [docAtt.id] })

  const summary = await bikeDeleteSummary(bikeA.id)
  expect(summary).toEqual({ services: 1, readings: 1, items: 1, documents: 1, notes: 2, attachments: 3 })

  await removeBikeCascade(bikeA.id)
  expect((await listBikes()).some((b) => b.id === bikeA.id)).toBe(false)
  expect((await listBikes()).some((b) => b.id === bikeB.id)).toBe(true)
  expect(await listByBike('readings', bikeA.id)).toHaveLength(0)
  expect(await listByBike('items', bikeA.id)).toHaveLength(0)
  expect(await listByBike('services', bikeA.id)).toHaveLength(0)
  expect(await listByBike('documents', bikeA.id)).toHaveLength(0)

  const d = await db()
  for (const attId of [photoAtt.id, svcAtt.id, docAtt.id]) {
    const row = await d.get('attachments', attId)
    expect(row?.deletedAt).toBeTypeOf('number')
    expect(row?.blob).toBeUndefined()
  }
  const sharedRow = await d.get('attachments', sharedAtt.id)
  expect(sharedRow?.deletedAt).toBeUndefined()
  expect(sharedRow?.blob).toBeDefined()
})
