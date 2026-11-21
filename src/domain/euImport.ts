// Moto dai registri europei (Traficom FI, DGT ES, omologazioni ASTRA CH): normalizzazione dei nomi e raggruppamento per modello.
// Usato da scripts/import-eu.ts; regole da issues/research/301-open-data.md.
export type RegRow = { src: 'traficom' | 'dgt' | 'astra'; make: string; name: string; year: number; cc: number; kw: number; kg: number; tyreFront?: string; tyreRear?: string }
export type EuModel = {
  make: string; model: string; key: string; from: number; to: number; cc: number; kw: number; kg?: number
  tyreFront?: string; tyreRear?: string; n: number; sources: string[]
}

// CSV con ";" e campi tra virgolette che possono contenere a capo (formato ASTRA)
export const parseCsv = (text: string, sep = ';') => {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') cell += '"', i++
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) row.push(cell), (cell = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell), rows.push(row), (row = []), (cell = '')
    } else cell += c
  }
  if (cell || row.length) row.push(cell), rows.push(row)
  return rows
}

// Gomme dalle omologazioni: "v= 120/70ZR17 (40U); 3.50x17\nh= 160/60ZR17 (63U)" → 120/70 ZR17 e 160/60 ZR17.
// "v+h=" o nessun prefisso: stessa misura davanti e dietro. Le misure in pollici ("2 1/2-16") si saltano.
const TYRE = /(\d{2,3}\/\d{2,3})\s?(Z?R|-)\s?(\d{2})/i
const tyreAt = (s: string, at: RegExp) => {
  const i = s.search(at)
  const m = i < 0 ? null : TYRE.exec(s.slice(i))
  return m ? (m[2] === '-' ? `${m[1]}-${m[3]}` : `${m[1]} ${m[2]!.toUpperCase()}${m[3]}`) : undefined
}
export const parseTyres = (s: string) => {
  if (/v\+h=/i.test(s) || !/\b[vh]\s?=/i.test(s)) {
    const t = tyreAt(s, /./)
    return { front: t, rear: t }
  }
  return { front: tyreAt(s, /\bv\s?=/i), rear: tyreAt(s, /\bh\s?=/i) }
}
// Le omologazioni precedono le vendite: da luglio in poi valgono per l'anno modello successivo (Z650: 10/2016 → 2017)
export const modelYear = (isoDate: string) => Number(isoDate.slice(0, 4)) + (Number(isoDate.slice(5, 7)) >= 7 ? 1 : 0)
const mode = (xs: (string | undefined)[]) => {
  const count = new Map<string, number>()
  for (const x of xs) if (x) count.set(x, (count.get(x) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

const SUFFIX = /\s*(\(X\)|ABS|A2|\d+\s?KW|E5\+?|E4|SE|TFT|CBS|(?<=\d) I)$/i
// Lettere di allestimento Honda/Yamaha dopo il numero: SH125AD → SH125, WW125A → WW125
const TRIM_AFTER_DIGIT = /(\d)(AD|A|D|I|IE)$/i

export const normModel = (raw: string, make: string) => {
  let n = raw.toUpperCase().split(',').map((s) => s.trim()).filter(Boolean).sort((a, b) => a.length - b.length)[0] ?? ''
  n = n.replace(/\s+/g, ' ')
  // "MTN690-A (MT-07)": il nome commerciale è tra parentesi, il resto è il codice di omologazione
  const inner = /\(([^)]{3,})\)$/.exec(n)?.[1]
  if (inner && /[A-Z]/.test(inner)) n = inner.trim()
  if (n.startsWith(make.toUpperCase() + ' ')) n = n.slice(make.length + 1)
  // "SH 125 I" → "SH125 I": unisce sigla e numero, poi i suffissi vengono tolti sotto
  n = n.replace(/\b([A-Z]{1,4}) (\d{2,4})\b/g, '$1$2')
  for (let prev = ''; prev !== n; ) {
    prev = n
    n = n.replace(SUFFIX, '').trim().replace(TRIM_AFTER_DIGIT, '$1')
  }
  return n
}
export const modelKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// "VESPA GTS" → "Vespa GTS"; parole con cifre o sigle corte restano maiuscole
export const display = (s: string) =>
  s
    .split(' ')
    .map((w) => (/\d/.test(w) || w.length <= 3 ? w : w[0] + w.slice(1).toLowerCase()))
    .join(' ')

const median = (xs: number[]) => {
  const s = xs.filter((x) => x > 0).sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)]! : 0
}

// Potenza piena: la più alta tra i valori frequenti (≥10%), così le versioni A2 da 35 kW non la abbassano
const fullPower = (kws: number[]) => {
  const xs = kws.filter((x) => x > 0)
  const count = new Map<number, number>()
  for (const x of xs) count.set(x, (count.get(x) ?? 0) + 1)
  const common = [...count.entries()].filter(([, c]) => c >= xs.length * 0.1).map(([k]) => k)
  return common.length ? Math.max(...common) : median(xs)
}

export const groupModels = (rows: RegRow[], minVehicles = 5): EuModel[] => {
  const groups = new Map<string, RegRow[]>()
  for (const r of rows) {
    if (!r.name || !r.make || r.cc <= 0) continue
    const model = normModel(r.name, r.make)
    if (!model) continue
    // stesso nome con cilindrata molto diversa = modelli diversi (Z650 1977 ≠ 2017, Vespa GTS 125 ≠ 300)
    const k = `${r.make}|${modelKey(model)}|${Math.round(r.cc / 25)}`
    const g = groups.get(k) ?? []
    g.push({ ...r, name: model })
    groups.set(k, g)
  }
  // Un buco di più di 5 anni separa due modelli con lo stesso nome (Z650 1977–1983 e dal 2017)
  const split: RegRow[][] = []
  for (const g of groups.values()) {
    const sorted = [...g].sort((a, b) => a.year - b.year)
    let cur: RegRow[] = []
    for (const r of sorted) {
      if (cur.length && r.year - cur.at(-1)!.year > 5) split.push(cur), (cur = [])
      cur.push(r)
    }
    split.push(cur)
  }
  const out: EuModel[] = []
  for (const g of split) {
    // un'omologazione ASTRA è un dato ufficiale: basta da sola, anche se i veicoli immatricolati sono pochi
    if (g.length < minVehicles && !g.some((r) => r.src === 'astra')) continue
    const names = new Map<string, number>()
    for (const r of g) names.set(r.name, (names.get(r.name) ?? 0) + 1)
    const model = [...names.entries()].sort((a, b) => b[1] - a[1])[0]![0]
    // anni robusti per fonte (si scarta l'1% di code: immatricolazioni tardive o dati sbagliati), poi il più ampio:
    // così i 12 mesi di DGT, tanti ma solo recenti, non cancellano gli anni vecchi di Traficom e ASTRA
    let lo = Infinity, hi = -Infinity
    for (const src of new Set(g.map((r) => r.src))) {
      const years = g.filter((r) => r.src === src && r.year > 1950).map((r) => r.year).sort((a, b) => a - b)
      if (!years.length) continue
      lo = Math.min(lo, years[Math.floor(years.length * 0.01)]!)
      hi = Math.max(hi, years[Math.ceil(years.length * 0.99) - 1]!)
    }
    if (lo === Infinity) continue
    const kg = median(g.map((r) => r.kg))
    const tyreFront = mode(g.map((r) => r.tyreFront))
    const tyreRear = mode(g.map((r) => r.tyreRear))
    out.push({
      make: g[0]!.make,
      model: display(model),
      key: modelKey(model),
      from: lo,
      to: hi,
      cc: median(g.map((r) => r.cc)),
      kw: fullPower(g.map((r) => r.kw)),
      ...(kg && { kg }),
      ...(tyreFront && { tyreFront }),
      ...(tyreRear && { tyreRear }),
      n: g.length,
      sources: [...new Set(g.map((r) => r.src))].sort(),
    })
  }
  return out.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.from - b.from)
}
