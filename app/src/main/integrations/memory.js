/**
 * Phase 4 — Persistent memory system.
 * Stores YAML files in C:\jarvis\memory\
 * Types: user_facts, project_context, recurring_tasks, integration_state
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { registerTool } from '../tools.js'

let memoryRoot = null

function init(sandboxRoot) {
  memoryRoot = join(sandboxRoot, 'memory')
}

function memPath(key) {
  return join(memoryRoot, `${key.replace(/[^a-z0-9_-]/gi, '_')}.yaml`)
}

// ── CRUD ──────────────────────────────────────────────────────────────────

function readMemory(key) {
  const p = memPath(key)
  if (!existsSync(p)) return null
  return yaml.load(readFileSync(p, 'utf8'))
}

function writeMemory(key, value) {
  writeFileSync(memPath(key), yaml.dump({ key, value, updatedAt: new Date().toISOString() }), 'utf8')
}

function listMemories() {
  if (!existsSync(memoryRoot)) return []
  return readdirSync(memoryRoot)
    .filter(f => f.endsWith('.yaml'))
    .map(f => {
      try {
        const data = yaml.load(readFileSync(join(memoryRoot, f), 'utf8'))
        return { key: data.key, value: data.value, updatedAt: data.updatedAt }
      } catch { return null }
    })
    .filter(Boolean)
}

function deleteMemory(key) {
  const p = memPath(key)
  if (existsSync(p)) unlinkSync(p)
  return { deleted: true, key }
}

// ── Context summary for LLM ───────────────────────────────────────────────

export function buildMemoryContext(sandboxRoot) {
  init(sandboxRoot)
  const memories = listMemories()
  if (!memories.length) return ''
  const lines = memories.slice(0, 20).map(m => `- ${m.key}: ${JSON.stringify(m.value)}`)
  return `\n\nYour memory about the user:\n${lines.join('\n')}`
}

// ── Tool handlers ──────────────────────────────────────────────────────────

function rememberFact({ key, value }, config) {
  init(config.sandbox.root)
  writeMemory(key, value)
  return { remembered: true, key, value }
}

function forgetFact({ key }, config) {
  init(config.sandbox.root)
  return deleteMemory(key)
}

function recallFact({ key }, config) {
  init(config.sandbox.root)
  if (key) return readMemory(key) ?? { key, value: null, message: 'No memory found for this key.' }
  return listMemories()
}

// ── Registration ──────────────────────────────────────────────────────────

export function registerMemoryTools() {
  registerTool('remember', {
    tier: 1,
    describeAction: a => `Remember: ${a.key} = ${JSON.stringify(a.value)}`,
    definition: {
      type: 'function',
      function: {
        name: 'remember',
        description: 'Store a fact about the user for future conversations.',
        parameters: {
          type: 'object', required: ['key', 'value'],
          properties: {
            key:   { type: 'string', description: 'Short identifier, e.g. "standup_time".' },
            value: { description: 'The fact to store. Can be a string, number, or object.' }
          }
        }
      }
    },
    handler: rememberFact
  })

  registerTool('forget', {
    tier: 2,
    describeAction: a => `Forget memory: ${a.key}`,
    definition: {
      type: 'function',
      function: {
        name: 'forget',
        description: 'Delete a stored memory.',
        parameters: {
          type: 'object', required: ['key'],
          properties: { key: { type: 'string' } }
        }
      }
    },
    handler: forgetFact
  })

  registerTool('recall', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'recall',
        description: 'Retrieve a stored memory, or list all memories if no key given.',
        parameters: {
          type: 'object',
          properties: { key: { type: 'string', description: 'Leave empty to list all.' } }
        }
      }
    },
    handler: recallFact
  })
}
