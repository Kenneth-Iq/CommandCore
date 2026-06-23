import { useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore.js'
import { MessageSquare, Boxes, Telescope, FolderOpen } from 'lucide-react'

const STATUS_COLOR = {
  queued: '#7c8794', planning: '#ffd54f', awaiting_approval: '#ffd54f',
  running: '#4fc3f7', completed: '#69f0ae', failed: '#ff5252', cancelled: '#7c8794',
}
const MODE_ICON = { chat: MessageSquare, mission: Boxes, research: Telescope }

export default function MissionRail() {
  const { missions, selectedMissionId, selectMission, seedAgents, agents, coreOnline, openArtifacts } = useJarvisStore()
  const [draft, setDraft] = useState('')
  const list = Object.values(missions).reverse()

  // Select + lazily load the stored fleet so a past mission's agents/result
  // show even if it ran before the app opened (live events only flow forward).
  async function select(id) {
    selectMission(id)
    if (!agents[id]) {
      try {
        const runs = await window.jarvis.coreMissionAgents(id)
        if (runs?.length) seedAgents(id, runs)
      } catch { /* offline — cards stay empty */ }
    }
  }

  async function launch(e) {
    e.preventDefault()
    const prompt = draft.trim()
    if (!prompt || !coreOnline) return
    setDraft('')
    try {
      const mission = await window.jarvis.coreCreateMission(prompt)
      if (mission?.id) selectMission(mission.id)
    } catch { /* offline */ }
  }

  return (
    <div className="cb-col cb-panel">
      <div className="cb-col-head">Mission Rail</div>
      <form className="cb-launch" onSubmit={launch}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={coreOnline ? 'New mission…' : 'Core offline'} disabled={!coreOnline} />
        <button className="cb-btn" type="submit" disabled={!coreOnline}>Go</button>
      </form>
      <div className="cb-scroll">
        {list.map(m => {
          const Icon = MODE_ICON[m.mode] ?? Boxes
          const fleet = Object.values(agents[m.id] || {})
          const active = fleet.filter(a => a.state === 'running' || a.state === 'acting').length
          return (
            <div key={m.id} className={`cb-mission ${m.id === selectedMissionId ? 'sel' : ''}`}
              onClick={() => select(m.id)}>
              <div className="cb-mtitle">{m.title || m.id}</div>
              <div className="cb-mmeta">
                <span className="cb-status" style={{ color: STATUS_COLOR[m.status] ?? '#7c8794' }}>
                  {(m.status || '').replace('_', ' ')}
                </span>
                <Icon size={11} />
                {fleet.length > 0 && <span>{active}/{fleet.length} active</span>}
                <span style={{ marginLeft: 'auto', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); openArtifacts(m.id) }}>
                  <FolderOpen size={11} />
                </span>
              </div>
            </div>
          )
        })}
        {list.length === 0 && <div className="cb-empty">No missions yet.</div>}
      </div>
    </div>
  )
}
