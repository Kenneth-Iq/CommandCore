// Launch a realistic fleet mission, auto-approve its plan, stream progress to a
// log, print the final briefing. Logs to scripts/.mission-out.log too.
import { appendFileSync, writeFileSync } from 'fs'

const BASE = 'http://localhost:8765'
const LOG = new URL('./.mission-out.log', import.meta.url)
writeFileSync(LOG, '')
const log = (...a) => {
  const line = `${new Date().toLocaleTimeString()} ${a.join(' ')}`
  console.log(line); appendFileSync(LOG, line + '\n')
}

async function api(method, path, body) {
  const r = await fetch(BASE + path, {
    method, headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  if (!r.ok) throw new Error(`${r.status} ${method} ${path} → ${text}`)
  return data
}

const PROMPT = process.env.JARVIS_MISSION || [
  'Conduct market research and analysis for an AI tutoring education platform.',
  'Product: an AI tutor that has vectorised past exam papers and course/curriculum',
  'content to deliver exam-aligned, curriculum-grounded tutoring to learners.',
  'Target customers: (1) students directly (B2C) and (2) schools (B2B).',
  'Primary market: South Africa (the platform starts there, given the matric/past-paper',
  'focus); add a note on broader African and global expansion.',
  'Deliver: (1) TAM, SAM and SOM with the key assumptions and rough numbers behind each;',
  '(2) an assessment of product-market fit and the best go-to-market motion — should we',
  'lead with students or schools and why, who the main competitors are, likely pricing',
  'models, and the key risks. Be concrete with figures and show the reasoning.',
].join(' ')

const TITLE = process.env.JARVIS_TITLE || 'AI tutor — TAM/SAM/SOM'

const { mission } = await api('POST', '/missions',
  { prompt: PROMPT, mode: 'mission', title: TITLE })
const id = mission.id
log(`created ${id} status=${mission.status}`)

const seen = new Set(), approved = new Set()
let lastStatus = mission.status
const start = Date.now()

while (Date.now() - start < 18 * 60_000) {
  await new Promise(r => setTimeout(r, 4000))
  try {

  const { events } = await api('GET', `/missions/${id}/events`)
  for (const e of events) {
    const k = `${e.ts}:${e.type}:${e.agent_id ?? ''}`
    if (seen.has(k)) continue
    seen.add(k)
    if (e.type === 'assistant.delta') continue // too chatty
    const tag = e.agent_id ? `[${e.agent_id}]` : '[core]'
    let x = ''
    if (e.type === 'tool.call') x = ` ${e.payload?.tool ?? ''} ${JSON.stringify(e.payload?.args ?? '').slice(0, 80)}`
    if (e.type === 'tool.result') x = ` ${e.payload?.tool ?? ''} ${e.payload?.ok ? 'ok' : 'FAIL'}`
    if (e.type === 'agent.status') x = ` ${e.payload?.state ?? ''}`
    if (e.type === 'agent.spawned') x = ` ${e.payload?.role ?? ''}`
    if (e.type === 'research.progress') x = ` ${JSON.stringify(e.payload).slice(0, 90)}`
    if (e.type === 'plan.proposed') x = ` ${JSON.stringify((e.payload?.plan?.stages ?? []).map(s => s.map(t => t.role)))}`
    log(`  ${tag} ${e.type}${x}`)
  }

  const { approvals } = await api('GET', '/approvals?status=pending')
  for (const a of approvals) {
    if (a.mission_id === id && !approved.has(a.id)) {
      approved.add(a.id)
      await api('POST', `/approvals/${a.id}/resolve`, { decision: 'approve', note: 'commander approved' })
      log(`  >> APPROVED ${a.id} (tier ${a.tier ?? '?'})`)
    }
  }

  const { mission: m } = await api('GET', `/missions/${id}`)
  if (m.status !== lastStatus) { log(`status ${lastStatus} -> ${m.status}`); lastStatus = m.status }
  if (['completed', 'failed', 'cancelled'].includes(m.status)) {
    const { agents } = await api('GET', `/missions/${id}/agents`)
    log(`\nFINAL ${m.status} | agents: ${agents.map(a => `${a.agent_id}(${a.status})`).join(', ')}`)
    log(`\n===== RESULT =====\n${m.result_summary ?? '(none)'}`)
    process.exit(0)
  }
  } catch (err) {
    log(`  (transient poll error: ${err.message} — retrying)`)
  }
}
log('TIMED OUT')
process.exit(1)
