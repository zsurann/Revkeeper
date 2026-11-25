import type { Bike, BikeDocument } from './types'

const DOC_LABEL = { assicurazione: 'Assicurazione', bollo: 'Bollo', revisione: 'Revisione' } as const

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const ymd = (d: string) => d.replace(/-/g, '')
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
// Righe oltre 75 byte vanno spezzate (RFC 5545 §3.1)
const fold = (line: string) => {
  const out: string[] = []
  let rest = line
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--
    out.push(rest.slice(0, cut))
    rest = ` ${rest.slice(cut)}`
  }
  return [...out, rest].join('\r\n')
}

// Calendario con una giornata intera per ogni scadenza e due promemoria: 7 giorni prima e la mattina stessa
export const icsFor = (bike: Bike, docs: BikeDocument[], now = new Date()) => {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const name = `${bike.make} ${bike.model}`
  const events = docs
    .filter((d) => !d.deletedAt)
    .flatMap((d) => [
      'BEGIN:VEVENT',
      `UID:${d.id}@revkeeper.pages.dev`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(d.dueDate)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(d.dueDate))}`,
      `SUMMARY:${esc(`${DOC_LABEL[d.kind]} in scadenza · ${name}`)}`,
      `DESCRIPTION:${esc(`${DOC_LABEL[d.kind]} della ${name}${bike.plate ? ` (${bike.plate})` : ''}. Promemoria da Revkeeper.`)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`${DOC_LABEL[d.kind]} tra 7 giorni`)}`, 'TRIGGER:-P7D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`${DOC_LABEL[d.kind]} scade oggi`)}`, 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT',
    ])
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Revkeeper//Scadenze//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`Scadenze ${name}`)}`,
    ...events,
    'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}
