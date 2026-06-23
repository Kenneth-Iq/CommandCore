import { useState, useEffect } from 'react'

export default function ConfirmationDialog() {
  const [pending, setPending] = useState(null)

  useEffect(() => {
    const off = window.jarvis.onConfirmationRequest(data => setPending(data))
    return off
  }, [])

  if (!pending) return null

  function respond(confirmed) {
    window.jarvis.confirmationResponse(pending.id, confirmed)
    setPending(null)
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.dialog}>
        <div style={styles.icon}>{pending.requireDouble || pending.isSecondConfirm ? '⚠️' : '❓'}</div>
        <div style={styles.action}>{pending.action}</div>
        <div style={styles.description}>{pending.description}</div>
        {pending.isSecondConfirm && (
          <div style={styles.warning}>This action cannot be undone. Are you sure?</div>
        )}
        <div style={styles.buttons}>
          <button style={styles.cancelBtn} onClick={() => respond(false)}>Cancel</button>
          <button style={styles.confirmBtn} onClick={() => respond(true)}>
            {pending.isSecondConfirm ? 'Yes, proceed' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999
  },
  dialog: {
    width: 400, background: '#1a1a24',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14, padding: '24px 28px',
    display: 'flex', flexDirection: 'column', gap: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#e0e0e0'
  },
  icon:        { fontSize: 28, textAlign: 'center' },
  action:      { fontSize: 15, fontWeight: 600, color: '#fff', textAlign: 'center' },
  description: { fontSize: 13, color: '#aaa', lineHeight: 1.5, textAlign: 'center' },
  warning:     { fontSize: 12, color: '#ef5350', textAlign: 'center', padding: '6px 0' },
  buttons:     { display: 'flex', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#aaa', fontSize: 13
  },
  confirmBtn: {
    flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
    background: 'rgba(79,195,247,0.2)', border: '1px solid rgba(79,195,247,0.4)',
    color: '#4fc3f7', fontSize: 13, fontWeight: 600
  }
}
