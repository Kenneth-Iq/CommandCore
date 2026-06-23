import { useState, useEffect, useRef, useCallback } from 'react'
import CommandBridge from '../command-bridge/CommandBridge.jsx'

const TABS = ['Bridge', 'Conversation', 'Missions', 'Files', 'Tools', 'Integrations', 'Action Log']

export default function ExpandedPanel({ agentState, lastResponse, lastTranscript }) {
  const [activeTab, setActiveTab] = useState('Bridge')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState([])
  const [currentDir, setCurrentDir] = useState('')
  const [logEntries, setLogEntries] = useState([])
  const [logSearch, setLogSearch] = useState('')
  const [config, setConfig] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    window.jarvis.getConfig().then(setConfig)
    loadFiles('')
    loadLog()
    const offTab = window.jarvis.onNotifyOpenTab(tab => setActiveTab(tab))
    const offConfig = window.jarvis.onConfigUpdated(() => {
      window.jarvis.getConfig().then(setConfig)
    })
    return () => { offTab(); offConfig() }
  }, [])

  useEffect(() => {
    if (lastResponse) {
      setMessages(prev => [...prev, { role: 'assistant', text: lastResponse.text, intent: lastResponse.intent }])
    }
  }, [lastResponse])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadFiles(dir) {
    const list = await window.jarvis.fileList(dir)
    setFiles(list)
    setCurrentDir(dir)
  }

  async function loadLog(query = '') {
    const entries = query
      ? await window.jarvis.logSearch(query)
      : await window.jarvis.logGet(100)
    setLogEntries(entries)
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    await window.jarvis.sendMessage(text)
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Jarvis</span>
        <span style={styles.sandboxPath}>{config?.sandbox?.root ?? 'C:\\jarvis\\'}</span>
        <span style={{ ...styles.dot, background: STATE_COLORS[agentState] ?? '#555' }} />
        <span style={styles.stateLabel}>{agentState}</span>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bridge: always mounted so the SSE feed stays live and stage state
          persists during missions. Hidden with display:none on other tabs. */}
      <div style={{ flex: 1, minHeight: 0, flexDirection: 'column',
                    display: activeTab === 'Bridge' ? 'flex' : 'none' }}>
        <CommandBridge />
      </div>

      {/* Tab content */}
      {activeTab !== 'Bridge' && (
      <div style={styles.content}>
        {activeTab === 'Conversation' && (
          <ConversationTab
            messages={messages}
            input={input}
            setInput={setInput}
            onSubmit={sendMessage}
            agentState={agentState}
            bottomRef={bottomRef}
            lastTranscript={lastTranscript}
          />
        )}
        {activeTab === 'Missions' && <MissionsTab />}
        {activeTab === 'Files' && (
          <FilesTab
            files={files}
            currentDir={currentDir}
            onNavigate={loadFiles}
            config={config}
          />
        )}
        {activeTab === 'Tools' && <ToolsTab />}
        {activeTab === 'Integrations' && <IntegrationsTab config={config} />}
        {activeTab === 'Action Log' && (
          <ActionLogTab
            entries={logEntries}
            search={logSearch}
            onSearch={q => { setLogSearch(q); loadLog(q) }}
          />
        )}
      </div>
      )}
    </div>
  )
}

function ConversationTab({ messages, input, setInput, onSubmit, agentState, bottomRef, lastTranscript }) {
  return (
    <div style={styles.conversationContainer}>
      <div style={styles.messageList}>
        {messages.length === 0 && (
          <div style={styles.emptyHint}>No messages yet. Say "Hey Jarvis" or type below.</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.message, ...(msg.role === 'user' ? styles.userMsg : styles.assistantMsg) }}>
            <span style={styles.msgRole}>{msg.role === 'user' ? 'You' : 'Jarvis'}</span>
            <span style={styles.msgText}>{msg.text}</span>
            {msg.intent && <span style={styles.intentBadge}>{msg.intent}</span>}
          </div>
        ))}
        {agentState === 'listening' && lastTranscript && (
          <div style={{ ...styles.message, ...styles.userMsg, opacity: 0.5 }}>
            <span style={styles.msgRole}>You</span>
            <span style={{ ...styles.msgText, fontStyle: 'italic' }}>{lastTranscript}…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form style={styles.inputRow} onSubmit={onSubmit}>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={agentState === 'processing'}
          autoFocus
        />
        <button style={styles.sendBtn} type="submit" disabled={agentState === 'processing'}>Send</button>
        <button style={styles.sendBtn} type="button" onClick={() => window.jarvis.resetConversation()}>Reset</button>
      </form>
    </div>
  )
}

// ── Missions tab — fleet command view (Phase 2) ────────────────────────────
// Built from the Core event stream: mission list refreshes on mission.*
// events; agent cards update live from agent.*/tool.* events tagged with the
// selected mission's id.

const MISSION_STATUS_COLORS = {
  queued: '#888', planning: '#ffb74d', awaiting_approval: '#ffb74d',
  running: '#4fc3f7', completed: '#81c784', failed: '#ef5350', cancelled: '#777'
}
const AGENT_STATE_COLORS = {
  pending: '#888', running: '#4fc3f7', thinking: '#4fc3f7', acting: '#4fc3f7',
  waiting_approval: '#ffb74d', done: '#81c784', failed: '#ef5350', skipped: '#777'
}

function MissionsTab() {
  const [missions, setMissions] = useState([])
  const [coreOnline, setCoreOnline] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [agents, setAgents] = useState({})       // agent_id -> card
  const [sitrep, setSitrep] = useState('')
  const [ticker, setTicker] = useState([])
  const [newMission, setNewMission] = useState('')
  const [schedules, setSchedules] = useState([])
  const [schedForm, setSchedForm] = useState(null)   // null | {id?, name, cron_expr, prompt, mode}
  const [schedError, setSchedError] = useState('')
  const selectedRef = useRef(null)
  selectedRef.current = selectedId

  async function refreshMissions() {
    try {
      const list = await window.jarvis.coreMissions()
      setMissions(list ?? [])
      setCoreOnline(true)
    } catch {
      setCoreOnline(false)
    }
  }

  async function refreshSchedules() {
    try {
      const list = await window.jarvis.coreSchedules()
      setSchedules(list ?? [])
    } catch { /* core offline — leave last known list */ }
  }

  async function toggleSchedule(sched) {
    try {
      await window.jarvis.coreScheduleToggle(sched.id, !sched.enabled)
      await refreshSchedules()
    } catch { /* core offline */ }
  }

  async function deleteSchedule(sched) {
    if (!window.confirm(`Delete schedule "${sched.name}"?`)) return
    try {
      await window.jarvis.coreScheduleDelete(sched.id)
      await refreshSchedules()
    } catch { /* core offline */ }
  }

  async function saveSchedule(form, editingId) {
    setSchedError('')
    try {
      if (editingId) {
        await window.jarvis.coreScheduleUpdate(editingId, form)
      } else {
        await window.jarvis.coreScheduleCreate(form)
      }
      setSchedForm(null)
      await refreshSchedules()
    } catch (err) {
      const msg = String(err?.message ?? err)
      setSchedError(msg.includes('invalid cron') ? 'Invalid cron expression' : msg.slice(0, 120))
    }
  }

  async function selectMission(id) {
    setSelectedId(id)
    setAgents({})
    setSitrep('')
    try {
      const runs = await window.jarvis.coreMissionAgents(id)
      const seeded = {}
      for (const r of runs ?? []) {
        seeded[r.agent_id] = {
          role: r.role, state: r.status,
          detail: (r.result_summary ?? '').slice(0, 120), lastTool: ''
        }
      }
      setAgents(seeded)
      const mission = (await window.jarvis.coreMissions())?.find(m => m.id === id)
      if (mission?.status === 'completed') setSitrep(mission.result_summary ?? '')
    } catch { /* core offline — cards stay empty */ }
  }

  useEffect(() => {
    refreshMissions()
    refreshSchedules()
    const off = window.jarvis.onCoreEvent(evt => {
      setTicker(prev => [...prev.slice(-49), evt])
      if (evt.type.startsWith('mission.') || evt.type === 'plan.proposed') refreshMissions()
      if (evt.mission_id !== selectedRef.current || !evt.agent_id) return
      if (evt.type === 'sitrep') setSitrep(evt.payload.text)
      if (evt.agent_id === 'prime' && evt.type !== 'agent.spawned') return
      setAgents(prev => {
        const card = { ...(prev[evt.agent_id] ?? { role: evt.agent_id.split('-')[0], state: 'running', detail: '', lastTool: '' }) }
        if (evt.type === 'agent.spawned') { card.role = evt.payload.role; card.state = 'running' }
        else if (evt.type === 'agent.status') { card.state = evt.payload.state; card.detail = evt.payload.detail ?? '' }
        else if (evt.type === 'tool.call') card.lastTool = evt.payload.tool
        else if (evt.type === 'tool.result') card.lastTool = `${evt.payload.tool} ${evt.payload.ok ? '✓' : '✗'}`
        else return prev
        return { ...prev, [evt.agent_id]: card }
      })
    })
    const offStatus = window.jarvis.onCoreStatus(({ online }) => setCoreOnline(online))
    return () => { off(); offStatus() }
  }, [])

  async function launchMission(e) {
    e.preventDefault()
    const prompt = newMission.trim()
    if (!prompt) return
    setNewMission('')
    try {
      const mission = await window.jarvis.coreCreateMission(prompt)
      await refreshMissions()
      selectMission(mission.id)
    } catch { setCoreOnline(false) }
  }

  const selected = missions.find(m => m.id === selectedId)

  return (
    <div style={styles.missionsContainer}>
      <div style={styles.missionListPane}>
        <form style={{ display: 'flex', gap: 6 }} onSubmit={launchMission}>
          <input
            style={{ ...styles.input, fontSize: 12 }}
            value={newMission}
            onChange={e => setNewMission(e.target.value)}
            placeholder={coreOnline ? 'New mission…' : 'Core offline'}
            disabled={!coreOnline}
          />
          <button style={styles.sendBtn} type="submit" disabled={!coreOnline}>Go</button>
        </form>
        <div style={styles.missionList}>
          {missions.map(m => (
            <div
              key={m.id}
              style={{ ...styles.missionRow, ...(m.id === selectedId ? styles.missionRowActive : {}) }}
              onClick={() => selectMission(m.id)}
            >
              <span style={styles.missionTitle}>{m.title}</span>
              <span style={{ ...styles.missionStatus, color: MISSION_STATUS_COLORS[m.status] ?? '#888' }}>
                {m.status.replace('_', ' ')}
              </span>
            </div>
          ))}
          {missions.length === 0 && (
            <span style={styles.emptyHint}>
              {coreOnline ? 'No missions yet. Launch one above.' : 'Jarvis Core is offline.'}
            </span>
          )}
        </div>

        <div style={styles.schedulesBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
              Schedules
            </span>
            <button
              style={styles.scheduleToggle}
              disabled={!coreOnline}
              onClick={() => { setSchedError(''); setSchedForm(schedForm ? null : { name: '', cron_expr: '', prompt: '', mode: 'mission' }) }}
            >
              {schedForm ? 'cancel' : '+ new'}
            </button>
          </div>
          {schedForm && (
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
              onSubmit={e => {
                e.preventDefault()
                const { id, ...body } = schedForm
                saveSchedule(body, id)
              }}
            >
              <input style={{ ...styles.input, fontSize: 11, padding: '4px 8px' }} placeholder="Name"
                value={schedForm.name} onChange={e => setSchedForm({ ...schedForm, name: e.target.value })} required />
              <input style={{ ...styles.input, fontSize: 11, padding: '4px 8px', fontFamily: 'monospace' }} placeholder="Cron (e.g. 0 7 * * *)"
                value={schedForm.cron_expr} onChange={e => setSchedForm({ ...schedForm, cron_expr: e.target.value })} required />
              <textarea style={{ ...styles.input, fontSize: 11, padding: '4px 8px', resize: 'vertical', minHeight: 36 }} placeholder="Prompt"
                value={schedForm.prompt} onChange={e => setSchedForm({ ...schedForm, prompt: e.target.value })} required />
              <div style={{ display: 'flex', gap: 4 }}>
                <select
                  style={{ ...styles.input, fontSize: 11, padding: '4px 8px', flex: 1 }}
                  value={schedForm.mode}
                  onChange={e => setSchedForm({ ...schedForm, mode: e.target.value })}
                >
                  <option value="mission">mission</option>
                  <option value="chat">chat</option>
                  <option value="research">research</option>
                </select>
                <button style={{ ...styles.sendBtn, fontSize: 11, padding: '4px 10px' }} type="submit">
                  {schedForm.id ? 'Save' : 'Create'}
                </button>
              </div>
              {schedError && <span style={{ fontSize: 10, color: '#ef5350' }}>{schedError}</span>}
            </form>
          )}
          <div style={styles.scheduleList}>
            {schedules.map(s => (
              <div key={s.id} style={styles.scheduleRow}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' }}>
                  <span style={styles.missionTitle}>{s.name}</span>
                  <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>{s.cron_expr} · {s.mode}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                  <button
                    style={styles.scheduleIconBtn} title="Edit" disabled={!coreOnline}
                    onClick={() => { setSchedError(''); setSchedForm({ id: s.id, name: s.name, cron_expr: s.cron_expr, prompt: s.prompt, mode: s.mode }) }}
                  >✎</button>
                  <button
                    style={styles.scheduleIconBtn} title="Delete" disabled={!coreOnline}
                    onClick={() => deleteSchedule(s)}
                  >✕</button>
                  <button
                    style={{ ...styles.scheduleToggle, ...(s.enabled ? styles.scheduleToggleOn : {}) }}
                    onClick={() => toggleSchedule(s)}
                    disabled={!coreOnline}
                  >
                    {s.enabled ? 'on' : 'off'}
                  </button>
                </div>
              </div>
            ))}
            {schedules.length === 0 && !schedForm && (
              <span style={styles.emptyHint}>No schedules configured.</span>
            )}
          </div>
        </div>
      </div>

      <div style={styles.missionDetailPane}>
        {!selected && <span style={styles.emptyHint}>Select a mission to view the fleet.</span>}
        {selected && (
          <div style={styles.missionDetailScroll}>
            <div style={styles.fleetHeader}>
              <span style={{ fontSize: 13, color: '#aaa' }}>{selected.title}</span>
              <span style={{ ...styles.missionStatus, color: MISSION_STATUS_COLORS[selected.status] ?? '#888' }}>
                {selected.status.replace('_', ' ')}
              </span>
            </div>
            {selected.plan && (
              <div style={styles.planBox}>
                {selected.plan.stages.map((stage, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#888' }}>
                    stage {i + 1}: {stage.map(t => t.role).join(' + ')}
                  </div>
                ))}
              </div>
            )}
            <div style={styles.fleetGrid}>
              {Object.entries(agents).map(([id, card]) => (
                <div key={id} style={styles.agentCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...styles.dot, background: AGENT_STATE_COLORS[card.state] ?? '#888' }} />
                    <span style={styles.agentName}>{id}</span>
                  </div>
                  <span style={styles.agentDetail}>{card.lastTool || card.state}</span>
                  {card.detail && <span style={styles.agentDetail}>{card.detail.slice(0, 80)}</span>}
                </div>
              ))}
              {Object.keys(agents).length === 0 && selected.status !== 'completed' && (
                <span style={styles.emptyHint}>Fleet not deployed yet.</span>
              )}
            </div>
            {sitrep && (
              <div style={styles.sitrepBox}>
                <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Sitrep</span>
                <span style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{sitrep}</span>
              </div>
            )}
          </div>
        )}
        <div style={styles.tickerBox}>
          {ticker.slice(-12).map(e => (
            <div key={e.id} style={styles.tickerRow}>
              <span style={{ color: '#555' }}>{new Date(e.ts).toLocaleTimeString()}</span>
              {' '}<span style={{ color: '#4fc3f7' }}>{e.agent_id ?? 'core'}</span>
              {' '}<span style={{ color: '#888' }}>{e.type}</span>
              {' '}<span style={{ color: '#666' }}>{JSON.stringify(e.payload).slice(0, 70)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilesTab({ files, currentDir, onNavigate, config }) {
  const root = config?.sandbox?.root ?? 'C:\\jarvis\\'

  return (
    <div style={styles.filesContainer}>
      <div style={styles.breadcrumb}>
        <button style={styles.crumbBtn} onClick={() => onNavigate('')}>{root}</button>
        {currentDir && currentDir.split('/').filter(Boolean).map((seg, i, arr) => (
          <span key={i}>
            {' / '}
            <button style={styles.crumbBtn} onClick={() => onNavigate(arr.slice(0, i + 1).join('/'))}>
              {seg}
            </button>
          </span>
        ))}
      </div>
      <div style={styles.fileList}>
        {currentDir && (
          <div style={styles.fileRow} onClick={() => {
            const parent = currentDir.split('/').slice(0, -1).join('/')
            onNavigate(parent)
          }}>
            <span style={styles.fileIcon}>📁</span>
            <span style={styles.fileName}>..</span>
          </div>
        )}
        {files.map(f => (
          <div key={f.path} style={styles.fileRow} onClick={() => f.isDirectory && onNavigate(f.path)}>
            <span style={styles.fileIcon}>{f.isDirectory ? '📁' : '📄'}</span>
            <span style={styles.fileName}>{f.name}</span>
            {!f.isDirectory && <span style={styles.fileSize}>{formatBytes(f.size)}</span>}
          </div>
        ))}
        {files.length === 0 && <span style={styles.emptyHint}>Empty directory</span>}
      </div>
    </div>
  )
}

function IntegrationsTab({ config }) {
  const integrations = config?.integrations ?? {}
  const currentModel = config?.llm?.model ?? ''

  const [newKey, setNewKey] = useState('')
  const [keyStatus, setKeyStatus] = useState('')
  const [showKey, setShowKey] = useState(false)

  const [models, setModels] = useState(null)   // null = not loaded yet
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [modelSaveStatus, setModelSaveStatus] = useState('')

  // Keep selectedModel in sync when config refreshes
  useEffect(() => {
    if (currentModel && !selectedModel) setSelectedModel(currentModel)
  }, [currentModel])

  async function handleSaveKey(e) {
    e.preventDefault()
    const trimmed = newKey.trim()
    if (!trimmed) return
    try {
      await window.jarvis.saveCredential('nvidia_api_key', trimmed)
      setKeyStatus('✓ Saved')
      setNewKey('')
      setModels(null) // reset model list so it re-fetches with new key
      setTimeout(() => setKeyStatus(''), 3000)
    } catch (err) {
      setKeyStatus(`Error: ${err.message}`)
    }
  }

  async function handleBrowseModels() {
    setLoadingModels(true)
    setModelError('')
    try {
      const list = await window.jarvis.listModels()
      setModels(list.sort())
    } catch (err) {
      setModelError(`Failed to load models: ${err.message}`)
    } finally {
      setLoadingModels(false)
    }
  }

  async function handleSetModel() {
    if (!selectedModel) return
    try {
      await window.jarvis.setModel(selectedModel)
      setModelSaveStatus(`✓ Active`)
      setTimeout(() => setModelSaveStatus(''), 4000)
      // Config refresh comes via onConfigUpdated broadcast — no manual call needed
    } catch (err) {
      setModelSaveStatus(`Error: ${err.message}`)
    }
  }

  return (
    <div style={styles.integrationsContainer}>

      {/* ── LLM Model ─────────────────────────────────────────────── */}
      <div style={styles.credSection}>
        <span style={styles.credTitle}>LLM Model</span>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
          Current: <span style={{ color: '#4fc3f7', fontFamily: 'monospace' }}>{currentModel || '(none)'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={styles.sendBtn} onClick={handleBrowseModels} disabled={loadingModels}>
            {loadingModels ? 'Loading…' : 'Browse available models'}
          </button>
        </div>
        {modelError && <span style={{ fontSize: 12, color: '#ef5350' }}>{modelError}</span>}
        {models && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <select
              style={{ ...styles.input, fontSize: 12, fontFamily: 'monospace' }}
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              size={Math.min(models.length, 8)}
            >
              {models.map(m => (
                <option key={m} value={m} style={{ background: '#1a1a24', color: '#e0e0e0' }}>{m}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={styles.sendBtn} onClick={handleSetModel} disabled={!selectedModel}>
                Use selected model
              </button>
              {modelSaveStatus && (
                <span style={{ fontSize: 12, color: modelSaveStatus.startsWith('✓') ? '#81c784' : '#ef5350' }}>
                  {modelSaveStatus}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── API Key ───────────────────────────────────────────────── */}
      <div style={{ ...styles.credSection, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <span style={styles.credTitle}>NVIDIA API Key</span>
        <form style={styles.credForm} onSubmit={handleSaveKey}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              style={{ ...styles.input, fontFamily: 'monospace', fontSize: 12, paddingRight: 32 }}
              type={showKey ? 'text' : 'password'}
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="Enter new key to replace current…"
            />
            <button type="button" style={styles.toggleShow} onClick={() => setShowKey(v => !v)} tabIndex={-1}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <button style={styles.sendBtn} type="submit" disabled={!newKey.trim()}>Update key</button>
          {keyStatus && <span style={{ fontSize: 12, color: keyStatus.startsWith('✓') ? '#81c784' : '#ef5350' }}>{keyStatus}</span>}
        </form>
      </div>

      {/* ── Other integrations ────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        {Object.entries(integrations).map(([name, cfg]) => (
          <div key={name} style={styles.integrationRow}>
            <span style={{ ...styles.integDot, background: cfg.enabled ? '#81c784' : '#555' }} />
            <span style={styles.integName}>{name}</span>
            <span style={styles.integStatus}>{cfg.enabled ? 'Enabled' : 'Disabled (Phase 2+)'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tools tab — a growing repository of utilities (scaffold) ───────────────
// Each entry is a self-contained utility. Wired tools set `run`; the rest are
// placeholders we'll build out tool-by-tool.
const TOOLS = [
  { icon: '📄', name: 'Edit PDF', desc: 'Merge, split, rotate, watermark, fill forms', status: 'planned' },
  { icon: '🎵', name: 'Download MP3', desc: 'Pull audio from a URL into your sandbox', status: 'planned' },
  { icon: '🎬', name: 'YouTube → MP3', desc: 'Extract audio from a video link', status: 'planned' },
  { icon: '🖼️', name: 'Convert image', desc: 'PNG/JPG/WebP, resize and compress', status: 'planned' },
  { icon: '📝', name: 'Transcribe audio', desc: 'Speech-to-text on a local file', status: 'planned' },
  { icon: '🗜️', name: 'Compress files', desc: 'Zip a folder or shrink a PDF', status: 'planned' },
]

function ToolsTab() {
  return (
    <div style={styles.toolsContainer}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
        Your toolbox — small utilities that run against the sandbox. This grows over time.
      </div>
      <div style={styles.toolGrid}>
        {TOOLS.map(t => (
          <div key={t.name} style={styles.toolCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.name}</span>
              <span style={styles.toolStatus}>{t.status === 'ready' ? 'Ready' : 'Planned'}</span>
            </div>
            <span style={styles.toolDesc}>{t.desc}</span>
            <button
              style={{ ...styles.sendBtn, fontSize: 12, alignSelf: 'flex-start', opacity: t.run ? 1 : 0.45 }}
              disabled={!t.run}
              onClick={() => t.run?.()}
            >
              {t.run ? 'Open' : 'Coming soon'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionLogTab({ entries, search, onSearch }) {
  return (
    <div style={styles.logContainer}>
      <input
        style={{ ...styles.input, marginBottom: 8 }}
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search log…"
      />
      <div style={styles.logList}>
        {entries.map(e => (
          <div key={e.id} style={styles.logRow}>
            <span style={styles.logTime}>{new Date(e.timestamp).toLocaleTimeString()}</span>
            <span style={styles.logIntent}>{e.intent}</span>
            <span style={styles.logAction}>{e.action_type}</span>
            <span style={styles.logTarget}>{e.target ?? '—'}</span>
            <span style={styles.logResult}>{e.result?.slice(0, 60) ?? ''}</span>
          </div>
        ))}
        {entries.length === 0 && <span style={styles.emptyHint}>No log entries yet.</span>}
      </div>
    </div>
  )
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const STATE_COLORS = { idle: '#555', listening: '#4fc3f7', processing: '#ffb74d', speaking: '#81c784' }

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#111318', color: '#e0e0e0', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 600, color: '#4fc3f7' },
  sandboxPath: { fontSize: 11, color: '#555', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  stateLabel: { fontSize: 11, color: '#888' },
  tabBar: { display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 },
  tab: { flex: 1, padding: '8px', background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: 13, transition: 'color 0.2s' },
  tabActive: { color: '#4fc3f7', borderBottom: '2px solid #4fc3f7' },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },

  conversationContainer: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 12 },
  messageList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  message: { display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', borderRadius: 8, maxWidth: '80%' },
  userMsg: { alignSelf: 'flex-end', background: 'rgba(79,195,247,0.12)', borderLeft: '2px solid #4fc3f7' },
  assistantMsg: { alignSelf: 'flex-start', background: 'rgba(255,255,255,0.04)' },
  msgRole: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  msgText: { fontSize: 14, lineHeight: 1.5 },
  intentBadge: { fontSize: 9, color: '#555', alignSelf: 'flex-end', marginTop: 2 },
  emptyHint: { color: '#555', fontSize: 13, textAlign: 'center', marginTop: 40 },
  inputRow: { display: 'flex', gap: 8 },
  input: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e0e0e0', fontSize: 14, padding: '8px 12px', outline: 'none' },
  sendBtn: { background: 'rgba(79,195,247,0.15)', border: '1px solid rgba(79,195,247,0.3)', borderRadius: 8, color: '#4fc3f7', cursor: 'pointer', padding: '8px 16px', fontSize: 13 },

  missionsContainer: { display: 'flex', height: '100%', overflow: 'hidden' },
  missionListPane: { width: 230, borderRight: '1px solid rgba(255,255,255,0.07)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 },
  missionList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  missionRow: { display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: 'rgba(255,255,255,0.03)' },
  missionRowActive: { background: 'rgba(79,195,247,0.1)', borderLeft: '2px solid #4fc3f7' },
  missionTitle: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  missionStatus: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  missionDetailPane: { flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' },
  missionDetailScroll: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 },
  fleetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  planBox: { display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 },
  fleetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 },
  agentCard: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' },
  agentName: { fontSize: 12, fontWeight: 600, color: '#cfd8dc' },
  agentDetail: { fontSize: 10, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sitrepBox: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px', background: 'rgba(129,199,132,0.07)', borderLeft: '2px solid #81c784', borderRadius: 6 },
  tickerBox: { marginTop: 'auto', maxHeight: 130, overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6, flexShrink: 0 },
  tickerRow: { fontSize: 10, fontFamily: 'monospace', lineHeight: 1.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  schedulesBox: { display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, flexShrink: 0, maxHeight: 280 },
  scheduleIconBtn: { fontSize: 11, padding: '2px 6px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', cursor: 'pointer' },
  scheduleList: { display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' },
  scheduleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' },
  scheduleToggle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', cursor: 'pointer', flexShrink: 0 },
  scheduleToggleOn: { color: '#81c784', borderColor: 'rgba(129,199,132,0.4)', background: 'rgba(129,199,132,0.08)' },

  filesContainer: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 8 },
  breadcrumb: { fontSize: 12, color: '#888', flexShrink: 0 },
  crumbBtn: { background: 'none', border: 'none', color: '#4fc3f7', cursor: 'pointer', fontSize: 12 },
  fileList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  fileRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', ':hover': { background: 'rgba(255,255,255,0.05)' } },
  fileIcon: { fontSize: 14 },
  fileName: { flex: 1, fontSize: 13 },
  fileSize: { fontSize: 11, color: '#666' },

  integrationsContainer: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' },
  credSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  credTitle: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  credForm: { display: 'flex', flexDirection: 'column', gap: 8 },
  toggleShow: { position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 },
  integrationRow: { display: 'flex', alignItems: 'center', gap: 10 },
  integDot: { width: 10, height: 10, borderRadius: '50%' },
  integName: { width: 120, fontSize: 14, textTransform: 'capitalize' },
  integStatus: { fontSize: 12, color: '#666' },

  toolsContainer: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 10, overflowY: 'auto' },
  toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 },
  toolCard: { display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' },
  toolStatus: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#888', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '2px 6px' },
  toolDesc: { fontSize: 12, color: '#888', lineHeight: 1.4 },

  logContainer: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16 },
  logList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  logRow: { display: 'grid', gridTemplateColumns: '70px 90px 110px 140px 1fr', gap: 8, padding: '5px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 },
  logTime: { color: '#666' },
  logIntent: { color: '#ffb74d' },
  logAction: { color: '#aaa' },
  logTarget: { color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logResult: { color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
}
