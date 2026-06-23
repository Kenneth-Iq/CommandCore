import { ipcMain } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'

import { transcribeAudio } from './voice/stt.js'
import { initLLM, getLLMClient, listAvailableModels, setModel } from './llm.js'
import { saveCredential, loadCredential, hasCredential, canEncrypt } from './credentials.js'
import { setSandboxRoot, sandboxRead, sandboxWrite, sandboxDelete, sandboxMove, sandboxList } from './sandbox.js'
import { logAction, getRecentActions, searchActions } from './log.js'
import { classifyIntent, getSystemPromptForIntent } from './intent.js'
import { agenticLoop, getToolDefinitions } from './tools.js'
import { startListening } from './voice/pipeline.js'
import { getGlance, getHistory } from './feeds.js'

// Integration registrations — each module registers its tools on import
import { registerCalendarTools } from './integrations/calendar.js'
import { registerEmailTools }    from './integrations/email.js'
import { registerServerTools }   from './integrations/servers.js'
import { registerResearchTools } from './integrations/research.js'
import { registerMemoryTools, buildMemoryContext } from './integrations/memory.js'
import { registerSocialTools }                                               from './integrations/social.js'
import { initOllama, listOllamaModels, isOllamaAvailable, getOllamaClient } from './integrations/ollama.js'
import { undoLast, listUndoable }                                            from './undo.js'
import { startOAuthFlow, hasTokens as msHasTokens }                         from './integrations/auth/msal.js'
import { initCoreClient, isCoreOnline, coreChat, resolveApproval,
         listMissions, missionAgents, createMission,
         listSchedules, setScheduleEnabled,
         createSchedule, updateSchedule, deleteSchedule }                   from './core-client.js'

let conversationHistory = []
let pendingConfirmations = new Map() // id -> { resolve, requireDouble, firstConfirmed }

// ── Confirmation protocol ────────────────────────────────────────────────

function makeConfirmFn(broadcastToAll) {
  return function confirm({ action, description, requireDouble = false }) {
    return new Promise(resolve => {
      const id = uuidv4()
      pendingConfirmations.set(id, { resolve, requireDouble, firstConfirmed: false })
      broadcastToAll('jarvis:confirmation-request', { id, action, description, requireDouble })
    })
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────

export function setupIPC({ config, broadcastToAll, createExpandedPanel }) {
  setSandboxRoot(config.sandbox.root)

  if (hasCredential('nvidia_api_key')) {
    try { initLLM(config) } catch (err) { console.warn('LLM init deferred:', err.message) }
  }

  // Register integration tools
  if (config.integrations?.calendar?.enabled)  registerCalendarTools()
  if (config.integrations?.email?.enabled)     registerEmailTools()
  if (config.integrations?.servers?.enabled)   registerServerTools()
  if (config.integrations?.research?.enabled)  registerResearchTools()
  if (config.integrations?.social?.enabled)    registerSocialTools()
  registerMemoryTools() // always on

  const confirm = makeConfirmFn(broadcastToAll)

  // ── Jarvis Core connection ───────────────────────────────────────────────
  // Core (Python service) is the primary brain; the local loop below is the
  // offline fallback. Approval requests from Core reuse the same
  // confirmation dialog as local tier-2+ tools.
  initCoreClient({
    host: config.core?.host ?? '127.0.0.1',
    port: config.core?.port ?? 8765,
    onEvent: evt => {
      broadcastToAll('jarvis:event', evt)
      if (evt.type === 'approval.requested') {
        const { approval_id, tier, action, description } = evt.payload
        confirm({ action, description, requireDouble: tier >= 3 })
          .then(confirmed => resolveApproval(approval_id, confirmed ? 'approve' : 'deny'))
          .catch(err => console.warn('Approval resolve failed:', err.message))
      }
    },
    onStateChange: isOnline => broadcastToAll('jarvis:core-status', { online: isOnline })
  })

  ipcMain.handle('jarvis:core-status', () => ({ online: isCoreOnline() }))
  ipcMain.handle('jarvis:core-missions', async () => (await listMissions()).missions)
  ipcMain.handle('jarvis:core-mission-agents', async (_e, id) => (await missionAgents(id)).agents)
  ipcMain.handle('jarvis:core-create-mission', async (_e, prompt) => (await createMission(prompt)).mission)
  ipcMain.handle('jarvis:core-schedules', async () => (await listSchedules()).schedules)
  ipcMain.handle('jarvis:core-schedule-toggle', async (_e, id, enabled) =>
    (await setScheduleEnabled(id, enabled)).schedule)
  ipcMain.handle('jarvis:core-schedule-create', async (_e, body) =>
    (await createSchedule(body)).schedule)
  ipcMain.handle('jarvis:core-schedule-update', async (_e, id, body) =>
    (await updateSchedule(id, body)).schedule)
  ipcMain.handle('jarvis:core-schedule-delete', async (_e, id) =>
    (await deleteSchedule(id), true))

  // ── Text messages ────────────────────────────────────────────────────────
  ipcMain.handle('jarvis:send-message', async (_e, userText) => {
    return handleMessage(userText, { broadcastToAll, config, confirm })
  })

  // ── Confirmation responses ────────────────────────────────────────────────
  ipcMain.on('jarvis:confirmation-response', (_e, { id, confirmed }) => {
    const pending = pendingConfirmations.get(id)
    if (!pending) return

    if (pending.requireDouble && confirmed && !pending.firstConfirmed) {
      // First confirmation of a double-confirm — ask again
      pending.firstConfirmed = true
      broadcastToAll('jarvis:confirmation-request', {
        id, action: 'Confirm again',
        description: 'This action is irreversible. Confirm a second time to proceed.',
        requireDouble: false, isSecondConfirm: true
      })
    } else {
      pending.resolve(confirmed)
      pendingConfirmations.delete(id)
    }
  })

  // ── Audio / voice ─────────────────────────────────────────────────────────
  ipcMain.handle('jarvis:transcribe-audio', (_e, audioBase64) =>
    transcribeAudio(audioBase64, config))

  ipcMain.on('jarvis:start-listen', () => startListening({ config, broadcastToAll }))

  // ── File operations ───────────────────────────────────────────────────────
  ipcMain.handle('jarvis:file-list',   (_e, dir)               => sandboxList(dir ?? ''))
  ipcMain.handle('jarvis:file-read',   (_e, p)                 => sandboxRead(p))
  ipcMain.handle('jarvis:file-write',  (_e, p, content, opts)  => { sandboxWrite(p, content, opts); return { ok: true } })
  ipcMain.handle('jarvis:file-delete', (_e, p)                 => { sandboxDelete(p); return { ok: true } })
  ipcMain.handle('jarvis:file-move',   (_e, f, t)              => { sandboxMove(f, t); return { ok: true } })

  // ── Ambient glance feeds (weather / FX / ETF) ─────────────────────────────
  ipcMain.handle('jarvis:feeds-glance',  ()                  => getGlance())
  ipcMain.handle('jarvis:feeds-history', (_e, metric, range) => getHistory(metric, range))

  // ── Audit log ─────────────────────────────────────────────────────────────
  ipcMain.handle('jarvis:log-get',    (_e, limit) => getRecentActions(limit))
  ipcMain.handle('jarvis:log-search', (_e, q)     => searchActions(q))

  // ── Config ────────────────────────────────────────────────────────────────
  ipcMain.handle('jarvis:get-config', () => config)
  ipcMain.handle('jarvis:list-models', () => listAvailableModels())

  // ── Ollama (Phase 6) ──────────────────────────────────────────────────────
  ipcMain.handle('jarvis:ollama-status',       () => isOllamaAvailable())
  ipcMain.handle('jarvis:ollama-list-models',  () => listOllamaModels())
  ipcMain.handle('jarvis:ollama-set-model', (_e, modelId) => {
    config.llm.provider = 'ollama'
    config.llm.ollama_model = modelId
    initOllama(config)
    const configPath = join(config.sandbox.root, 'config', 'jarvis.yaml')
    writeFileSync(configPath, yaml.dump(config), 'utf8')
    broadcastToAll('jarvis:config-updated', {})
    return { ok: true }
  })
  ipcMain.handle('jarvis:switch-to-nim', () => {
    config.llm.provider = 'nvidia-nim'
    initLLM(config)
    const configPath = join(config.sandbox.root, 'config', 'jarvis.yaml')
    writeFileSync(configPath, yaml.dump(config), 'utf8')
    broadcastToAll('jarvis:config-updated', {})
    return { ok: true }
  })

  // ── Undo (Phase 6) ─────────────────────────────────────────────────────────
  ipcMain.handle('jarvis:undo',       () => undoLast())
  ipcMain.handle('jarvis:undo-list',  () => listUndoable())

  ipcMain.handle('jarvis:set-model', (_e, modelId) => {
    config.llm.model = modelId
    setModel(modelId)
    const configPath = join(config.sandbox.root, 'config', 'jarvis.yaml')
    writeFileSync(configPath, yaml.dump(config), 'utf8')
    broadcastToAll('jarvis:config-updated', { llm: { model: modelId } })
    return { ok: true }
  })

  ipcMain.handle('jarvis:set-integration-enabled', (_e, name, enabled) => {
    if (!config.integrations[name]) config.integrations[name] = {}
    config.integrations[name].enabled = enabled
    const configPath = join(config.sandbox.root, 'config', 'jarvis.yaml')
    writeFileSync(configPath, yaml.dump(config), 'utf8')
    broadcastToAll('jarvis:config-updated', {})
    // Re-register tools based on new state
    if (name === 'calendar' && enabled) registerCalendarTools()
    if (name === 'email' && enabled)    registerEmailTools()
    return { ok: true }
  })

  // ── Credential vault ──────────────────────────────────────────────────────
  ipcMain.handle('jarvis:save-credential', (_e, name, value) => {
    saveCredential(name, value)
    if (name === 'nvidia_api_key') {
      try { initLLM(config) } catch (err) { throw new Error(err.message) }
    }
    return { ok: true }
  })

  ipcMain.handle('jarvis:has-credential',  (_e, name) => hasCredential(name))
  ipcMain.handle('jarvis:can-encrypt',     ()         => canEncrypt())

  // ── Microsoft OAuth ───────────────────────────────────────────────────────
  ipcMain.handle('jarvis:ms-auth-start', async () => {
    const clientId = loadCredential('ms_client_id')
    if (!clientId) throw new Error('Microsoft Client ID not set')
    await startOAuthFlow(clientId)
    return { ok: true }
  })

  ipcMain.handle('jarvis:ms-auth-status', () => ({ connected: msHasTokens() }))

  // ── UI ────────────────────────────────────────────────────────────────────
  ipcMain.on('jarvis:open-expanded',    ()  => createExpandedPanel())
  ipcMain.on('jarvis:reset-conversation', () => {
    conversationHistory = []
    broadcastToAll('jarvis:state-change', { state: 'idle' })
  })
}

// ── Core message handler ──────────────────────────────────────────────────

export async function handleMessage(userText, { broadcastToAll, config, confirm }) {
  if (!userText?.trim()) return null

  broadcastToAll('jarvis:state-change', { state: 'processing' })

  // Primary path: Jarvis Core. Falls through to the local loop on any error
  // so a dead Core never blocks the commander (PRD graceful degradation).
  if (isCoreOnline()) {
    try {
      const text = await coreChat(userText)
      conversationHistory.push({ role: 'user', content: userText })
      conversationHistory.push({ role: 'assistant', content: text })
      broadcastToAll('jarvis:response', { text, intent: 'CORE' })
      broadcastToAll('jarvis:state-change', { state: 'speaking' })
      return { text, intent: 'CORE' }
    } catch (err) {
      console.warn('Core chat failed, falling back to local loop:', err.message)
    }
  }

  try {
    const intent = await classifyIntent(userText)
    const memCtx = buildMemoryContext(config.sandbox.root)
    const systemPrompt = getSystemPromptForIntent(intent) + memCtx

    conversationHistory.push({ role: 'user', content: userText })
    const contextMessages = conversationHistory.slice(-20)
    const messages = [{ role: 'system', content: systemPrompt }, ...contextMessages]

    let llm = config.llm?.provider === 'ollama'
      ? getOllamaClient()
      : getLLMClient()
    const { client, model } = llm
    if (!client) throw new Error('LLM not initialized — check your API key in the Integrations tab.')

    const responseText = await agenticLoop(messages, { config, confirm, client, model })

    conversationHistory.push({ role: 'assistant', content: responseText })

    logAction({
      intent,
      actionType: 'llm_response',
      payloadSummary: userText.slice(0, 120),
      result: responseText.slice(0, 120)
    })

    broadcastToAll('jarvis:response', { text: responseText, intent })
    broadcastToAll('jarvis:state-change', { state: 'speaking' })

    return { text: responseText, intent }
  } catch (err) {
    let msg = `I ran into an error: ${err.message}`
    if (err.status === 404 || err.message?.includes('404')) {
      msg = `Model not found (404). Open Integrations tab → Browse available models → select one.`
    } else if (err.status === 401 || err.message?.includes('401')) {
      msg = `API key rejected (401). Open Integrations tab to update your NVIDIA API key.`
    } else if (err.status === 429 || err.message?.includes('429')) {
      msg = `Rate limit hit (429). Wait a moment and try again.`
    }
    broadcastToAll('jarvis:response', { text: msg, intent: 'ERROR' })
    broadcastToAll('jarvis:state-change', { state: 'idle' })
    return { text: msg, intent: 'ERROR' }
  }
}
