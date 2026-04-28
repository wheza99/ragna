import { pb } from './pocketbase'

// ── Agents CRUD ─────────────────────────────────────────────

export async function listAgents(userId: string) {
  const items = await pb.admin.list('agents', `(user_id='${userId}')`, '-created')
  return items.map((r: any) => ({
    ...r,
    created_at: r.created,
  }))
}

export async function getAgent(userId: string, id: string) {
  const record = await pb.admin.getOne('agents', id)
  if (!record || record.user_id !== userId) throw new Error('Agent not found')
  return { ...record, created_at: record.created }
}

export async function createAgent(userId: string, payload: any) {
  const record = await pb.admin.create('agents', { ...payload, user_id: userId })
  return getAgent(userId, record.id)
}

export async function updateAgent(userId: string, id: string, payload: any) {
  await getAgent(userId, id) // verify ownership
  await pb.admin.update('agents', id, payload)
  return getAgent(userId, id)
}

export async function deleteAgent(userId: string, id: string) {
  await getAgent(userId, id)
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
