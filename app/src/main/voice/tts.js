import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'

// Piper binary location — download piper.exe + voice model and place in resources/piper/
// Releases: https://github.com/rhasspy/piper/releases
// Voice models: https://huggingface.co/rhasspy/piper-voices
// Default voice: en_US-lessac-medium (.onnx + .json)

// In dev mode process.resourcesPath points inside node_modules/electron/dist — use cwd instead
const PIPER_DIR = join(
  process.env.NODE_ENV === 'development' ? process.cwd() : (process.resourcesPath ?? process.cwd()),
  'resources', 'piper'
)
const PIPER_EXE = join(PIPER_DIR, 'piper.exe')

let voiceModelPath = null
let ttsConfig = null

export function initTTS(config) {
  ttsConfig = config.tts
  const voiceName = config.tts.voice ?? 'en_US-lessac-medium'
  voiceModelPath = join(PIPER_DIR, 'voices', `${voiceName}.onnx`)

  if (!existsSync(PIPER_EXE)) {
    console.warn(`Piper not found at ${PIPER_EXE}. Run the setup script to download it.`)
  }
  if (!existsSync(voiceModelPath)) {
    console.warn(`Piper voice model not found at ${voiceModelPath}. Run the setup script.`)
  }
}

// Returns a Buffer containing WAV audio data, or null if Piper is not set up
export function synthesize(text) {
  return new Promise((resolve, reject) => {
    if (!existsSync(PIPER_EXE) || !voiceModelPath || !existsSync(voiceModelPath)) {
      resolve(null) // TTS not available yet — caller falls back to text-only
      return
    }

    const chunks = []
    const proc = spawn(PIPER_EXE, [
      '--model', voiceModelPath,
      '--output_raw'
    ])

    proc.stdout.on('data', chunk => chunks.push(chunk))
    proc.stderr.on('data', () => {}) // suppress piper stderr noise
    proc.on('error', reject)
    proc.on('close', code => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`Piper exited with code ${code}`))
      } else {
        resolve(Buffer.concat(chunks))
      }
    })

    proc.stdin.write(text)
    proc.stdin.end()
  })
}

// Returns base64-encoded raw PCM audio (16-bit, 22050Hz, mono) for the renderer to play
export async function speakText(text) {
  const audioBuffer = await synthesize(text)
  if (!audioBuffer) return null
  return audioBuffer.toString('base64')
}
