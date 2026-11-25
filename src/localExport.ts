import { db, STORES, type StoreName } from './db'

const b64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// Copia dei dati che stanno solo su questo telefono (senza account, o prima di accedere).
export const localBackup = async () => {
  const d = await db()
  const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), app: 'revkeeper' }
  for (const store of STORES) {
    const rows = (await d.getAll(store)) as Array<Record<string, unknown> & { blob?: Blob }>
    if (store !== 'attachments') {
      data[store satisfies StoreName] = rows
      continue
    }
    data.attachments = await Promise.all(rows.map(async ({ blob, ...rest }) => {
      if (!blob) return rest
      return { ...rest, dataBase64: b64(new Uint8Array(await blob.arrayBuffer())) }
    }))
  }
  return data
}

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
