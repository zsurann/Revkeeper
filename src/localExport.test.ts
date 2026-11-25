import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { save } from './db'
import { localBackup } from './localExport'

it('la copia locale include le moto e il file dell allegato', async () => {
  const bike = await save('bikes', { make: 'Vespa', model: 'GTS 300', year: 2021, startKm: 100, startDate: '2021-05-01' })
  await save('attachments', { name: 'libretto.pdf', type: 'application/pdf', blob: new Blob(['ciao'], { type: 'application/pdf' }) })
  const data = await localBackup()
  const bikes = data.bikes as { id: string; make: string }[]
  expect(bikes.map((b) => b.id)).toContain(bike.id)
  const files = data.attachments as { name: string; dataBase64?: string }[]
  expect(files[0]?.name).toBe('libretto.pdf')
  expect(files[0]?.dataBase64).toBe(btoa('ciao'))
})
