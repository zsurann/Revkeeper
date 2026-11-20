import { expect, it } from 'vitest'
import { bikeFromForm } from './bikeForm'

const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

it('legge i campi, accetta la virgola e scarta i gruppi vuoti', () => {
  const b = bikeFromForm(fd({ make: 'Honda', model: ' Africa Twin ', year: '2022', startKm: '23298', plate: 'ab123cd', psFront: '2,5', oilGrade: '' }))
  expect(b).toMatchObject({ make: 'Honda', model: 'Africa Twin', year: 2022, startKm: 23298, plate: 'AB123CD' })
  expect(b.tyres).toEqual({ pressureSolo: { front: 2.5 } })
  expect(b.fluids).toBeUndefined()
  expect(b.specs).toBeUndefined()
})

it('conserva startDate in modifica e rifiuta valori mancanti o negativi', () => {
  expect(bikeFromForm(fd({ make: 'Vespa', model: 'GTS', year: '2021', startKm: '0' }), { startDate: '2021-05-01' }).startDate).toBe('2021-05-01')
  expect(() => bikeFromForm(fd({ make: 'Vespa', model: '', year: '2021', startKm: '0' }))).toThrow(RangeError)
  expect(() => bikeFromForm(fd({ make: 'Vespa', model: 'GTS', year: '2021', startKm: '-5' }))).toThrow(RangeError)
})
