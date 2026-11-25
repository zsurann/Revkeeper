// Legge uno ZIP store (quello prodotto da zip.ts) nei test.
export const unzip = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out = new Map<string, Uint8Array>()
  let o = 0
  while (o + 30 <= bytes.length && view.getUint32(o, true) === 0x04034b50) {
    const nameLen = view.getUint16(o + 26, true)
    const extra = view.getUint16(o + 28, true)
    const size = view.getUint32(o + 18, true)
    const name = new TextDecoder().decode(bytes.subarray(o + 30, o + 30 + nameLen))
    const start = o + 30 + nameLen + extra
    out.set(name, bytes.slice(start, start + size))
    o = start + size
  }
  return out
}
