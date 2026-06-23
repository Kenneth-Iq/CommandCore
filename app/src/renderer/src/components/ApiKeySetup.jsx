import { useState } from 'react'

export default function ApiKeySetup({ onSaved }) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) { setError('Key cannot be empty'); return }
    if (!trimmed.startsWith('nvapi-')) { setError('NVIDIA API keys start with "nvapi-"'); return }

    setSaving(true)
    setError('')
    try {
      await window.jarvis.saveCredential('nvidia_api_key', trimmed)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logo}>⬡</span>
          <span style={styles.title}>Jarvis Setup</span>
        </div>

        <p style={styles.body}>
          Enter your NVIDIA API key to get started. Get a free key at{' '}
          <span style={styles.link}>build.nvidia.com</span>.
        </p>

        <p style={styles.secNote}>
          🔒 Stored encrypted using Windows DPAPI — only readable by your user account.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="nvapi-xxxxxxxxxxxxxxxxxxxx"
              autoFocus
              spellCheck={false}
            />
            <button
              type="button"
              style={styles.toggleBtn}
              onClick={() => setShowKey(v => !v)}
              tabIndex={-1}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.saveBtn} type="submit" disabled={saving || !key.trim()}>
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(12, 12, 18, 0.97)'
  },
  card: {
    width: 420,
    padding: '32px 28px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    fontSize: 28,
    color: '#4fc3f7'
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff'
  },
  body: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 1.6
  },
  link: {
    color: '#4fc3f7',
    textDecoration: 'underline',
    cursor: 'pointer'
  },
  secNote: {
    fontSize: 12,
    color: '#666',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '8px 12px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#e0e0e0',
    fontSize: 14,
    padding: '10px 40px 10px 14px',
    outline: 'none',
    fontFamily: 'monospace',
    letterSpacing: '0.05em'
  },
  toggleBtn: {
    position: 'absolute',
    right: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
    lineHeight: 1
  },
  error: {
    fontSize: 12,
    color: '#ef5350',
    margin: 0
  },
  saveBtn: {
    background: 'rgba(79,195,247,0.2)',
    border: '1px solid rgba(79,195,247,0.4)',
    borderRadius: 10,
    color: '#4fc3f7',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    padding: '10px',
    transition: 'background 0.2s',
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
  }
}
