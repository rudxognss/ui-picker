// Indexed PNG encoder (color type 3): IHDR, PLTE, IDAT (filter 0, deflate level 9), IEND. Bun/node only; not part of the mod.
import { deflateSync } from 'node:zlib'

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const be32 = (v: number): Uint8Array => Uint8Array.of((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = new Uint8Array(4 + data.length)
  body.set([...type].map(ch => ch.charCodeAt(0)))
  body.set(data, 4)
  return Buffer.concat([be32(data.length), body, be32(crc32(body))])
}

type IndexedImage = { W: number; H: number; idx: Uint8Array; palette: readonly number[] }

/** Palette and indices with unused colors dropped; 4-bit PNGs need the used count, not the allocation count. */
function compact(img: IndexedImage): IndexedImage {
  const remap = new Int16Array(img.palette.length).fill(-1)
  const palette: number[] = []
  const idx = new Uint8Array(img.idx.length)
  for (let i = 0; i < img.idx.length; i++) {
    const old = img.idx[i]!
    if (remap[old] === -1) {
      remap[old] = palette.length
      palette.push(img.palette[old]!)
    }
    idx[i] = remap[old]!
  }
  return { W: img.W, H: img.H, idx, palette }
}

const bitDepthOf = (colors: number): 4 | 8 => (colors <= 16 ? 4 : 8)

export function encodeIndexedPng(input: IndexedImage): { png: Uint8Array; bitDepth: 4 | 8; colors: number } {
  const img = compact(input)
  const colors = img.palette.length
  if (colors > 256) throw new RangeError('png: ' + colors + ' colors, max 256')
  const bitDepth = bitDepthOf(colors)
  const rowBytes = bitDepth === 4 ? Math.ceil(img.W / 2) : img.W
  const raw = new Uint8Array(img.H * (1 + rowBytes))
  for (let y = 0; y < img.H; y++) {
    const o = y * (1 + rowBytes) + 1 // filter byte 0 precedes each row
    for (let x = 0; x < img.W; x++) {
      const v = img.idx[y * img.W + x]!
      if (bitDepth === 8) raw[o + x] = v
      else raw[o + (x >> 1)]! |= x & 1 ? v : v << 4
    }
  }
  const ihdr = new Uint8Array(13)
  ihdr.set(be32(img.W), 0)
  ihdr.set(be32(img.H), 4)
  ihdr.set([bitDepth, 3, 0, 0, 0], 8) // depth, color type 3 (indexed), compression, filter, interlace
  const plte = new Uint8Array(colors * 3)
  img.palette.forEach((c, i) => plte.set([(c >> 16) & 255, (c >> 8) & 255, c & 255], i * 3))
  const idat = deflateSync(raw, { level: 9 })
  const png = Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))])
  return { png, bitDepth, colors }
}
