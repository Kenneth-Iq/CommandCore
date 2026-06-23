import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'

// sql.js is a pure WASM SQLite — no native compilation required.
// Database is loaded from disk on startup and flushed after every write.

let db = null
let dbPath = null
let SQL = null

export async function initLog(config) {
  const logDir = join(config.sandbox.root, 'jarvis-log')
  mkdirSync(logDir, { recursive: true })
  dbPath = join(logDir, 'actions.db')

  const sqlJs = (await import('sql.js')).default
  SQL = await sqlJs()

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS actions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT    NOT NULL,
      intent    TEXT    NOT NULL,
      action_type TEXT  NOT NULL,
      target    TEXT,
      payload_summary TEXT,
      confirmed_by    TEXT,
      result    TEXT
    )
  `)

  flush()
}

function flush() {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

export function logAction({ intent, actionType, target, payloadSummary, confirmedBy, result }) {
  if (!db) return

  db.run(
    `INSERT INTO actions (timestamp, intent, action_type, target, payload_summary, confirmed_by, result)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      intent ?? '',
      actionType ?? '',
      target ?? null,
      payloadSummary ?? null,
      confirmedBy ?? null,
      result ?? null
    ]
  )

  flush()
}

export function getRecentActions(limit = 100) {
  if (!db) return []
  const stmt = db.prepare('SELECT * FROM actions ORDER BY id DESC LIMIT ?')
  const rows = []
  stmt.bind([limit])
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function searchActions(query, limit = 50) {
  if (!db) return []
  const like = `%${query}%`
  const stmt = db.prepare(`
    SELECT * FROM actions
    WHERE intent LIKE ? OR action_type LIKE ? OR target LIKE ? OR payload_summary LIKE ?
    ORDER BY id DESC LIMIT ?
  `)
  const rows = []
  stmt.bind([like, like, like, like, limit])
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}
