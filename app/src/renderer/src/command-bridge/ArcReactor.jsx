import { useMemo } from 'react'

// The living heart of Jarvis (jar1.png). Pure SVG/CSS — no WebGL. Ring sweep
// colour + speed and the waveform follow the voice state.
const STATES = {
  idle:       { color: '#4fc3f7', hot: '#bdeeff', label: 'Ready',       wave: false, spin: 1 },
  listening:  { color: '#4fc3f7', hot: '#dff6ff', label: 'Listening…',  wave: true,  spin: 1.6 },
  processing: { color: '#ffd54f', hot: '#fff1c2', label: 'Thinking…',   wave: 'slow', spin: 2.2 },
  speaking:   { color: '#69f0ae', hot: '#d7ffe9', label: 'Speaking…',   wave: true,  spin: 1.3 },
}

const WAVE_BARS = [10, 16, 22, 30, 38, 44, 46, 44, 38, 30, 22, 16, 10]

export default function ArcReactor({ voiceState = 'idle' }) {
  const s = STATES[voiceState] ?? STATES.idle
  const dur = useMemo(() => ({
    a: 8 / s.spin, b: 6 / s.spin, c: 14 / s.spin, d: 4.5 / s.spin, ring: 26 / s.spin,
  }), [s.spin])

  return (
    <div className="ar-wrap" style={{ '--ar': s.color, '--ar-hot': s.hot }}>
      <div className="ar-orb" style={{ filter: `drop-shadow(0 0 18px ${s.color}73)` }}>
        <div className="ar-bloom" style={{
          background: `radial-gradient(circle at 50% 50%, ${s.color}47, ${s.color}10 42%, transparent 68%)`,
        }} />
        <svg viewBox="0 0 300 300" className="ar-svg">
          <defs>
            <radialGradient id="ar-core" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor={s.hot} stopOpacity="0.9" />
              <stop offset="35%" stopColor={s.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0a2a3a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ar-sweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={s.color} stopOpacity="0" />
              <stop offset="45%" stopColor={s.color} stopOpacity="0.55" />
              <stop offset="78%" stopColor={s.hot} stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="ar-sweep2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={s.color} stopOpacity="0" />
              <stop offset="60%" stopColor={s.hot} stopOpacity="0.8" />
              <stop offset="100%" stopColor="#eafaff" stopOpacity="1" />
            </linearGradient>
            <filter id="ar-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ar-soft" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <circle cx="150" cy="150" r="120" fill="none" stroke={s.color} strokeWidth="10" opacity="0.05" filter="url(#ar-soft)" />
          <circle cx="150" cy="150" r="128" fill="none" stroke="rgba(140,220,255,0.16)" strokeWidth="1" />
          <circle className="ar-r" cx="150" cy="150" r="120" fill="none" stroke="rgba(150,225,255,0.42)" strokeWidth="2" strokeDasharray="1.5 7" style={{ animationDuration: `${dur.ring}s` }} />
          <circle cx="150" cy="150" r="112" fill="none" stroke={`${s.color}40`} strokeWidth="1" strokeDasharray="22 14" />

          <circle className="ar-r" cx="150" cy="150" r="98" fill="none" stroke="url(#ar-sweep)" strokeWidth="4" strokeDasharray="200 185" strokeLinecap="round" filter="url(#ar-glow)" style={{ animationDuration: `${dur.a}s` }} />
          <circle className="ar-r" cx="150" cy="150" r="98" fill="none" stroke="url(#ar-sweep2)" strokeWidth="2.5" strokeDasharray="90 525" strokeLinecap="round" filter="url(#ar-glow)" style={{ animationDuration: `${dur.a}s` }} />

          <circle className="ar-r-rev" cx="150" cy="150" r="80" fill="none" stroke="rgba(140,225,255,0.5)" strokeWidth="1" strokeDasharray="2 6" style={{ animationDuration: `${dur.c}s` }} />
          <circle className="ar-r-rev" cx="150" cy="150" r="72" fill="none" stroke="url(#ar-sweep2)" strokeWidth="3.5" strokeDasharray="150 300" strokeLinecap="round" filter="url(#ar-glow)" style={{ animationDuration: `${dur.b}s` }} />

          <circle className="ar-r" cx="150" cy="150" r="56" fill="none" stroke={`${s.color}8c`} strokeWidth="1.5" strokeDasharray="40 26" style={{ animationDuration: `${dur.c}s` }} />
          <circle cx="150" cy="150" r="50" fill="url(#ar-core)" />
          <circle cx="150" cy="150" r="50" fill="none" stroke="rgba(170,230,255,0.7)" strokeWidth="1" />
          <circle className="ar-r-rev" cx="150" cy="150" r="44" fill="none" stroke={s.hot} strokeWidth="2" strokeDasharray="14 150" strokeLinecap="round" filter="url(#ar-glow)" style={{ animationDuration: `${dur.d}s` }} />
        </svg>
        <div className="ar-label">
          <span style={{ textShadow: `0 0 12px ${s.color}, 0 0 4px rgba(255,255,255,0.6)` }}>J.A.R.V.I.S.</span>
        </div>
      </div>

      <div className={`ar-wave ${s.wave ? 'on' : ''} ${s.wave === 'slow' ? 'slow' : ''}`}>
        {WAVE_BARS.map((h, i) => (
          <span key={i} style={{ height: h, animationDelay: `${(i % 7) * 0.07}s` }} />
        ))}
      </div>
      <span className="ar-state" style={{ color: s.color }}>{s.label}</span>
    </div>
  )
}
