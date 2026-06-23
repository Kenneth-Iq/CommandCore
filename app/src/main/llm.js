import OpenAI from 'openai'
import { loadCredential } from './credentials.js'

let client = null
let currentModel = null

export function initLLM(config) {
  const apiKey = loadCredential('nvidia_api_key')
  if (!apiKey) {
    throw new Error('NVIDIA API key not found. Open Jarvis and enter your API key in Settings.')
  }

  client = new OpenAI({
    baseURL: config.llm.base_url,
    apiKey
  })
  currentModel = config.llm.model
}

export function setModel(modelId) {
  currentModel = modelId
}

export async function listAvailableModels() {
  if (!client) throw new Error('LLM client not initialized')
  const response = await client.models.list()
  return response.data.map(m => m.id)
}

// Core chat completion — returns the assistant's reply string
export async function chat(messages, { maxTokens, temperature } = {}) {
  if (!client) throw new Error('LLM client not initialized')

  const response = await client.chat.completions.create({
    model: currentModel,
    messages,
    max_tokens: maxTokens ?? 2048,
    temperature: temperature ?? 0.7
  })

  return response.choices[0].message.content
}

// Single-turn prompt helper
export async function prompt(systemPrompt, userMessage, opts = {}) {
  return chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    opts
  )
}

// Expose client + model for the agentic loop in tools.js
export function getLLMClient() { return { client, model: currentModel } }

// Streaming chat — calls onChunk(text) for each token, returns full response when done
export async function chatStream(messages, onChunk, { maxTokens, temperature } = {}) {
  if (!client) throw new Error('LLM client not initialized')

  const stream = await client.chat.completions.create({
    model: currentModel,
    messages,
    max_tokens: maxTokens ?? 2048,
    temperature: temperature ?? 0.7,
    stream: true
  })

  let full = ''
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) {
      full += text
      onChunk(text)
    }
  }
  return full
}
