import { initTTS, speakText } from './tts.js'
import { initSTT, transcribeAudio } from './stt.js'
import { startWakeWordListener, stopWakeWordListener } from './wakeword.js'
import { handleMessage } from '../ipc.js'

let pipelineConfig = null
let broadcastFn = null

// States: idle | listening | processing | speaking
let state = 'idle'

function setState(next) {
  state = next
  broadcastFn?.('jarvis:state-change', { state })
}

export async function startVoicePipeline({ config, broadcastToAll }) {
  pipelineConfig = config
  broadcastFn = broadcastToAll

  initSTT(config)
  initTTS(config)

  // Start wake word listener — fires broadcastToAll('jarvis:activate-listen') on detection
  startWakeWordListener(() => {
    broadcastFn?.('jarvis:activate-listen')
    setState('listening')
  })

  setState('idle')
}

export function stopVoicePipeline() {
  stopWakeWordListener()
}

// Called when the renderer finishes recording and sends audio data
export async function processAudioInput(audioBase64) {
  if (state !== 'listening') return

  setState('processing')

  try {
    const transcript = await transcribeAudio(audioBase64, pipelineConfig)

    if (!transcript?.trim()) {
      broadcastFn?.('jarvis:transcription', { text: '' })
      setState('idle')
      return
    }

    broadcastFn?.('jarvis:transcription', { text: transcript })

    const result = await handleMessage(transcript, {
      broadcastToAll: broadcastFn,
      config: pipelineConfig
    })

    if (result?.text) {
      setState('speaking')
      const audioBase64Out = await speakText(result.text)
      if (audioBase64Out) {
        broadcastFn?.('jarvis:speak', { audioBase64: audioBase64Out })
      } else {
        // Piper not set up yet — UI displays text only
        setState('idle')
      }
    } else {
      setState('idle')
    }
  } catch (err) {
    console.error('Voice pipeline error:', err)
    broadcastFn?.('jarvis:response', { text: `Pipeline error: ${err.message}`, intent: 'ERROR' })
    setState('idle')
  }
}

// Called from the keyboard shortcut (main/index.js)
export function startListening({ config, broadcastToAll }) {
  if (state === 'idle') {
    pipelineConfig = config
    broadcastFn = broadcastToAll
    setState('listening')
    broadcastFn?.('jarvis:activate-listen')
  }
}

export function onSpeakComplete() {
  setState('idle')
}
