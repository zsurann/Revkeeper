import { expect, it } from 'vitest'
import { fileHeaders, LIMITS, pageOf } from './api'

// Simula il server: lotti di push con un rev ciascuno, pull a pagine come il client
it('il pull a pagine non salta record di un lotto a cavallo di pagina', () => {
  const rows: { rev: number; id: string }[] = []
  for (let rev = 1; rev <= 12; rev++) for (let i = 0; i < (rev === 1 ? 30 : LIMITS.pushBatch); i++) rows.push({ rev, id: `${rev}-${i}` })
  const got = new Set<string>()
  let since = 0
  for (let guard = 0; guard < 100; guard++) {
    const page = pageOf(rows.filter((r) => r.rev > since).slice(0, LIMITS.pullPage), LIMITS.pullPage, since)
    for (const r of page.rows) got.add(r.id)
    since = page.cursor
    if (!page.more) break
  }
  expect(got.size).toBe(rows.length)
})

it('i file si aprono nel browser solo se immagini raster o PDF, mai con sniffing', () => {
  expect(fileHeaders('image/jpeg')).toMatchObject({ 'content-disposition': 'inline', 'x-content-type-options': 'nosniff' })
  expect(fileHeaders('application/pdf')['content-disposition']).toBe('inline')
  expect(fileHeaders('text/html')['content-disposition']).toBe('attachment')
  expect(fileHeaders('image/svg+xml')['content-disposition']).toBe('attachment') // l'SVG può eseguire script
  expect(fileHeaders(undefined)['content-type']).toBe('application/octet-stream')
})
