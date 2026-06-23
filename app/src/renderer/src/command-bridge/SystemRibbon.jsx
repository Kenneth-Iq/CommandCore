import { useJarvisStore } from '../store/jarvisStore.js'
import { Activity, Cpu, Mic, ShieldAlert } from 'lucide-react'

const VOICE_LABEL = { idle: 'idle', listening: 'listening', processing: 'thinking', speaking: 'speaking' }

export default function SystemRibbon() {
  const { coreOnline, mockMode, engine, model, voiceState, approvals } = useJarvisStore()
  return (
    <div className="cb-ribbon cb-panel">
      <span className="cb-brand">JARVIS · FLEETGLASS</span>
      {mockMode && <span className="cb-badge-mock">MOCK</span>}
      <span className="cb-spacer" />
      <span className="cb-chip">
        <span className={`cb-dot ${coreOnline ? 'on' : 'off'}`} />
        Core {coreOnline ? 'online' : 'offline'}
      </span>
      <span className="cb-chip"><Cpu size={13} /> {engine}</span>
      <span className="cb-chip"><Activity size={13} /> {model}</span>
      <span className="cb-chip"><Mic size={13} /> {VOICE_LABEL[voiceState] ?? voiceState}</span>
      <span className="cb-chip">
        <ShieldAlert size={13} color={approvals.length ? '#ffd54f' : undefined} />
        {approvals.length} pending
      </span>
    </div>
  )
}
