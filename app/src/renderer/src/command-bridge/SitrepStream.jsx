import { useRef, useEffect } from 'react'
import { useJarvisStore } from '../store/jarvisStore.js'

function summarize(payload) {
  if (!payload) return ''
  if (payload.text) return payload.text
  if (payload.detail) return typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail)
  if (payload.tool) return payload.tool
  if (payload.status) return payload.status
  if (payload.result_summary) return payload.result_summary
  if (payload.error) return payload.error
  const s = JSON.stringify(payload)
  return s.length > 90 ? s.slice(0, 90) + '…' : s
}

export default function SitrepStream() {
  const { events, selectedMissionId, missions } = useJarvisStore()
  const bodyRef = useRef()
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [events.length])

  const shown = events.filter(e => !selectedMissionId || !e.mission_id || e.mission_id === selectedMissionId)
  const selected = missions[selectedMissionId]
  const briefing = selected?.result_summary

  return (
    <div className="cb-stream cb-panel">
      <div className="cb-col-head">{selected ? `Sitrep · ${selected.title || selected.id}` : 'Sitrep Stream'}</div>
      <div className="cb-stream-body" ref={bodyRef}>
        {briefing && (
          <div className="cb-brief">
            <span className="cb-brief-tag">BRIEFING</span>
            {briefing}
          </div>
        )}
        {shown.slice(-120).map(e => {
          const cls = e.type === 'sitrep' ? 'sitrep'
            : e.type === 'mission.failed' || e.type === 'alert' ? 'fail' : ''
          return (
            <div key={e._k} className={`cb-evt ${cls}`}>
              <span style={{ color: '#566' }}>{new Date(e.ts).toLocaleTimeString()} </span>
              <span className="cb-evt-agent">{e.agent_id ?? 'core'} </span>
              <span className="cb-evt-type">{e.type} </span>
              {summarize(e.payload)}
            </div>
          )
        })}
        {shown.length === 0 && <div className="cb-empty">Awaiting events…</div>}
      </div>
    </div>
  )
}
