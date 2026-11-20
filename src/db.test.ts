import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { addReading, KmDecreasingError, listBikes, listByBike, remove, save } from './db'

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
