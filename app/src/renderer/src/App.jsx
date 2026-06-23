import { useState, useEffect } from 'react'
import Overlay from './components/Overlay.jsx'
import ExpandedPanel from './components/ExpandedPanel.jsx'
import ApiKeySetup from './components/ApiKeySetup.jsx'
import ConfirmationDialog from './components/ConfirmationDialog.jsx'

// Determine which view to render based on the query param set by the main process
const params = new URLSearchParams(window.location.search)
const VIEW = params.get('view') ?? 'overlay'

export default function App() {
  const [agentState, setAgentState] = useState('idle') // idle | listening | processing | speaking
  const [lastResponse, setLastResponse] = useState(null)
  const [lastTranscript, setLastTranscript] = useState('')
  const [needsApiKey, setNeedsApiKey] = useState(null) // null = checking

  // Check whether the API key is stored before rendering the main UI
  useEffect(() => {
    window.jarvis.hasCredential('nvidia_api_key').then(has => setNeedsApiKey(!has))
  }, [])

  useEffect(() => {
    const offState = window.jarvis.onStateChange(({ state }) => setAgentState(state))
    const offResponse = window.jarvis.onResponse(({ text, intent }) => {
      setLastResponse({ text, intent })
    })
    const offTranscript = window.jarvis.onTranscription(({ text }) => setLastTranscript(text))

    // Play TTS audio when main process sends PCM data
    const offSpeak = window.jarvis.onSpeak(async ({ audioBase64 }) => {
      const pcm = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
      await playPCM(pcm)
      // Notify main that speaking is done so state can return to idle
      // (no direct call available — state managed by main after TTS completes)
    })

    return () => { offState(); offResponse(); offTranscript(); offSpeak() }
  }, [])

  if (needsApiKey === null) return null // still checking

  // Expanded panel: show full setup form if key is missing
  if (VIEW === 'expanded') {
    if (needsApiKey) return <ApiKeySetup onSaved={() => setNeedsApiKey(false)} />
    return (
      <>
        <ExpandedPanel agentState={agentState} lastResponse={lastResponse} lastTranscript={lastTranscript} />
        <ConfirmationDialog />
      </>
    )
  }

  // Overlay: if key is missing, show a compact nudge — the full form is in the expanded panel
  if (needsApiKey) {
    return (
      <div style={setupNudgeStyles.container}>
        <span style={setupNudgeStyles.icon}>⬡</span>
        <span style={setupNudgeStyles.text}>API key required</span>
        <button
          style={setupNudgeStyles.btn}
          onClick={() => window.jarvis.openExpanded()}
        >
          Set up →
        </button>
      </div>
    )
  }

  return (
    <Overlay
      agentState={agentState}
      lastResponse={lastResponse}
      lastTranscript={lastTranscript}
    />
  )
}

const setupNudgeStyles = {
  container: {
    width: 380,
    height: 120,
    background: 'rgba(18, 18, 24, 0.92)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(79,195,247,0.25)',
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif"
  },
  icon: { fontSize: 22, color: '#4fc3f7' },
  text: { fontSize: 13, color: '#aaa', flex: 1 },
  btn: {
    background: 'rgba(79,195,247,0.15)',
    border: '1px solid rgba(79,195,247,0.35)',
    borderRadius: 8,
    color: '#4fc3f7',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 14px'
  }
}

// Play raw PCM (16-bit signed, 22050 Hz, mono) via Web Audio API
async function playPCM(pcmData) {
  const audioCtx = new AudioContext({ sampleRate: 22050 })
  const samples = pcmData.length / 2
  const buffer = audioCtx.createBuffer(1, samples, 22050)
  const channel = buffer.getChannelData(0)

  const view = new DataView(pcmData.buffer)
  for (let i = 0; i < samples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768
  }

  const src = audioCtx.createBufferSource()
  src.buffer = buffer
  src.connect(audioCtx.destination)
  src.start()

  return new Promise(resolve => {
    src.onended = () => { audioCtx.close(); resolve() }
  })
}
