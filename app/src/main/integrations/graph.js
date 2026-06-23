/**
 * Thin Microsoft Graph API helper.
 * All calls go through here so auth refresh and error handling are centralised.
 */

import { getAccessToken } from './auth/msal.js'
import { loadCredential } from '../credentials.js'

const BASE = 'https://graph.microsoft.com/v1.0'

function clientId() {
  const id = loadCredential('ms_client_id')
  if (!id) throw new Error('Microsoft Client ID not configured. Open Integrations tab.')
  return id
}

async function request(method, path, body) {
  const token = await getAccessToken(clientId())

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)

  if (res.status === 204) return null  // No content

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message ?? `Graph API ${res.status}`
    throw new Error(msg)
  }
  return data
}

export const graph = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path)
}
