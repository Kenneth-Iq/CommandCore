// Generates the Jarvis arc-reactor app icon (resources/icon.png, 256x256, RGBA)
// with no image dependencies — draws concentric cyan rings + a glowing core into
// a pixel buffer and hand-encodes a PNG (zlib + CRC32). Run: node scripts/gen-icon.mjs
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const S = 256
const cx = (S - 1) / 2, cy = (S - 1) / 2
const CYAN = [79, 195, 247]
const WHITE = [223, 246, 255]
const RINGS = [{ r: 112, w: 5 }, { r: 84, w: 12 }, { r: 56, w: 4 }]
const CORE = 36

const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v
const lerp = (a, b, t) => a + (b - a) * t

const buf = Buffer.alloc(S * S * 4)
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - cx, y - cy)
    let a = 0, col = CYAN
    for (const ring of RINGS) {
      const cov = clamp(ring.w / 2 + 0.5 - Math.abs(d - ring.r))
      if (cov > a) a = cov
    }
    const core = clamp(CORE + 0.5 - d)
    if (core > 0) {
      const t = clamp(1 - d / CORE) * 0.85
      col = [lerp(CYAN[0], WHITE[0], t), lerp(CYAN[1], WHITE[1], t), lerp(CYAN[2], WHITE[2], t)]
      if (core > a) a = core
    }
    // faint inner halo so the core reads as "glowing"
    if (d < CORE + 18) a = Math.max(a, clamp((CORE + 18 - d) / 40) * 0.18)
    const i = (y * S + x) * 4
    buf[i] = col[0] | 0; buf[i + 1] = col[1] | 0; buf[i + 2] = col[2] | 0
    buf[i + 3] = Math.round(clamp(a) * 255)
  }
}

// ── minimal PNG encoder ────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(b) {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const tb = Buffer.from(type, 'ascii')
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0)
  return Buffer.concat([len, tb, data, cb])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8; ihdr[9] = 6 // 8-bit, RGBA
// add filter byte (0) per scanline
const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'icon.png')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, png)
console.log(`Wrote ${out} (${png.length} bytes)`)
