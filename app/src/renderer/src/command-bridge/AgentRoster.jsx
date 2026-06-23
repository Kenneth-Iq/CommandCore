import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, PenLine, BarChart3, Wrench, Shield } from 'lucide-react'
import { useJarvisStore } from '../store/jarvisStore.js'

export const ROLE_META = {
  researcher: { color: '#4d9fff', Icon: Search,    label: 'Researcher' },
  analyst:    { color: '#ffd54f', Icon: BarChart3, label: 'Analyst' },
  operator:   { color: '#ff5252', Icon: Wrench,    label: 'Operator' },
  writer:     { color: '#b388ff', Icon: PenLine,   label: 'Writer' },
  sentinel:   { color: '#69f0ae', Icon: Shield,    label: 'Sentinel' },
}

const ACTIVE = new Set(['running', 'thinking', 'acting', 'waiting_approval'])
const IDLE_HINT = {
  researcher: 'standing by', analyst: 'standing by', operator: 'standing by',
  writer: 'standing by', sentinel: 'next: 07:00 brief',
}

// Neural network overlaid on each active card — nodes + connecting edges
const NODES = [
  { cx: 10, cy: 14 },
  { cx: 42, cy: 34 },
  { cx: 82, cy: 11 },
  { cx: 122, cy: 26 },
  { cx: 140, cy: 56 },
  { cx: 62, cy: 58 },
]
const EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,1],[2,5],[0,5]]

function NeuronSparks({ color }) {
  return (
    <svg className="ag-neurons" viewBox="0 0 150 70" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {EDGES.map(([a, b], i) => (
        <line key={i}
          x1={NODES[a].cx} y1={NODES[a].cy}
          x2={NODES[b].cx} y2={NODES[b].cy}
          stroke={color} strokeWidth="0.8"
          className={`ag-edge ag-edge-${i % 4}`} />
      ))}
      {NODES.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r="2.5"
          fill={color} className={`ag-node ag-node-${i % 5}`} />
      ))}
    </svg>
  )
}

export function useRoleStates() {
  const agents = useJarvisStore(s => s.agents)
  const selectedMissionId = useJarvisStore(s => s.selectedMissionId)
  return useMemo(() => {
    const out = {}
    for (const role of Object.keys(ROLE_META)) out[role] = { state: 'idle', activity: '' }
    const fleet = agents[selectedMissionId] || {}
    for (const card of Object.values(fleet)) {
      const r = out[card.role]
      if (!r) continue
      if (r.state === 'idle' || ACTIVE.has(card.state)) {
        r.state = card.state
        r.activity = card.lastTool || card.detail || card.state
      }
    }
    return out
  }, [agents, selectedMissionId])
}

export function AgentCard({ role, state, activity }) {
  const { color, Icon, label } = ROLE_META[role]
  const active = ACTIVE.has(state)
  const done  = state === 'done'
  const dim   = state === 'idle'

  // Flash burst when a new tool fires while agent is active
  const [burst, setBurst] = useState(false)
  const prevActivity = useRef(activity)
  useEffect(() => {
    if (active && activity && activity !== prevActivity.current) {
      setBurst(true)
      prevActivity.current = activity
      const t = setTimeout(() => setBurst(false), 500)
      return () => clearTimeout(t)
    } else {
      prevActivity.current = activity
    }
  }, [activity, active])

  const cls = ['ag-card', active && 'active', done && 'done', burst && 'burst']
    .filter(Boolean).join(' ')

  return (
    <div className={cls} style={{ '--ag': color }}>
      {active && <NeuronSparks color={color} />}
      {active && <div className="ag-scanline" />}
      {burst  && <div className="ag-burst" />}

      <div className="ag-content">
        <div className="ag-head">
          <span className="ag-icon" style={{ background: `${color}20` }}>
            <Icon size={14} color={color} />
            {active && <span className="ag-signal" />}
            {active && <span className="ag-signal ag-signal-2" />}
          </span>
          <span className="ag-name">{label}</span>
          <span className={`ag-dot ${active ? 'firing' : done ? 'done-dot' : ''}`}
                style={{ background: dim ? '#5a6472' : color }} />
        </div>
        <span className="ag-activity" style={{ color: dim ? '#5a6472' : '#c8d4e0' }}>
          {activity || IDLE_HINT[role] || 'idle'}
        </span>
      </div>
    </div>
  )
}
