import { expect, it } from 'vitest'
import { rankOptions } from './Combobox'

it('ordina per pertinenza: uguale, inizia con, contiene', () => {
  const opts = [{ label: 'FSH125' }, { label: 'SH125i' }, { label: 'SH125' }, { label: 'PCX 125' }, { label: 'CB500F', aliases: ['CB 500 F'] }]
  expect(rankOptions(opts, 'sh125').map((o) => o.label)).toEqual(['SH125', 'SH125i', 'FSH125'])
  expect(rankOptions(opts, 'cb500').map((o) => o.label)).toEqual(['CB500F'])
  expect(rankOptions(opts, 'xyz')).toEqual([])
})
