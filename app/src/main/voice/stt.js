import OpenAI from 'openai'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadCredential } from '../credentials.js'

// NVIDIA NIM ASR uses an OpenAI-compatible audio transcription endpoint.
// Endpoint: POST https://integrate.api.nvidia.com/v1/audio/transcriptions
// Verify the exact path against https://build.nvidia.com/nvidia/nemotron-asr-streaming
// at Phase 1 setup — update base_url in jarvis.yaml if needed.

let sttClient = null

export function initSTT(config) {
  const apiKey = loadCredential('nvidia_api_key')
  if (!apiKey) throw new Error('NVIDIA API key not set')

  sttClient = new OpenAI({
    baseURL: config.stt.base_url,
    apiKey
  })
}

// audioBase64: base64-encoded audio from the renderer's MediaRecorder (webm/opus or wav)
export async function transcribeAudio(audioBase64, config) {
  if (!sttClient) initSTT(config)

  const buffer = Buffer.from(audioBase64, 'base64')
  const tmpPath = join(tmpdir(), `jarvis-audio-${Date.now()}.webm`)

  try {
    writeFileSync(tmpPath, buffer)

    const { toFile } = await import('openai')
    const audioFile = await toFile(buffer, 'audio.webm', { type: 'audio/webm' })

    const response = await sttClient.audio.transcriptions.create({
      model: config.stt.model,
      file: audioFile,
      language: 'en'
    })

    return response.text ?? ''
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath)
  }
}
