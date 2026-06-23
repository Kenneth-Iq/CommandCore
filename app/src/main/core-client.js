/**
 * Jarvis Core client — REST commands + WebSocket event stream.
 *
 * The Electron main process is a thin frontend to the Core (PHASE-0-1.md §4.4):
 * chat turns become missions, Core events are forwarded to the renderer, and
 * approval requests surface through the existing confirmation dialog.
 *
 * Connection is optional by design: when Core is unreachable the app falls
 * back to the local agentic loop (PRD graceful-degradation principle).
 */

import WebSocket from 'ws'

const CHAT_TIMEOUT_MS = 120_000
const RECONNECT_MAX_MS = 30_000

let baseUrl = null
let wsUrl = null
let ws = null
let online = false
let stopped = false
let reconnectDelay = 1000
let reconnectTimer = null

let onEvent = null
let onStateChange = null

// mission_id -> { resolve, reject, timer } for in-flight chat turns
const pendingChats = new Map()

export function initCoreClient({ host = '127.0.0.1', port = 8765, onEvent: evtCb, onStateChange: stateCb } = {}) {
  baseUrl = `http://${host}:${port}`
  wsUrl = `ws://${host}:${port}/ws/events`
  onEvent = evtCb
  onStateChange = stateCb
  stopped = false
  connect()
}

export function stopCoreClient() {
  stopped = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) try { ws.close() } catch { /* already closed */ }
}

export function isCoreOnline() {
  return online
}

function setOnline(value) {
  if (online === value) return
  online = value
  onStateChange?.(online)
}

function connect() {
  if (stopped) return
  ws = new WebSocket(wsUrl)

  ws.on('open', () => {
    reconnectDelay = 1000
    setOnline(true)
  })

  ws.on('message', raw => {
    let event
    try { event = JSON.parse(raw.toString()) } catch { return }
    dispatch(event)
  })

  const scheduleReconnect = () => {
    setOnline(false)
    if (stopped || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
  }

  ws.on('close', scheduleReconnect)
  ws.on('error', () => { try { ws.close() } catch { /* noop */ } })
}

function dispatch(event) {
  const pending = event.mission_id ? pendingChats.get(event.mission_id) : null
  if (pending) {
    if (event.type === 'assistant.message' && event.payload?.final) {
      clearTimeout(pending.timer)
      pendingChats.delete(event.mission_id)
      pending.resolve(event.payload.text ?? '')
    } else if (event.type === 'mission.failed') {
      clearTimeout(pending.timer)
      pendingChats.delete(event.mission_id)
      pending.reject(new Error(event.payload?.error ?? 'mission failed'))
    }
  }
  onEvent?.(event)
}

async function rest(method, path, body) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Core ${method} ${path} -> ${res.status} ${detail.slice(0, 200)}`)
  }
  if (res.status === 204) return {}
  return res.json()
}

/** Send a chat turn to Core; resolves with the final assistant text. */
export async function coreChat(prompt, { mode = 'chat', title } = {}) {
  const { mission } = await rest('POST', '/missions', { prompt, mode, title })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingChats.delete(mission.id)
      reject(new Error('Core chat timed out'))
    }, CHAT_TIMEOUT_MS)
    pendingChats.set(mission.id, { resolve, reject, timer })
  })
}

export function resolveApproval(approvalId, decision, note) {
  return rest('POST', `/approvals/${approvalId}/resolve`, { decision, note })
}

export function listMissions()        { return rest('GET', '/missions') }
export function missionAgents(id)     { return rest('GET', `/missions/${id}/agents`) }
export function createMission(prompt, title) {
  return rest('POST', '/missions', { prompt, mode: 'mission', title })
}
export function coreHealth()          { return rest('GET', '/health') }

export function listSchedules()       { return rest('GET', '/schedules') }
export function setScheduleEnabled(id, enabled) {
  return rest('PATCH', `/schedules/${id}`, { enabled })
}
export function createSchedule(body)     { return rest('POST', '/schedules', body) }
export function updateSchedule(id, body) { return rest('PATCH', `/schedules/${id}`, body) }
export function deleteSchedule(id)       { return rest('DELETE', `/schedules/${id}`) }
