import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

const SANDBOX_ROOT = 'C:\\jarvis'

const SANDBOX_DIRS = [
  'config',
  'notes',
  'drafts',
  'research',
  'projects',
  'exports',
  'server-config',
  'memory',
  'jarvis-log'
]

const DEFAULT_CONFIG = {
  llm: {
    provider: 'nvidia-nim',
    base_url: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    max_tokens: 2048,
    temperature: 0.7
  },
  stt: {
    provider: 'nvidia-nim',
    base_url: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/nemotron-asr-streaming'
  },
  tts: {
    provider: 'piper',
    voice: 'en_US-lessac-medium',
    rate: 1.0
  },
  voice: {
    wake_word: 'hey jarvis',
    silence_timeout_ms: 2000,
    listen_shortcut: 'CommandOrControl+Shift+Space'
  },
  sandbox: {
    root: SANDBOX_ROOT
  },
  integrations: {
    calendar: { enabled: false },
    email: { enabled: false },
    social: { enabled: false },
    research: { enabled: false },
    servers: { enabled: false }
  }
}

const DEFAULT_ALLOWED_COMMANDS = {
  servers: []
}

const DEFAULT_FEEDS = {
  feeds: []
}

export async function loadConfig() {
  const configPath = join(SANDBOX_ROOT, 'config', 'jarvis.yaml')

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    const raw = readFileSync(configPath, 'utf8')
    const parsed = yaml.load(raw)
    return deepMerge(DEFAULT_CONFIG, parsed)
  } catch (err) {
    console.error('Failed to parse jarvis.yaml, using defaults:', err.message)
    return { ...DEFAULT_CONFIG }
  }
}

export async function initSandbox(config) {
  const root = config.sandbox?.root ?? SANDBOX_ROOT

  // Create root and all subdirectories
  mkdirSync(root, { recursive: true })
  for (const dir of SANDBOX_DIRS) {
    mkdirSync(join(root, dir), { recursive: true })
  }

  // Write default config if missing
  const configPath = join(root, 'config', 'jarvis.yaml')
  if (!existsSync(configPath)) {
    writeFileSync(configPath, yaml.dump(DEFAULT_CONFIG), 'utf8')
  }

  // Write allowed-commands.yaml if missing
  const commandsPath = join(root, 'server-config', 'allowed-commands.yaml')
  if (!existsSync(commandsPath)) {
    writeFileSync(commandsPath, yaml.dump(DEFAULT_ALLOWED_COMMANDS), 'utf8')
  }

  // Write feeds.yaml if missing
  const feedsPath = join(root, 'config', 'feeds.yaml')
  if (!existsSync(feedsPath)) {
    writeFileSync(feedsPath, yaml.dump(DEFAULT_FEEDS), 'utf8')
  }
}

function deepMerge(base, override) {
  const result = { ...base }
  for (const key of Object.keys(override ?? {})) {
    if (
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key]) &&
      typeof base[key] === 'object'
    ) {
      result[key] = deepMerge(base[key], override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}
