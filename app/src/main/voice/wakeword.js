import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

// openWakeWord runs as a Python subprocess.
// Setup: pip install openwakeword pyaudio
// The Python script listens to the microphone continuously and prints "WAKE" to stdout
// when the configured wake word is detected.
//
// Model: place a custom .tflite or .onnx wakeword model in resources/openwakeword/
// or use one of the pre-trained models bundled with openWakeWord.

const WAKEWORD_SCRIPT = join(process.cwd(), 'resources', 'openwakeword', 'listener.py')

let proc = null
let onWakeCallback = null

export function startWakeWordListener(onWake) {
  if (!existsSync(WAKEWORD_SCRIPT)) {
    console.warn('openWakeWord listener.py not found. Wake word detection disabled. Use Ctrl+Shift+Space to activate.')
    return
  }

  onWakeCallback = onWake
  proc = spawn('python', [WAKEWORD_SCRIPT], { stdio: ['ignore', 'pipe', 'pipe'] })

  proc.stdout.on('data', data => {
    const lines = data.toString().trim().split('\n')
    for (const line of lines) {
      if (line.trim() === 'WAKE') {
        onWakeCallback?.()
      }
    }
  })

  proc.stderr.on('data', data => {
    const msg = data.toString().trim()
    if (!msg) return
    // code=0 exit prints an INFO message — don't treat as error
    if (msg.startsWith('INFO:')) {
      console.log('openWakeWord:', msg)
    } else if (msg.toLowerCase().includes('error')) {
      console.error('openWakeWord error:', msg)
    }
  })

  proc.on('exit', (code, signal) => {
    if (signal !== 'SIGTERM' && code !== 0) {
      console.warn(`openWakeWord process exited unexpectedly (code=${code}). Wake word detection stopped.`)
    }
    proc = null
  })
}

export function stopWakeWordListener() {
  if (proc) {
    proc.kill('SIGTERM')
    proc = null
  }
}
