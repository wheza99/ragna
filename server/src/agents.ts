import { pb } from './pocketbase'
import { washarp } from './washarp'

// ── Helpers ─────────────────────────────────────────────────

function fmtAgent(r: any) {
  return {
    ...r,
    created_at: r.created,
  }
}

// ── Agents CRUD ─────────────────────────────────────────────

export async function listAgents(userId: string) {
  const items = await pb.admin.list('agents', `(user_id='${userId}')`, '-created')
  return items.map(fmtAgent)
}

export async function getAgent(userId: string, id: string) {
  const record = await pb.admin.getOne('agents', id)
  if (!record || record.user_id !== userId) throw new Error('Agent not found')
  return fmtAgent(record)
}

export async function createAgent(userId: string, payload: any) {
  // 1. Create agent record
  const record = await pb.admin.create('agents', {
    ...payload,
    user_id: userId,
    washarp_status: 'connecting',
  })

  const agentId = record.id

  // 2. Create Washarp session → WAHA session auto-started, get QR
  let qr: string | null = null
  let phone: string | null = null
  let status = 'connecting'
  let washarpSessionId: string | null = null
  let washarpWahaSession: string | null = null

  try {
    const session = await washarp.createSession()
    washarpSessionId = session.id          // Washarp PB record ID
    washarpWahaSession = session.session_id // WAHA session name (e.g. washarp-xxxxx)

    // Wait for WAHA to generate QR
    await new Promise((r) => setTimeout(r, 2000))

    // Fetch QR from Washarp
    const qrResult = await washarp.getSessionQR(washarpSessionId)
    qr = qrResult.qr || null
    phone = qrResult.phone_number || null
    status = qrResult.status || 'connecting'
  } catch (err: any) {
    console.error('[Washarp] createSession error:', err?.response?.data || err?.message)
    status = 'failed'
  }

  // 3. Update agent with session info
  await pb.admin.update('agents', agentId, {
    washarp_session_id: washarpSessionId || '',
    washarp_waha_session: washarpWahaSession || '',
    washarp_phone: phone,
    washarp_status: status,
  })

  const agent = await getAgent(userId, agentId)
  return { ...agent, qr }
}

export async function updateAgent(userId: string, id: string, payload: any) {
  await getAgent(userId, id) // verify ownership
  await pb.admin.update('agents', id, payload)
  return getAgent(userId, id)
}

export async function deleteAgent(userId: string, id: string) {
  const agent = await getAgent(userId, id)
  // Note: session cleanup is handled by Washarp, we just clear the reference
  // Delete related tools and messages
  const tools = await pb.admin.list('tools', `(agent_id='${id}')`)
  for (const t of tools) {
    await pb.admin.delete('tools', t.id)
  }
  const messages = await pb.admin.list('messages', `(agent_id='${id}')`)
  for (const m of messages) {
    await pb.admin.delete('messages', m.id)
  }
  await pb.admin.delete('agents', id)
}

// ── Refresh QR for agent ────────────────────────────────────
export async function refreshAgentQR(userId: string, id: string) {
  const agent = await getAgent(userId, id)
  if (!agent.washarp_session_id) throw new Error('No WhatsApp session')

  // Restart session + get QR from Washarp
  const result = await washarp.restartSessionQR(agent.washarp_session_id)

  // Update agent
  await pb.admin.update('agents', id, {
    washarp_status: result.status,
    washarp_phone: result.phone_number || '',
  })

  return {
    status: result.status,
    qr: result.qr,
    phone_number: result.phone_number,
  }
}

// ── Check WA status (lightweight, for polling) ────────────
export async function checkAgentWAStatus(userId: string, id: string) {
  const agent = await getAgent(userId, id)
  if (!agent.washarp_session_id) return { status: 'disconnected', phone_number: null }

  const result = await washarp.getSessionQR(agent.washarp_session_id)

  // Update agent record
  if (result.status !== agent.washarp_status || result.phone_number !== agent.washarp_phone) {
    await pb.admin.update('agents', id, {
      washarp_status: result.status,
      washarp_phone: result.phone_number || '',
    })
  }

  return {
    status: result.status,
    qr: result.qr,
    phone_number: result.phone_number,
  }
}

// ── Tools CRUD ──────────────────────────────────────────────

export async function listTools(userId: string, agentId: string) {
  const items = await pb.admin.list('tools', `(agent_id='${agentId}')`, '-created')
  return items.map((r: any) => ({ ...r, created_at: r.created }))
}

export async function createTool(userId: string, agentId: string, payload: any) {
  const record = await pb.admin.create('tools', { ...payload, agent_id: agentId, user_id: userId })
  return { ...record, created_at: record.created }
}

export async function updateTool(userId: string, toolId: string, payload: any) {
  const record = await pb.admin.getOne('tools', toolId)
  if (!record || record.user_id !== userId) throw new Error('Tool not found')
  const updated = await pb.admin.update('tools', toolId, payload)
  return { ...updated, created_at: updated.created }
}

export async function deleteTool(userId: string, toolId: string) {
  const record = await pb.admin.getOne('tools', toolId)
  if (!record || record.user_id !== userId) throw new Error('Tool not found')
  await pb.admin.delete('tools', toolId)
}

// ── Messages ────────────────────────────────────────────────

export async function listMessages(userId: string, agentId: string) {
  const items = await pb.admin.list('messages', `(agent_id='${agentId}')`, '-created')
  return items.map((r: any) => ({ ...r, created_at: r.created }))
}

export async function createMessage(payload: any) {
  const record = await pb.admin.create('messages', payload)
  return { ...record, created_at: record.created }
}
