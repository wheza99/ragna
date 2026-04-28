import crypto from 'crypto'
import { pb } from './pocketbase'

// ── Helpers ────────────────────────────────────────────────

function randomHex(bytes: number) {
  return crypto.randomBytes(bytes).toString('hex')
}

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// ── CRUD ───────────────────────────────────────────────────

export async function createApiKey(userId: string, name: string) {
  const rawKey = `sk-${randomHex(16)}`
  const keyHash = hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 7)
  const keySuffix = rawKey.slice(-4)

  const record = await pb.admin.create('api_keys', {
    user_id: userId,
    name: name || 'Default',
    key_hash: keyHash,
    key_prefix: keyPrefix,
    key_suffix: keySuffix,
  })

  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.key_prefix,
    keySuffix: record.key_suffix,
    createdAt: record.created,
    rawKey,
  }
}

export async function listApiKeys(userId: string) {
  const items = await pb.admin.list('api_keys', `(user_id='${userId}')`)

  return items.map((row: any) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keySuffix: row.key_suffix,
    createdAt: row.created,
    lastUsedAt: row.last_used_at || null,
    expiresAt: row.expires_at || null,
  }))
}

export async function deleteApiKey(userId: string, keyId: string) {
  const key = await pb.admin.getOne('api_keys', keyId)
  if (!key || key.user_id !== userId) throw new Error('Not found')
  await pb.admin.delete('api_keys', keyId)
}

export async function verifyApiKey(rawKey: string) {
  const keyHash = hashKey(rawKey)
  const key = await pb.admin.getFirst('api_keys', `(key_hash='${keyHash}')`)

  if (!key) return null

  // Check expiry
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return null
  }

  // Update last_used_at (fire and forget)
  pb.admin.update('api_keys', key.id, { last_used_at: new Date().toISOString() }).catch(() => {})

  return { id: key.id, userId: key.user_id, name: key.name }
}
