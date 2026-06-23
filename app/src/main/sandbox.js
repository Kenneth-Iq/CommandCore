import { readFileSync, writeFileSync, unlinkSync, renameSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { join, resolve, dirname } from 'path'

const BACKUP_THRESHOLD_BYTES = 10 * 1024 // 10KB

let sandboxRoot = 'C:\\jarvis'

export function setSandboxRoot(root) {
  sandboxRoot = root
}

// Throws if path resolves outside the sandbox root
function assertContained(filePath) {
  const resolved = resolve(filePath)
  const rootResolved = resolve(sandboxRoot)
  if (!resolved.startsWith(rootResolved + '\\') && resolved !== rootResolved) {
    throw new Error(`Path "${filePath}" is outside the sandbox root "${sandboxRoot}"`)
  }
  return resolved
}

export function sandboxRead(relPath) {
  const full = assertContained(join(sandboxRoot, relPath))
  return readFileSync(full, 'utf8')
}

export function sandboxWrite(relPath, content, { overwrite = true } = {}) {
  const full = assertContained(join(sandboxRoot, relPath))

  mkdirSync(dirname(full), { recursive: true })

  if (overwrite && existsSync(full)) {
    const stat = statSync(full)
    if (stat.size >= BACKUP_THRESHOLD_BYTES) {
      const backupPath = full + '.backup'
      copyFileSync(full, backupPath)
    }
  } else if (!overwrite && existsSync(full)) {
    throw new Error(`File already exists: ${relPath}`)
  }

  writeFileSync(full, content, 'utf8')
  return full
}

export function sandboxDelete(relPath) {
  const full = assertContained(join(sandboxRoot, relPath))
  if (!existsSync(full)) {
    throw new Error(`File not found: ${relPath}`)
  }
  // Always backup before delete
  const backupPath = full + '.backup'
  copyFileSync(full, backupPath)
  unlinkSync(full)
}

export function sandboxMove(fromRel, toRel) {
  const from = assertContained(join(sandboxRoot, fromRel))
  const to = assertContained(join(sandboxRoot, toRel))
  mkdirSync(dirname(to), { recursive: true })
  renameSync(from, to)
}

export function sandboxList(relDir = '') {
  const full = assertContained(join(sandboxRoot, relDir))
  if (!existsSync(full)) return []

  return readdirSync(full).map(name => {
    const itemPath = join(full, name)
    const stat = statSync(itemPath)
    return {
      name,
      path: join(relDir, name).replace(/\\/g, '/'),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modified: stat.mtimeMs
    }
  })
}

export function sandboxExists(relPath) {
  try {
    const full = assertContained(join(sandboxRoot, relPath))
    return existsSync(full)
  } catch {
    return false
  }
}

export function sandboxStat(relPath) {
  const full = assertContained(join(sandboxRoot, relPath))
  if (!existsSync(full)) return null
  const stat = statSync(full)
  return {
    size: stat.size,
    modified: stat.mtimeMs,
    isDirectory: stat.isDirectory()
  }
}

// Read any file the OS user has permission to read (no sandbox restriction on reads)
export function readAnyFile(absolutePath) {
  const resolved = resolve(absolutePath)
  return readFileSync(resolved, 'utf8')
}
