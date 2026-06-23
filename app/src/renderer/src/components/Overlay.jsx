import { useState, useEffect, useRef } from 'react'

const STATE_LABELS = {
  idle: 'Ready',
  listening: 'Listening…',
  processing: 'Thinking…',
  speaking: 'Speaking…'
}

const STATE_COLORS = {
  idle: '#555',
  listening: '#4fc3f7',
  processing: '#ffb74d',
  speaking: '#81c784'
}

export default function Overlay({ agentState, lastResponse, lastTranscript }) {
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Activate listen when main process fires the wake word or shortcut
  useEffect(() => {
    const off = window.jarvis.onActivateListen(() => startRecording())
    return off
  }, [])

  async function startRecording() {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      audioChunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        const transcript = await window.jarvis.transcribeAudio(base64)
        if (transcript?.trim()) {
          await window.jarvis.sendMessage(transcript)
        }
        setIsRecording(false)
      }

      recorder.start()
      setIsRecording(true)

      // Auto-stop on silence: stop after 8 seconds max, or user clicks stop
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 8000)
    } catch (err) {
      console.error('Mic error:', err)
      setIsRecording(false)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  async function handleTextSubmit(e) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    await window.jarvis.sendMessage(text)
  }

  const dotColor = STATE_COLORS[agentState] ?? '#555'
  const label = STATE_LABELS[agentState] ?? agentState

  return (
    <div style={styles.container}>
      {/* State indicator row */}
      <div style={styles.header}>
        <span style={{ ...styles.dot, background: dotColor }} />
        <span style={styles.stateLabel}>{label}</span>
        <button style={styles.expandBtn} onClick={() => window.jarvis.openExpanded()} title="Open Jarvis">
          Open ↗
        </button>
      </div>

      {/* Last response or transcript */}
      <div style={styles.responseArea}>
        {agentState === 'listening' && lastTranscript
          ? <span style={styles.transcript}>{lastTranscript}</span>
          : <span style={styles.responseText}>{lastResponse?.text ?? 'Say "Hey Jarvis" or press Ctrl+Shift+Space'}</span>
        }
      </div>

      {/* Text input fallback */}
      <form onSubmit={handleTextSubmit} style={styles.inputRow}>
        <input
          style={styles.input}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type a message…"
          disabled={agentState === 'processing'}
        />
        {isRecording
          ? <button type="button" style={{ ...styles.micBtn, background: '#ef5350' }} onClick={stopRecording}>■</button>
          : <button type="button" style={styles.micBtn} onClick={startRecording} disabled={agentState !== 'idle'}>🎤</button>
        }
      </form>
    </div>
  )
}

const styles = {
  container: {
    width: 380,
    height: 120,
    background: 'rgba(18, 18, 24, 0.92)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 12px 6px',
    gap: 4,
    userSelect: 'none',
    WebkitAppRegion: 'drag'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    WebkitAppRegion: 'no-drag'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 0.3s'
  },
  stateLabel: {
    fontSize: 11,
    color: '#aaa',
    flex: 1
  },
  expandBtn: {
    background: 'rgba(79,195,247,0.12)',
    border: '1px solid rgba(79,195,247,0.25)',
    borderRadius: 5,
    color: '#4fc3f7',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 7px',
    lineHeight: 1.4,
    flexShrink: 0
  },
  responseArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden'
  },
  responseText: {
    fontSize: 13,
    color: '#ccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    WebkitAppRegion: 'no-drag'
  },
  transcript: {
    fontSize: 13,
    color: '#4fc3f7',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontStyle: 'italic'
  },
  inputRow: {
    display: 'flex',
    gap: 4,
    WebkitAppRegion: 'no-drag'
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 12,
    padding: '3px 8px',
    outline: 'none'
  },
  micBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#e0e0e0',
    cursor: 'pointer',
    width: 28,
    fontSize: 13,
    transition: 'background 0.2s'
  }
}
