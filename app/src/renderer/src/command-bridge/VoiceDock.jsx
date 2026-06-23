import { useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore.js'
import { Mic } from 'lucide-react'

export default function VoiceDock() {
  const { voiceState, transcript, coreOnline } = useJarvisStore()
  const [text, setText] = useState('')
  const active = voiceState === 'listening' || voiceState === 'speaking'

  async function send(e) {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    setText('')
    try { await window.jarvis.sendMessage(msg) } catch { /* offline */ }
  }

  function pushToTalk() {
    try { window.jarvis.startListen() } catch { /* noop */ }
  }

  return (
    <form className="cb-dock cb-panel" onSubmit={send}>
      <div className="cb-voice-state">
        <div className={`cb-wave ${active ? 'active' : ''}`}>
          <span /><span /><span /><span />
        </div>
        {voiceState}
      </div>
      <input value={text} onChange={e => setText(e.target.value)}
        placeholder={transcript ? `heard: "${transcript}"` : 'Type a command for Jarvis…'} />
      <button type="button" className="cb-ptt" onClick={pushToTalk} title="Push to talk">
        <Mic size={16} />
      </button>
    </form>
  )
}
