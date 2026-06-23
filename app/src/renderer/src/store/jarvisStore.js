import { create } from 'zustand'

const EVENT_BUFFER = 200
const ROLE_ORDER = ['researcher', 'writer', 'analyst', 'operator', 'sentinel']

function agentRoleFromId(agentId) {
  return (agentId || '').split('-')[0]
}

export const useJarvisStore = create((set, get) => ({
  coreOnline: false,
  mockMode: false,
  engine: '—',
  model: '—',
  version: '—',
  voiceState: 'idle',
  transcript: '',
  missions: {},          // id -> mission row
  agents: {},            // mission_id -> { agent_id -> card }
  approvals: [],         // pending approval cards
  events: [],            // ring buffer, newest last
  selectedMissionId: null,
  artifactDrawer: { open: false, missionId: null },

  // ── setters ──────────────────────────────────────────────────────────────
  setCoreOnline: online => set({ coreOnline: online, mockMode: online ? false : get().mockMode }),
  setMockMode: on => set({ mockMode: on }),
  setVoiceState: voiceState => set({ voiceState }),
  setTranscript: transcript => set({ transcript }),
  setSystem: patch => set(patch),
  selectMission: id => set({ selectedMissionId: id }),
  openArtifacts: missionId => set({ artifactDrawer: { open: true, missionId } }),
  closeArtifacts: () => set(s => ({ artifactDrawer: { ...s.artifactDrawer, open: false } })),

  seedMissions(list) {
    const missions = {}
    for (const m of list || []) missions[m.id] = m
    set({ missions })
  },

  // Seed a mission's fleet from stored agent_runs (for missions that ran before
  // the app opened, so the orb/cards reflect their final state on select).
  seedAgents(missionId, runs) {
    const fleet = {}
    for (const r of runs || []) {
      fleet[r.agent_id] = {
        role: r.role, state: r.status,
        detail: (r.result_summary ?? '').slice(0, 120), lastTool: '',
      }
    }
    set(s => ({ agents: { ...s.agents, [missionId]: fleet } }))
  },

  resetForMock() {
    set({ missions: {}, agents: {}, approvals: [], events: [], selectedMissionId: null })
  },

  upsertMission(mission) {
    set(s => ({ missions: { ...s.missions, [mission.id]: { ...s.missions[mission.id], ...mission } } }))
  },

  pushApproval(card) {
    set(s => s.approvals.some(a => a.id === card.id)
      ? {}
      : { approvals: [...s.approvals, card] })
  },

  enrichApproval(missionId, agentId, patch) {
    // join data from a Core approval.requested event onto a pending card
    set(s => ({
      approvals: s.approvals.map(a =>
        (a.mission_id === missionId && (!a.agent_id || a.agent_id === agentId))
          ? { ...a, ...patch } : a),
    }))
  },

  resolveApproval(id) {
    set(s => ({ approvals: s.approvals.filter(a => a.id !== id) }))
  },

  // ── event ingestion ────────────────────────────────────────────────────────
  ingest(event) {
    const { type, payload = {}, mission_id: mid, agent_id: aid, ts } = event
    set(s => ({ events: [...s.events.slice(-(EVENT_BUFFER - 1)), { ...event, _k: `${ts}:${type}:${aid ?? ''}` }] }))

    if (type === 'core.status') {
      set({ engine: payload.engine ?? '—', version: payload.version ?? '—',
            model: payload.model ?? get().model })
      return
    }
    if (type === 'mission.created') {
      get().upsertMission({ id: mid, title: payload.title, prompt: payload.prompt,
                            mode: payload.mode, status: 'queued' })
      if (!get().selectedMissionId) set({ selectedMissionId: mid })
      return
    }
    if (type === 'mission.status' || type === 'plan.proposed') {
      if (payload.status) get().upsertMission({ id: mid, status: payload.status })
      if (type === 'plan.proposed') get().upsertMission({ id: mid, plan: payload.plan })
      return
    }
    if (type === 'mission.completed') {
      get().upsertMission({ id: mid, status: 'completed', result_summary: payload.result_summary })
      return
    }
    if (type === 'mission.failed') {
      get().upsertMission({ id: mid, status: 'failed', result_summary: payload.error })
      return
    }
    if (type === 'sitrep') {
      get().upsertMission({ id: mid, result_summary: payload.text })
      return
    }
    if (type === 'approval.requested') {
      // enrich any confirmation card already raised for this mission/agent
      get().enrichApproval(mid, aid, {
        tier: payload.tier, action: payload.action,
        description: payload.description, mission_id: mid, agent_id: aid,
      })
      return
    }
    if (aid && (type.startsWith('agent.') || type.startsWith('tool.'))) {
      set(s => {
        const forMission = { ...(s.agents[mid] || {}) }
        const card = { ...(forMission[aid] || {
          role: agentRoleFromId(aid), state: 'running', detail: '', lastTool: '',
        }) }
        if (type === 'agent.spawned') { card.role = payload.role || card.role; card.state = 'running' }
        else if (type === 'agent.status') { card.state = payload.state || card.state; card.detail = payload.detail || '' }
        else if (type === 'tool.call') card.lastTool = payload.tool || ''
        else if (type === 'tool.result') card.lastTool = `${payload.tool} ${payload.ok ? '✓' : '✗'}`
        forMission[aid] = card
        return { agents: { ...s.agents, [mid]: forMission } }
      })
    }
  },

}))

export { ROLE_ORDER }
