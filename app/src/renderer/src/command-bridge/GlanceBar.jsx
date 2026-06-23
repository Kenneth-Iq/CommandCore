import { useEffect, useState } from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import HistoryGraph from './HistoryGraph.jsx'

const WEATHER_ICON = { sun: Sun, cloud: Cloud, 'cloud-rain': CloudRain, snowflake: CloudSnow, bolt: Zap, mist: Cloud }

function Trend({ pct }) {
  if (pct == null) return null
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="gb-trend" style={{ color: up ? '#69f0ae' : '#ff5252' }}>
      <Icon size={12} /> {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function syg4irPrice(s) {
  if (!s) return '—'
  // JSE quotes often come in cents (ZAc); show in rand
  return s.currency === 'ZAc' ? `R${(s.price / 100).toFixed(2)}` : `${s.price.toFixed(2)}`
}

export default function GlanceBar() {
  const [now, setNow] = useState(new Date())
  const [feeds, setFeeds] = useState(null)
  const [graph, setGraph] = useState(null) // metric key or null

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let live = true
    const load = () => window.jarvis.feedsGlance().then(f => { if (live) setFeeds(f) }).catch(() => {})
    load()
    const t = setInterval(load, 10 * 60_000)
    return () => { live = false; clearInterval(t) }
  }, [])

  const w = feeds?.weather
  const fx = feeds?.usdzar
  const etf = feeds?.syg4ir
  const WIcon = WEATHER_ICON[w?.icon] ?? Cloud

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="gb-bar">
      <div className="gb-clock">
        <span className="gb-time">{time}</span>
        <span className="gb-sub">{date}</span>
      </div>

      <button className="gb-widget" onClick={() => setGraph('weather')} title="Durban weather history" disabled={!w}>
        <WIcon size={18} color="#ffd54f" />
        <span className="gb-main">{w ? `${w.tempC}°` : '—'}</span>
        <span className="gb-sub">{w?.city ?? 'Durban'}</span>
      </button>

      <button className="gb-widget" onClick={() => setGraph('usdzar')} title="USD/ZAR history" disabled={!fx}>
        <span className="gb-main">USD/ZAR {fx ? fx.rate.toFixed(2) : '—'}</span>
        <Trend pct={fx?.changePct} />
      </button>

      <button className="gb-widget" onClick={() => setGraph('syg4ir')} title="SYG4IR history" disabled={!etf}>
        <span className="gb-main">SYG4IR {syg4irPrice(etf)}</span>
        <Trend pct={etf?.changePct} />
      </button>

      {graph && <HistoryGraph metric={graph} onClose={() => setGraph(null)} />}
    </div>
  )
}
