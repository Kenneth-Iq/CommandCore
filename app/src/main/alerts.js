/**
 * Phase 6 — Proactive alert system.
 * Polls integrations on a schedule and fires audio + desktop notifications.
 */

import { Notification } from 'electron'
import { graph } from './integrations/graph.js'

let alertIntervals = []
let broadcastFn    = null
let appConfig      = null

export function initAlerts(config, broadcastToAll) {
  appConfig   = config
  broadcastFn = broadcastToAll
  stopAlerts()

  // Calendar: check every 60 seconds for events in the next 15 minutes
  if (config.integrations?.calendar?.enabled) {
    alertIntervals.push(setInterval(checkCalendarAlerts, 60_000))
  }

  // Server health: check every 2 minutes if servers integration is enabled
  if (config.integrations?.servers?.enabled) {
    alertIntervals.push(setInterval(checkServerHealth, 120_000))
  }
}

export function stopAlerts() {
  alertIntervals.forEach(id => clearInterval(id))
  alertIntervals = []
}

function fireAlert(title, body) {
  // Desktop notification
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
  // Also push to UI for TTS
  broadcastFn?.('jarvis:proactive-alert', { title, body })
}

async function checkCalendarAlerts() {
  if (!appConfig?.integrations?.calendar?.enabled) return
  try {
    const now    = new Date()
    const soon   = new Date(now.getTime() + 15 * 60 * 1000)
    const data   = await graph.get(
      `/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${soon.toISOString()}&$top=5`
    )
    for (const event of data?.value ?? []) {
      const start  = new Date(event.start?.dateTime)
      const minAway = Math.round((start - now) / 60000)
      if (minAway <= 15 && minAway > 0) {
        fireAlert(
          `Upcoming: ${event.subject}`,
          `Starts in ${minAway} minutes${event.location?.displayName ? ` · ${event.location.displayName}` : ''}`
        )
      }
    }
  } catch {}
}

async function checkServerHealth() {
  if (!appConfig?.integrations?.servers?.enabled) return
  const servers = appConfig?.integrations?.servers?.hosts ?? []
  for (const server of servers) {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 5000)
      if (server.type === 'rest') {
        const res = await fetch(`${server.restBase}/health`, { signal: controller.signal })
        clearTimeout(id)
        if (!res.ok) {
          fireAlert(`Server down: ${server.name}`, `Health check returned HTTP ${res.status}`)
        }
      }
    } catch (err) {
      fireAlert(`Server unreachable: ${server.name}`, err.message)
    }
  }
}
