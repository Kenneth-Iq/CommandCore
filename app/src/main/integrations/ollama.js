/**
 * Phase 6 — Ollama local LLM backend.
 * Drop-in replacement for the NVIDIA NIM client.
 * Ollama exposes an OpenAI-compatible API at http://localhost:11434/v1
 */

import OpenAI from 'openai'

let ollamaClient = null
let ollamaModel  = null

export function initOllama(config) {
  const base = config.llm?.ollama_base_url ?? 'http://localhost:11434/v1'
  ollamaClient = new OpenAI({ baseURL: base, apiKey: 'ollama' })
  ollamaModel  = config.llm?.ollama_model ?? 'llama3'
}

export async function listOllamaModels() {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    const data = await res.json()
    return (data.models ?? []).map(m => m.name)
  } catch {
    return []
  }
}

export async function isOllamaAvailable() {
  try {
    const res = await fetch('http://localhost:11434/api/version', { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export function getOllamaClient() {
  return { client: ollamaClient, model: ollamaModel }
}
