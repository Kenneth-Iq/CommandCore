import { safeStorage, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'

// Credentials are stored as individual encrypted files in the app userData directory.
// Each key is a separate file: e.g. userData/credentials/nvidia_api_key.bin
// Encryption uses Windows DPAPI (safeStorage) — decryptable only by this Windows user account.

function credDir() {
  const dir = join(app.getPath('userData'), 'credentials')
  mkdirSync(dir, { recursive: true })
  return dir
}

function credPath(name) {
  return join(credDir(), `${name}.bin`)
}

export function canEncrypt() {
  return safeStorage.isEncryptionAvailable()
}

export function saveCredential(name, value) {
  if (!value?.trim()) throw new Error('Credential value cannot be empty')

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    writeFileSync(credPath(name), encrypted)
  } else {
    // Fallback: plaintext with a warning (only reached in headless/test environments)
    console.warn(`safeStorage unavailable — storing ${name} as plaintext. Do not use in production.`)
    writeFileSync(credPath(name) + '.plain', value, 'utf8')
  }
}

export function loadCredential(name) {
  const encPath = credPath(name)
  const plainPath = encPath + '.plain'

  if (existsSync(encPath)) {
    const encrypted = readFileSync(encPath)
    return safeStorage.decryptString(encrypted)
  }
  if (existsSync(plainPath)) {
    return readFileSync(plainPath, 'utf8')
  }
  // Also accept environment variable as override (useful for CI / first run)
  const envMap = { nvidia_api_key: 'NVIDIA_API_KEY' }
  if (envMap[name] && process.env[envMap[name]]) {
    return process.env[envMap[name]]
  }
  return null
}

export function hasCredential(name) {
  return (
    existsSync(credPath(name)) ||
    existsSync(credPath(name) + '.plain') ||
    (name === 'nvidia_api_key' && !!process.env.NVIDIA_API_KEY)
  )
}

export function deleteCredential(name) {
  const encPath = credPath(name)
  const plainPath = encPath + '.plain'
  if (existsSync(encPath)) unlinkSync(encPath)
  if (existsSync(plainPath)) unlinkSync(plainPath)
}
