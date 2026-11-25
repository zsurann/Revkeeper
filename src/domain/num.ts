// Numeri all'italiana, sempre con il punto delle migliaia. Intl in italiano non raggruppa le cifre sotto
// 10.000 ("8836" ma "12.345"): sullo stesso schermo i km sembravano scritti in due modi diversi.
// useGrouping 'always' (Intl.NumberFormat v3) c'è in tutti i browser moderni e in workerd; i tipi ES2022 non lo conoscono
const ALWAYS = { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions
const INT = new Intl.NumberFormat('it-IT', { ...ALWAYS, maximumFractionDigits: 0 })
const EUR = new Intl.NumberFormat('it-IT', { ...ALWAYS, style: 'currency', currency: 'EUR' })

export const int = (x: number) => INT.format(Math.round(x))
export const euro = (x: number) => EUR.format(x)
