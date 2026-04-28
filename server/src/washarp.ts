import axios, { AxiosInstance } from 'axios'

// ── WAHA API Client ─────────────────────────────────────────
// Ragna calls WAHA directly (same pattern as Washarp)
// Each agent gets its own WAHA session

function getBaseUrl() {
  const url = process.env.WAHA_API_URL
  if (!url) throw new Error('WAHA_API_URL is not set')
  return url
}

function getApiKey() {
  return process.env.WAHA_API_KEY || ''
}

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: getBaseUrl(),
    headers: {
      'X-Api-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
  })
}

// ── Start Session ───────────────────────────────────────────
export async function startSession(sessionName: string, webhookUrl?: string) {
  const webhooks = webhookUrl
    ? [{ url: webhookUrl, events: ['session.status', 'message', 'message.ack'] }]
    : []

  try {
    const res = await createClient().post('/api/sessions', {
      name: sessionName,
      config: {
        webhooks,
        proxy: null,
        noweb: { store: { enabled: true, fullSync: false } },
      },
      start: true,
    })
    return res.data
  } catch (err: any) {
    // Session already exists — just start it
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      try {
        const res = await createClient().post(`/api/sessions/${sessionName}/start`)
        return res.data
      } catch {
        return getSession(sessionName)
      }
    }
    throw err
  }
}

// ── Get Session Status ──────────────────────────────────────
export async function getSession(sessionName: string) {
  try {
    const res = await createClient().get(`/api/sessions/${sessionName}`)
    return res.data
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw err
  }
}

// ── Get QR Code ─────────────────────────────────────────────
export async function getQR(sessionName: string): Promise<string | null> {
  try {
    const res = await createClient().get(`/api/${sessionName}/auth/qr`, {
      params: { format: 'image' },
      responseType: 'arraybuffer',
    })
    const base64 = Buffer.from(res.data, 'binary').toString('base64')
    return `data:image/png;base64,${base64}`
  } catch {
    return null
  }
}

// ── Stop Session ────────────────────────────────────────────
export async function stopSession(sessionName: string) {
  try {
    await createClient().delete(`/api/sessions/${sessionName}`)
  } catch {
    try { await createClient().post(`/api/sessions/${sessionName}/logout`) } catch {}
  }
}

// ── Get Session Status + QR ─────────────────────────────────
export async function getSessionWithQR(sessionName: string) {
  let wahaStatus = 'STOPPED'
  let phoneNumber: string | null = null

  try {
    const session = await getSession(sessionName)
    if (session) {
      wahaStatus = session.status || 'STOPPED'
      if (session.status === 'CONNECTED' || session.status === 'WORKING') {
        if (session.me) {
          phoneNumber = typeof session.me.id === 'string'
            ? session.me.id.split('@')[0]
            : session.me.id?.user
        }
      }
    }
  } catch {}

  let status: string
  if (wahaStatus === 'CONNECTED' || wahaStatus === 'WORKING') status = 'connected'
  else if (wahaStatus === 'SCAN_QR_CODE' || wahaStatus === 'STARTING') status = 'connecting'
  else if (wahaStatus === 'FAILED') status = 'failed'
  else status = 'disconnected'

  let qr: string | null = null
  if (status === 'connecting') {
    try { qr = await getQR(sessionName) } catch {}
  }

  return { status, qr, phone_number: phoneNumber }
}

// ── Send Text Message ───────────────────────────────────────
export async function sendText(sessionName: string, chatId: string, text: string) {
  const res = await createClient().post('/api/sendText', {
    chatId,
    text,
    session: sessionName,
    linkPreview: true,
  }, { timeout: 30000 })
  return res.data
}

export const waha = {
  startSession,
  getSession,
  getQR,
  stopSession,
  getSessionWithQR,
  sendText,
}
