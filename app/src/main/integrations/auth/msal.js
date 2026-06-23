/**
 * MSAL OAuth flow for Microsoft Graph (Calendar + Email).
 *
 * Tokens are cached in safeStorage under 'ms_access_token',
 * 'ms_refresh_token', and 'ms_token_expiry'.
 *
 * The user must register an Azure AD app and provide the client ID
 * via the Integrations tab. Redirect URI: http://localhost:3001/auth
 */

import { BrowserWindow } from 'electron'
import { createServer } from 'http'
import { saveCredential, loadCredential } from '../../credentials.js'

const SCOPES = [
  'Calendars.ReadWrite',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'offline_access'
].join('%20')

const REDIRECT_PORT = 3001
const REDIRECT_URI  = `http://localhost:${REDIRECT_PORT}/auth`

// ── Token storage ─────────────────────────────────────────────────────────

export function saveTokens({ accessToken, refreshToken, expiresAt }) {
  saveCredential('ms_access_token',  accessToken)
  saveCredential('ms_refresh_token', refreshToken)
  saveCredential('ms_token_expiry',  String(expiresAt))
}

export function loadTokens() {
  const accessToken  = loadCredential('ms_access_token')
  const refreshToken = loadCredential('ms_refresh_token')
  const expiresAt    = Number(loadCredential('ms_token_expiry') ?? 0)
  if (!accessToken) return null
  return { accessToken, refreshToken, expiresAt }
}

export function hasTokens() {
  return !!loadCredential('ms_access_token')
}

// ── Token refresh ─────────────────────────────────────────────────────────

async function refreshAccessToken(clientId, refreshToken) {
  const body = new URLSearchParams({
    client_id:     clientId,
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    scope:         SCOPES.replace(/%20/g, ' ')
  })

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString()
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? 'Token refresh failed')

  const tokens = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt:    Date.now() + data.expires_in * 1000
  }
  saveTokens(tokens)
  return tokens
}

// ── Get a valid access token (auto-refresh if needed) ─────────────────────

export async function getAccessToken(clientId) {
  const tokens = loadTokens()
  if (!tokens) throw new Error('Not authenticated with Microsoft. Open Integrations tab to connect.')

  // Refresh 5 minutes before expiry
  if (Date.now() > tokens.expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(clientId, tokens.refreshToken)
    return refreshed.accessToken
  }

  return tokens.accessToken
}

// ── Interactive OAuth flow ────────────────────────────────────────────────

export async function startOAuthFlow(clientId) {
  return new Promise((resolve, reject) => {
    // 1. Start local HTTP server to receive the redirect
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
      const code  = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      res.writeHead(200, { 'Content-Type': 'text/html' })
      if (code) {
        res.end('<html><body><h2>Authenticated! You can close this window.</h2><script>window.close()</script></body></html>')
        server.close()
        popup.close()
        exchangeCode(clientId, code).then(resolve).catch(reject)
      } else {
        res.end(`<html><body><h2>Authentication failed: ${error}</h2></body></html>`)
        server.close()
        popup.close()
        reject(new Error(error ?? 'OAuth error'))
      }
    })

    server.listen(REDIRECT_PORT)

    // 2. Open Microsoft login in a popup BrowserWindow
    const authUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
      `?client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${SCOPES}` +
      `&response_mode=query`

    const popup = new BrowserWindow({
      width:  500,
      height: 700,
      title:  'Sign in to Microsoft',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })

    popup.loadURL(authUrl)
    popup.on('closed', () => {
      server.close()
      reject(new Error('Auth window closed before completing login'))
    })
  })
}

async function exchangeCode(clientId, code) {
  const body = new URLSearchParams({
    client_id:    clientId,
    grant_type:   'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    scope:        SCOPES.replace(/%20/g, ' ')
  })

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString()
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? 'Token exchange failed')

  const tokens = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + data.expires_in * 1000
  }
  saveTokens(tokens)
  return tokens
}
