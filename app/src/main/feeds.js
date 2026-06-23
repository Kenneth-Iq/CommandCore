// Ambient glance feeds for the Command Bridge: Durban weather, USD/ZAR, SYG4IR.
// All free, no-key sources. Every function degrades gracefully — a dead feed
// returns null rather than throwing, so the glance bar just hides that widget.
//
//   weather  → open-meteo (current + archive history)
//   usdzar   → frankfurter.app (ECB reference rates, current + history)
//   syg4ir   → Yahoo Finance chart endpoint (.JO = JSE), unofficial/best-effort

const DURBAN = { lat: -29.8587, lon: 31.0218, name: 'Durban' }

// open-meteo WMO weather codes → { label, icon } (icon = Tabler name)
const WMO = {
  0: ['Clear', 'sun'], 1: ['Mainly clear', 'sun'], 2: ['Partly cloudy', 'cloud'],
  3: ['Overcast', 'cloud'], 45: ['Fog', 'mist'], 48: ['Fog', 'mist'],
  51: ['Drizzle', 'cloud-rain'], 53: ['Drizzle', 'cloud-rain'], 55: ['Drizzle', 'cloud-rain'],
  61: ['Rain', 'cloud-rain'], 63: ['Rain', 'cloud-rain'], 65: ['Heavy rain', 'cloud-rain'],
  71: ['Snow', 'snowflake'], 73: ['Snow', 'snowflake'], 75: ['Snow', 'snowflake'],
  80: ['Showers', 'cloud-rain'], 81: ['Showers', 'cloud-rain'], 82: ['Showers', 'cloud-rain'],
  95: ['Thunderstorm', 'bolt'], 96: ['Thunderstorm', 'bolt'], 99: ['Thunderstorm', 'bolt'],
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Jarvis/1.0'

// ── tiny TTL cache so clicking around doesn't hammer the APIs ──────────────
const cache = new Map() // key -> { ts, ttl, data }
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < hit.ttl) return hit.data
  const data = await fn()
  if (data != null) cache.set(key, { ts: Date.now(), ttl: ttlMs, data })
  return data
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400_000)
  return d.toISOString().slice(0, 10)
}

const RANGE_DAYS = { '3m': 92, '1y': 366, '5y': 1827 }

// ── current snapshot for the glance bar ───────────────────────────────────

async function weatherNow() {
  return cached('weather:now', 10 * 60_000, async () => {
    try {
      const j = await getJSON(
        `https://api.open-meteo.com/v1/forecast?latitude=${DURBAN.lat}&longitude=${DURBAN.lon}` +
        `&current=temperature_2m,weather_code&timezone=auto`)
      const code = j?.current?.weather_code
      const [label, icon] = WMO[code] ?? ['—', 'cloud']
      return { city: DURBAN.name, tempC: Math.round(j?.current?.temperature_2m ?? 0), label, icon }
    } catch { return null }
  })
}

async function usdzarNow() {
  return cached('usdzar:now', 10 * 60_000, async () => {
    try {
      // 8-day window to get last close + a prior close for the day change
      const j = await getJSON(
        `https://api.frankfurter.app/${isoDaysAgo(8)}..?from=USD&to=ZAR`)
      const dates = Object.keys(j?.rates ?? {}).sort()
      if (!dates.length) return null
      const last = j.rates[dates[dates.length - 1]].ZAR
      const prev = dates.length > 1 ? j.rates[dates[dates.length - 2]].ZAR : last
      return { rate: last, changePct: prev ? ((last - prev) / prev) * 100 : 0 }
    } catch { return null }
  })
}

async function syg4irNow() {
  return cached('syg4ir:now', 10 * 60_000, async () => {
    try {
      const j = await getJSON(
        'https://query1.finance.yahoo.com/v8/finance/chart/SYG4IR.JO?range=5d&interval=1d')
      const meta = j?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) return null
      const price = meta.regularMarketPrice
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? price
      return {
        price, currency: meta.currency ?? 'ZAc',
        changePct: prev ? ((price - prev) / prev) * 100 : 0,
      }
    } catch { return null }
  })
}

export async function getGlance() {
  const [weather, usdzar, syg4ir] = await Promise.all([weatherNow(), usdzarNow(), syg4irNow()])
  return { weather, usdzar, syg4ir, ts: Date.now() }
}

// ── history series for the click-through graph ─────────────────────────────
// Returns { label, unit, points: [{ t: 'YYYY-MM-DD', v: number }] } or null.

async function weatherHistory(range) {
  const days = RANGE_DAYS[range] ?? 92
  // archive API lags ~5 days; end a week back to be safe
  const end = isoDaysAgo(6)
  const start = isoDaysAgo(days)
  const j = await getJSON(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${DURBAN.lat}&longitude=${DURBAN.lon}` +
    `&start_date=${start}&end_date=${end}&daily=temperature_2m_mean&timezone=auto`)
  const t = j?.daily?.time ?? []
  const v = j?.daily?.temperature_2m_mean ?? []
  const points = t.map((d, i) => ({ t: d, v: v[i] })).filter(p => p.v != null)
  return { label: `${DURBAN.name} temperature`, unit: '°C', points }
}

async function usdzarHistory(range) {
  const days = RANGE_DAYS[range] ?? 92
  const j = await getJSON(
    `https://api.frankfurter.app/${isoDaysAgo(days)}..?from=USD&to=ZAR`)
  const points = Object.entries(j?.rates ?? {})
    .map(([d, r]) => ({ t: d, v: r.ZAR }))
    .filter(p => p.v != null)
    .sort((a, b) => a.t.localeCompare(b.t))
  return { label: 'USD / ZAR', unit: 'R', points }
}

async function syg4irHistory(range) {
  const yr = { '3m': '3mo', '1y': '1y', '5y': '5y' }[range] ?? '3mo'
  const j = await getJSON(
    `https://query1.finance.yahoo.com/v8/finance/chart/SYG4IR.JO?range=${yr}&interval=1d`)
  const r = j?.chart?.result?.[0]
  const ts = r?.timestamp ?? []
  const close = r?.indicators?.quote?.[0]?.close ?? []
  const points = ts.map((s, i) => ({
    t: new Date(s * 1000).toISOString().slice(0, 10), v: close[i],
  })).filter(p => p.v != null)
  return { label: 'SYG4IR', unit: r?.meta?.currency ?? 'ZAc', points }
}

export async function getHistory(metric, range = '1y') {
  return cached(`hist:${metric}:${range}`, 6 * 60 * 60_000, async () => {
    try {
      if (metric === 'weather') return await weatherHistory(range)
      if (metric === 'usdzar') return await usdzarHistory(range)
      if (metric === 'syg4ir') return await syg4irHistory(range)
      return null
    } catch { return null }
  })
}
