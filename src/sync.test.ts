import { expect, test } from 'vitest'
import { keepLocal } from './sync'

test('keepLocal segue la regola del server', () => {
  expect(keepLocal(undefined, { updatedAt: 1, deviceId: 'a' }, 'b')).toBe(false)
  expect(keepLocal({ updatedAt: 2 }, { updatedAt: 1, deviceId: 'z' }, 'a')).toBe(true)
  expect(keepLocal({ updatedAt: 1, dirty: 1 }, { updatedAt: 2, deviceId: 'a' }, 'z')).toBe(false)
  // pari orario, copia già sincronizzata: il server ha già scelto, si prende la sua
  expect(keepLocal({ updatedAt: 5 }, { updatedAt: 5, deviceId: 'a' }, 'z')).toBe(false)
  // pari orario, modifica locale non inviata: vince il deviceId più grande
  expect(keepLocal({ updatedAt: 5, dirty: 1 }, { updatedAt: 5, deviceId: 'z' }, 'a')).toBe(false)
  expect(keepLocal({ updatedAt: 5, dirty: 1 }, { updatedAt: 5, deviceId: 'a' }, 'z')).toBe(true)
})
