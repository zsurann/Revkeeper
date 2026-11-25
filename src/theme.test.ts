import { describe, expect, it } from 'vitest'
import { parseTheme, resolveTheme } from './theme'

describe('tema', () => {
  it('parte chiaro se non c\'è una scelta o è sconosciuta', () => {
    expect(parseTheme(null)).toBe('light')
    expect(parseTheme(undefined)).toBe('light')
    expect(parseTheme('blu')).toBe('light')
  })
  it('ricorda Notte e Sistema', () => {
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('system')).toBe('system')
  })
  it('Sistema segue il telefono, le altre scelte no', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
