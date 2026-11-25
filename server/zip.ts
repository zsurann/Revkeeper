// ZIP senza compressione (method store): un file alla volta, senza tenere tutto in memoria.
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const u16 = (n: number) => {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}
const u32 = (n: number) => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0, true)
  return b
}
const cat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export type ZipEntry = { name: string; data: Uint8Array }

const dos = (d: Date) => ({
  time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1),
  date: ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
})

export const zipStoreStream = (entries: AsyncIterable<ZipEntry>, now = new Date()) => {
  const { time, date } = dos(now)
  const enc = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const central: Uint8Array[] = []
      let offset = 0
      let count = 0
      for await (const entry of entries) {
        const name = enc.encode(entry.name)
        const size = entry.data.length
        const crc = crc32(entry.data)
        const local = cat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(time), u16(date), u32(crc), u32(size), u32(size), u16(name.length), u16(0), name])
        controller.enqueue(local)
        controller.enqueue(entry.data)
        central.push(cat([
          u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(time), u16(date), u32(crc), u32(size), u32(size),
          u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
        ]))
        offset += local.length + size
        count++
      }
      const cd = cat(central)
      controller.enqueue(cd)
      controller.enqueue(cat([u32(0x06054b50), u16(0), u16(0), u16(count), u16(count), u32(cd.length), u32(offset), u16(0)]))
      controller.close()
    },
  })
}
