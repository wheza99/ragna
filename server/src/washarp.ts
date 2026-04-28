import axios from 'axios'

// ── Washarp API Client ──────────────────────────────────────
// Ragna calls Washarp's public API (washarp.online/api)
// Uses API key auth — no JWT needed

function getBaseUrl() {
  const url = process.env.WASHARP_API_URL
  if (!url) throw new Error('WASHARP_API_URL is not set')
  return url
}

function getApiKey() {
  const key = process.env.WASHARP_API_KEY
  if (!key) throw new Error('WASHARP_API_KEY is not set')
  return key
}

function headers() {
  return {
    'X-Api-Key': getApiKey(),
    'Content-Type': 'application/json',
  }
}

// ── Create Session ──────────────────────────────────────────
export async function createSession(webhookUrl?: string) {
  const body: any = {}
  if (webhookUrl) body.webhook_url = webhookUrl

  const res = await axios.post(`${getBaseUrl()}/public/sessions`, body, {
    headers: headers(),
    timeout: 30000,
  })
  return res.data?.data || res.data
}

// ── Get QR Code ─────────────────────────────────────────────
export async function getSessionQR(pbSessionId: string) {
  const res = await axios.get(`${getBaseUrl()}/public/sessions/${pbSessionId}/qr`, {
    headers: headers(),
    timeout: 15000,
  })
  return res.data
}

// ── Restart Session + Get QR ────────────────────────────────
export async function restartSessionQR(pbSessionId: string) {
  const res = await axios.post(`${getBaseUrl()}/public/sessions/${pbSessionId}/qr`, {}, {
    headers: headers(),
    timeout: 30000,
  })
  return res.data
}

// ── Stop/Disconnect Session ──────────────────────────────────
export async function stopSession(pbSessionId: string) {
  const res = await axios.post(`${getBaseUrl()}/public/sessions/${pbSessionId}/disconnect`, {}, {
    headers: headers(),
    timeout: 15000,
  })
  return res.data
}

export const washarp = {
  createSession,
  getSessionQR,
  restartSessionQR,
  stopSession,
}
