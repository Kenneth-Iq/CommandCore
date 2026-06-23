/**
 * Event feed wiring + mock generator for the Command Bridge (PHASE-6.md §3-4).
 *
 * @typedef {(
 *   'core.status'|'mission.created'|'mission.status'|'plan.proposed'|
 *   'agent.spawned'|'agent.status'|'tool.call'|'tool.result'|
 *   'approval.requested'|'approval.resolved'|'memory.recalled'|
 *   'research.progress'|'sitrep'|'mission.completed'|'mission.failed'|'alert'
 * )} JarvisEventType
 *
 * @typedef {Object} JarvisEvent
 * @property {string=} mission_id
 * @property {string=} agent_id
 * @property {JarvisEventType} type
 * @property {Object} payload
 * @property {string} ts
 */

import { useJarvisStore } from '../store/jarvisStore.js'

let mockTimer = null

/**
 * Subscribe the store to the live IPC event feed + Core connection state.
 * Returns an unsubscribe function. The main process owns the WebSocket;
 * we only consume `jarvis:event` / `jarvis:core-status` (PHASE-6.md §1).
 */
export function initJarvisFeed(store) {
  const offEvent = window.jarvis.onCoreEvent(evt => store.ingest(evt))
  const offStatus = window.jarvis.onCoreStatus(({ online }) => {
    store.setCoreOnline(online)
    if (online) { stopMockFeed(); reseedFromCore(store) }
    else maybeStartMock(store)
  })

  // initial probe
  window.jarvis.coreStatus()
    .then(({ online }) => {
      store.setCoreOnline(online)
      if (online) reseedFromCore(store)
      else maybeStartMock(store)
    })
    .catch(() => { store.setCoreOnline(false); maybeStartMock(store) })

  return () => { offEvent(); offStatus(); stopMockFeed() }
}

async function reseedFromCore(store) {
  try {
    const missions = await window.jarvis.coreMissions()
    store.seedMissions(missions || [])
  } catch { /* offline race — mock or empty */ }
}

function maybeStartMock(store) {
  // `store` is a getState() snapshot — read coreOnline live, not stale
  if (useJarvisStore.getState().coreOnline) return
  startMockFeed(store)
}

// ── mock mode (PHASE-6.md §4) ────────────────────────────────────────────────

const MOCK_ROLES = [
  ['researcher', 'Gather sources on the smart-home market'],
  ['analyst', 'Crunch the pricing data'],
  ['writer', 'Draft the briefing'],
]

let mockSeq = 0

function emit(store, type, payload, mission_id, agent_id) {
  store.ingest({ type, payload, mission_id, agent_id, ts: new Date().toISOString() })
}

export function startMockFeed(store) {
  if (mockTimer) return
  store.setMockMode(true)
  store.resetForMock()
  store.setSystem({ engine: 'mock', model: 'demo', version: '0.1.0' })

  const runOnce = () => {
    const mid = `mock_${++mockSeq}`
    const steps = []
    steps.push(() => emit(store, 'mission.created',
      { title: `Demo mission ${mockSeq}`, prompt: 'analyze the smart-home market', mode: 'mission' }, mid))
    steps.push(() => emit(store, 'mission.status', { status: 'planning' }, mid))
    steps.push(() => emit(store, 'plan.proposed',
      { plan: { stages: [[{ role: 'researcher' }, { role: 'analyst' }], [{ role: 'writer' }]] } }, mid, 'prime'))
    MOCK_ROLES.forEach(([role], i) => {
      steps.push(() => emit(store, 'agent.spawned', { role, model: 'demo' }, mid, `${role}-1`))
      steps.push(() => emit(store, 'agent.status', { state: 'running', detail: 'working' }, mid, `${role}-1`))
      steps.push(() => emit(store, 'tool.call', { tool: i % 2 ? 'web.search' : 'file.write' }, mid, `${role}-1`))
      steps.push(() => emit(store, 'tool.result', { tool: i % 2 ? 'web.search' : 'file.write', ok: true }, mid, `${role}-1`))
      steps.push(() => emit(store, 'agent.status', { state: 'done', detail: '' }, mid, `${role}-1`))
    })
    steps.push(() => emit(store, 'sitrep', { text: 'SITREP: demo objectives achieved. Market is growing ~20% YoY.' }, mid, 'prime'))
    steps.push(() => emit(store, 'mission.completed', { result_summary: 'SITREP: demo objectives achieved.' }, mid))

    let i = 0
    const fire = () => {
      if (!mockTimer) return
      steps[i++]()
      if (i < steps.length) mockTimer = setTimeout(fire, 900)
      else mockTimer = setTimeout(runOnce, 4000)
    }
    fire()
  }

  mockTimer = setTimeout(runOnce, 200)
}

export function stopMockFeed() {
  if (mockTimer) { clearTimeout(mockTimer); mockTimer = null }
}
