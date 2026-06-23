import { graph } from './graph.js'
import { registerTool } from '../tools.js'

// ── Helpers ──────────────────────────────────────────────────────────────

function dateRange(when) {
  const now  = new Date()
  const pad  = n => String(n).padStart(2, '0')
  const iso  = d => d.toISOString()

  if (!when || when === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end   = new Date(start); end.setDate(end.getDate() + 1)
    return { start: iso(start), end: iso(end) }
  }
  if (when === 'tomorrow') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const end   = new Date(start); end.setDate(end.getDate() + 1)
    return { start: iso(start), end: iso(end) }
  }
  if (when === 'this_week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end   = new Date(start); end.setDate(end.getDate() + 7)
    return { start: iso(start), end: iso(end) }
  }
  // Fallback: assume ISO date string
  const start = new Date(when)
  const end   = new Date(start); end.setDate(end.getDate() + 1)
  return { start: iso(start), end: iso(end) }
}

function formatEvent(e) {
  return {
    id:       e.id,
    subject:  e.subject,
    start:    e.start?.dateTime,
    end:      e.end?.dateTime,
    location: e.location?.displayName,
    organizer: e.organizer?.emailAddress?.name,
    isOnline: !!e.onlineMeeting,
    joinUrl:  e.onlineMeeting?.joinUrl ?? null,
    bodyPreview: e.bodyPreview?.slice(0, 200)
  }
}

// ── Tool handlers ─────────────────────────────────────────────────────────

async function getEvents({ when, keyword }) {
  const { start, end } = dateRange(when ?? 'today')
  let url = `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime&$top=20`
  if (keyword) url += `&$filter=contains(subject,'${keyword}')`
  const data = await graph.get(url)
  return (data.value ?? []).map(formatEvent)
}

async function createEvent({ subject, start, end, location, body, attendees }) {
  const event = {
    subject,
    start:    { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:      { dateTime: end,   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  }
  if (location)  event.location  = { displayName: location }
  if (body)      event.body      = { contentType: 'text', content: body }
  if (attendees?.length) {
    event.attendees = attendees.map(a => ({
      emailAddress: { address: a },
      type: 'required'
    }))
  }
  const result = await graph.post('/me/events', event)
  return { created: true, id: result.id, subject: result.subject }
}

async function editEvent({ eventId, subject, start, end, location, body }) {
  const patch = {}
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (subject)  patch.subject  = subject
  if (start)    patch.start    = { dateTime: start, timeZone: tz }
  if (end)      patch.end      = { dateTime: end,   timeZone: tz }
  if (location) patch.location = { displayName: location }
  if (body)     patch.body     = { contentType: 'text', content: body }
  await graph.patch(`/me/events/${eventId}`, patch)
  return { updated: true, eventId }
}

async function cancelEvent({ eventId, comment }) {
  await graph.post(`/me/events/${eventId}/cancel`, { comment: comment ?? '' })
  return { cancelled: true, eventId }
}

// ── Registration ──────────────────────────────────────────────────────────

export function registerCalendarTools() {
  registerTool('get_calendar_events', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'get_calendar_events',
        description: 'Fetch calendar events for a given time period.',
        parameters: {
          type: 'object',
          properties: {
            when:    { type: 'string', enum: ['today','tomorrow','this_week'], description: 'Time period or ISO date.' },
            keyword: { type: 'string', description: 'Optional keyword to filter by subject.' }
          }
        }
      }
    },
    handler: getEvents
  })

  registerTool('create_calendar_event', {
    tier: 2,
    describeAction: a => `Create event "${a.subject}" starting ${a.start}`,
    definition: {
      type: 'function',
      function: {
        name: 'create_calendar_event',
        description: 'Create a new calendar event.',
        parameters: {
          type: 'object',
          required: ['subject', 'start', 'end'],
          properties: {
            subject:   { type: 'string' },
            start:     { type: 'string', description: 'ISO 8601 datetime.' },
            end:       { type: 'string', description: 'ISO 8601 datetime.' },
            location:  { type: 'string' },
            body:      { type: 'string' },
            attendees: { type: 'array', items: { type: 'string' }, description: 'Email addresses.' }
          }
        }
      }
    },
    handler: createEvent
  })

  registerTool('edit_calendar_event', {
    tier: 2,
    describeAction: a => `Edit event ${a.eventId}`,
    definition: {
      type: 'function',
      function: {
        name: 'edit_calendar_event',
        description: 'Edit an existing calendar event.',
        parameters: {
          type: 'object',
          required: ['eventId'],
          properties: {
            eventId:  { type: 'string' },
            subject:  { type: 'string' },
            start:    { type: 'string' },
            end:      { type: 'string' },
            location: { type: 'string' },
            body:     { type: 'string' }
          }
        }
      }
    },
    handler: editEvent
  })

  registerTool('cancel_calendar_event', {
    tier: 3,
    describeAction: a => `Cancel event ${a.eventId}`,
    definition: {
      type: 'function',
      function: {
        name: 'cancel_calendar_event',
        description: 'Cancel a calendar event.',
        parameters: {
          type: 'object',
          required: ['eventId'],
          properties: {
            eventId: { type: 'string' },
            comment: { type: 'string' }
          }
        }
      }
    },
    handler: cancelEvent
  })
}
