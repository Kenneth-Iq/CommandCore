import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

const RANGES = [['3m', '3M'], ['1y', '1Y'], ['5y', '5Y']]
const TITLES = { weather: 'Durban weather', usdzar: 'USD / ZAR', syg4ir: 'SYG4IR · JSE' }

// Hand-rolled SVG line chart — no chart dependency. Width/height in viewBox units.
function LineChart({ series }) {
  const { points, unit } = series
  const path = useMemo(() => {
    if (!points?.length) return null
    const W = 560, H = 220, padL = 44, padR = 12, padT = 12, padB = 24
    const xs = points.map((_, i) => i)
    const ys = points.map(p => p.v)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const spanY = maxY - minY || 1
    const x = i => padL + (i / (xs.length - 1 || 1)) * (W - padL - padR)
    const y = v => padT + (1 - (v - minY) / spanY) * (H - padT - padB)
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
    const area = `${d} L${x(xs.length - 1).toFixed(1)} ${H - padB} L${padL} ${H - padB} Z`
    const ticks = [maxY, (maxY + minY) / 2, minY]
    return { d, area, W, H, padL, padB, y, ticks, first: points[0], last: points[points.length - 1] }
  }, [points])

  if (!path) return <div className="cb-empty">No data available for this feed.</div>
  const last = points[points.length - 1].v
  const first = points[0].v
  const up = last >= first

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} className="hg-chart">
      {path.ticks.map((t, i) => (
        <g key={i}>
          <line x1={path.padL} x2={path.W - 12} y1={path.y(t)} y2={path.y(t)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <text x={path.padL - 6} y={path.y(t) + 3} textAnchor="end" className="hg-axis">{fmt(t, unit)}</text>
        </g>
      ))}
      <path d={path.area} fill={up ? 'rgba(105,240,174,0.08)' : 'rgba(255,82,82,0.08)'} />
      <path d={path.d} fill="none" stroke={up ? '#69f0ae' : '#ff5252'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <text x={path.padL} y={path.H - 8} className="hg-axis">{points[0].t}</text>
      <text x={path.W - 12} y={path.H - 8} textAnchor="end" className="hg-axis">{points[points.length - 1].t}</text>
    </svg>
  )
}

function fmt(v, unit) {
  if (unit === '°C') return `${Math.round(v)}°`
  if (unit === 'R') return `R${v.toFixed(2)}`
  return v >= 100 ? v.toFixed(0) : v.toFixed(2)
}

export default function HistoryGraph({ metric, onClose }) {
  const [range, setRange] = useState('1y')
  const [series, setSeries] = useState(undefined) // undefined=loading, null=failed

  useEffect(() => {
    let live = true
    setSeries(undefined)
    window.jarvis.feedsHistory(metric, range)
      .then(s => { if (live) setSeries(s) })
      .catch(() => { if (live) setSeries(null) })
    return () => { live = false }
  }, [metric, range])

  const last = series?.points?.length ? series.points[series.points.length - 1].v : null

  return (
    <div className="hg-backdrop" onClick={onClose}>
      <motion.div className="hg-modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}>
        <div className="hg-head">
          <span className="hg-title">{TITLES[metric] ?? metric}</span>
          {last != null && <span className="hg-now">{fmt(last, series.unit)}</span>}
          <span className="cb-spacer" style={{ flex: 1 }} />
          <div className="hg-ranges">
            {RANGES.map(([k, lbl]) => (
              <button key={k} className={`hg-range ${range === k ? 'sel' : ''}`} onClick={() => setRange(k)}>{lbl}</button>
            ))}
          </div>
          <button className="hg-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="hg-body">
          {series === undefined && <div className="cb-empty">Loading…</div>}
          {series === null && <div className="cb-empty">This feed is unavailable right now.</div>}
          {series && <LineChart series={series} />}
        </div>
      </motion.div>
    </div>
  )
}
