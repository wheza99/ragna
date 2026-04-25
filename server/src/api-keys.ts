import crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * API Key Management — Database-backed with SHA-256 hashing
 *
 * Key format: `sk-<32 random hex chars>` (total 35 chars)
 * Storage: key_hash (SHA-256), key_prefix (first 7 chars), key_suffix (last 4 chars)
 * Verification: hash the incoming key → compare with stored hash
 */

// ── Helpers ────────────────────────────────────────────────

function randomHex(bytes: number) {
  return crypto.randomBytes(bytes).toString('hex')
}

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// ── CRUD ───────────────────────────────────────────────────

export async function createApiKey(supabase: SupabaseClient, userId: string, name: string) {
  const rawKey = `sk-${randomHex(16)}`  // sk- + 32 chars
  const keyHash = hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 7)  // "sk-" + 4 chars
  const keySuffix = rawKey.slice(-4)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: name || 'Default',
      key_hash: keyHash,
      key_prefix: keyPrefix,
      key_suffix: keySuffix,
    })
    .select('id, name, key_prefix, key_suffix, created_at')
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    name: data.name,
    keyPrefix: data.key_prefix,
    keySuffix: data.key_suffix,
    createdAt: data.created_at,
    // Raw key only returned once!
    rawKey,
  }
}

export async function listApiKeys(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, key_suffix, created_at, last_used_at, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keySuffix: row.key_suffix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
  }))
}

export async function deleteApiKey(supabase: SupabaseClient, userId: string, keyId: string) {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function verifyApiKey(supabase: SupabaseClient, rawKey: string) {
  const keyHash = hashKey(rawKey)

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, expires_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data) return null

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { id: data.id, userId: data.user_id, name: data.name }
}
