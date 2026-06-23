/**
 * Phase 3 — Server monitoring integration.
 *
 * Supports: SSH health/logs/commands, REST API pings.
 * Server list and allowed commands come from:
 *   C:\jarvis\server-config\allowed-commands.yaml
 *
 * Servers are defined in jarvis.yaml under integrations.servers.hosts[]:
 *   - name: production
 *     host: 192.168.1.10
 *     port: 22
 *     username: deploy
 *     keyPath: C:\Users\Kenny\.ssh\id_rsa
 *     type: ssh          # or "rest"
 *     restBase: null     # e.g. http://host:8080
 */

import { Client } from 'ssh2'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { registerTool } from '../tools.js'
import { loadCredential } from '../credentials.js'

// ── Helpers ───────────────────────────────────────────────────────────────

function loadAllowedCommands(sandboxRoot) {
  const p = join(sandboxRoot, 'server-config', 'allowed-commands.yaml')
  if (!existsSync(p)) return {}
  const raw = yaml.load(readFileSync(p, 'utf8'))
  // Format: { servers: [{ name, commands: ['systemctl restart nginx', ...] }] }
  const result = {}
  for (const entry of raw?.servers ?? []) {
    result[entry.name] = new Set(entry.commands ?? [])
  }
  return result
}

function getServers(config) {
  return config?.integrations?.servers?.hosts ?? []
}

function findServer(config, name) {
  const servers = getServers(config)
  const s = servers.find(s => s.name === name)
  if (!s) throw new Error(`Server "${name}" not found. Known servers: ${servers.map(s => s.name).join(', ')}`)
  return s
}

// ── SSH helpers ────────────────────────────────────────────────────────────

function sshExec(server, command, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let output = ''
    let errorOutput = ''

    const timer = setTimeout(() => {
      conn.end()
      reject(new Error(`SSH command timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); reject(err); return }
        stream.on('close', (code) => {
          clearTimeout(timer)
          conn.end()
          resolve({ output: output.trim(), error: errorOutput.trim(), exitCode: code })
        })
        stream.on('data', d => { output += d })
        stream.stderr.on('data', d => { errorOutput += d })
      })
    })

    conn.on('error', err => { clearTimeout(timer); reject(err) })

    const connectOpts = {
      host:     server.host,
      port:     server.port ?? 22,
      username: server.username
    }

    if (server.keyPath) {
      connectOpts.privateKey = readFileSync(server.keyPath)
    } else {
      // Fall back to credential vault: ssh_key_<servername>
      const storedKey = loadCredential(`ssh_key_${server.name}`)
      if (storedKey) connectOpts.privateKey = storedKey
      else throw new Error(`No SSH key found for server "${server.name}"`)
    }

    conn.connect(connectOpts)
  })
}

// ── Tool handlers ──────────────────────────────────────────────────────────

async function pingServer({ serverName }, config) {
  const server = findServer(config, serverName)

  if (server.type === 'rest') {
    const url = `${server.restBase}/health`
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(id)
      return { server: serverName, status: res.ok ? 'up' : 'degraded', httpStatus: res.status }
    } catch (err) {
      return { server: serverName, status: 'down', error: err.message }
    }
  }

  // SSH ping: just run `echo ok`
  try {
    const result = await sshExec(server, 'echo ok', 5000)
    return { server: serverName, status: result.output === 'ok' ? 'up' : 'degraded' }
  } catch (err) {
    return { server: serverName, status: 'down', error: err.message }
  }
}

async function tailLogs({ serverName, lines = 50, logPath }, config) {
  const server = findServer(config, serverName)
  const cmd = logPath
    ? `tail -n ${lines} ${logPath}`
    : `journalctl -n ${lines} --no-pager 2>/dev/null || tail -n ${lines} /var/log/syslog 2>/dev/null`
  const result = await sshExec(server, cmd)
  // Truncate very large outputs
  const truncated = result.output.split('\n').slice(-100).join('\n')
  return { server: serverName, lines: truncated }
}

async function getResourceMetrics({ serverName }, config) {
  const server = findServer(config, serverName)
  const cmd = `echo "CPU:$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')% MEM:$(free -m | awk 'NR==2{printf "%.0f%%", $3*100/$2}') DISK:$(df -h / | awk 'NR==2{print $5}')"`
  const result = await sshExec(server, cmd)
  return { server: serverName, metrics: result.output }
}

async function runCommand({ serverName, command }, config) {
  const server = findServer(config, serverName)
  const allowed = loadAllowedCommands(config.sandbox.root)
  const serverAllowed = allowed[serverName]

  if (!serverAllowed || !serverAllowed.has(command)) {
    const list = serverAllowed ? [...serverAllowed].join(', ') : '(none configured)'
    return { error: `Command not in allowlist for "${serverName}". Allowed: ${list}` }
  }

  const result = await sshExec(server, command)
  const output = result.output.split('\n').slice(-100).join('\n')
  return { server: serverName, command, output, exitCode: result.exitCode }
}

async function listServers(_args, config) {
  const servers = getServers(config)
  return servers.map(s => ({ name: s.name, host: s.host, type: s.type ?? 'ssh' }))
}

// ── Registration ──────────────────────────────────────────────────────────

export function registerServerTools() {
  registerTool('ping_server', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'ping_server',
        description: 'Check if a server is up and responding.',
        parameters: {
          type: 'object', required: ['serverName'],
          properties: { serverName: { type: 'string' } }
        }
      }
    },
    handler: pingServer
  })

  registerTool('list_servers', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'list_servers',
        description: 'List all registered servers.',
        parameters: { type: 'object', properties: {} }
      }
    },
    handler: listServers
  })

  registerTool('tail_server_logs', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'tail_server_logs',
        description: 'Tail recent log lines from a server.',
        parameters: {
          type: 'object', required: ['serverName'],
          properties: {
            serverName: { type: 'string' },
            lines:      { type: 'integer', default: 50 },
            logPath:    { type: 'string', description: 'Absolute path to log file. Omit to use journalctl.' }
          }
        }
      }
    },
    handler: tailLogs
  })

  registerTool('get_server_metrics', {
    tier: 0,
    definition: {
      type: 'function',
      function: {
        name: 'get_server_metrics',
        description: 'Get CPU, memory, and disk usage from a server.',
        parameters: {
          type: 'object', required: ['serverName'],
          properties: { serverName: { type: 'string' } }
        }
      }
    },
    handler: getResourceMetrics
  })

  registerTool('run_server_command', {
    tier: 4,
    describeAction: a => `Run "${a.command}" on ${a.serverName}`,
    definition: {
      type: 'function',
      function: {
        name: 'run_server_command',
        description: 'Run a pre-approved shell command on a server.',
        parameters: {
          type: 'object', required: ['serverName', 'command'],
          properties: {
            serverName: { type: 'string' },
            command:    { type: 'string', description: 'Must be in the allowed-commands.yaml allowlist.' }
          }
        }
      }
    },
    handler: runCommand
  })
}
