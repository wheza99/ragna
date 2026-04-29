import axios from 'axios'

// ── Config ──────────────────────────────────────────────────
const getBaseUrl = () => process.env.POCKETBASE_URL || 'http://localhost:8090'

// ── Admin token cache ───────────────────────────────────────
let _adminToken = ''
let _adminExpiry = 0

async function adminAuth(): Promise<string> {
  if (_adminToken && Date.now() < _adminExpiry) return _adminToken

  const email = process.env.POCKETBASE_ADMIN_EMAIL || ''
  const password = process.env.POCKETBASE_ADMIN_PASSWORD || ''

  const res = await axios.post(`${getBaseUrl()}/api/collections/_superusers/auth-with-password`, {
    identity: email,
    password: password,
  })

  _adminToken = res.data.token
  _adminExpiry = Date.now() + 23 * 60 * 60 * 1000
  return _adminToken
}

/** Invalidate cached admin token (e.g. after 401) */
export function invalidateAdminToken() {
  _adminToken = ''
  _adminExpiry = 0
}

// ── Verify user token ───────────────────────────────────────
export async function verifyUser(token: string) {
  try {
    const res = await axios.post(`${getBaseUrl()}/api/collections/users/auth-refresh`, {}, {
      headers: { Authorization: token },
    })
    return { id: res.data.record.id, email: res.data.record.email }
  } catch {
    return null
  }
}

// ── Build filter URL (bypass axios params double-encoding) ──
function buildListUrl(collection: string, filter?: string, sort?: string): string {
  let url = `${getBaseUrl()}/api/collections/${collection}/records`
  const qs: string[] = []
  if (filter) qs.push('filter=' + filter.replace(/=/g, '%3D').replace(/'/g, '%27'))
  if (sort) qs.push('sort=' + sort)
  if (qs.length) url += '?' + qs.join('&')
  return url
}

// ── PocketBase CRUD helpers ─────────────────────────────────

export const pb = {
  admin: {
    async list(collection: string, filter?: string, sort?: string) {
      const token = await adminAuth()
      try {
        const url = buildListUrl(collection, filter, sort)
        const res = await axios.get(url, {
          headers: { Authorization: token },
        })
        return res.data.items || []
      } catch (err: any) {
        console.error(`[PB] list(${collection}) error:`, err?.response?.data || err?.message)
        throw err
      }
    },

    async getOne(collection: string, id: string) {
      const token = await adminAuth()
      try {
        const res = await axios.get(`${getBaseUrl()}/api/collections/${collection}/records/${id}`, {
          headers: { Authorization: token },
        })
        return res.data
      } catch (err: any) {
        console.error(`[PB] getOne(${collection}/${id}) error:`, err?.response?.data || err?.message)
        throw err
      }
    },

    async getFirst(collection: string, filter: string) {
      try {
        const items = await pb.admin.list(collection, filter)
        return items[0] || null
      } catch {
        return null
      }
    },

    async create(collection: string, data: Record<string, unknown>) {
      const token = await adminAuth()
      try {
        const res = await axios.post(`${getBaseUrl()}/api/collections/${collection}/records`, data, {
          headers: { Authorization: token },
        })
        return res.data
      } catch (err: any) {
        console.error(`[PB] create(${collection}) error:`, err?.response?.data || err?.message)
        throw err
      }
    },

    async update(collection: string, id: string, data: Record<string, unknown>) {
      const token = await adminAuth()
      try {
        const res = await axios.patch(`${getBaseUrl()}/api/collections/${collection}/records/${id}`, data, {
          headers: { Authorization: token },
        })
        return res.data
      } catch (err: any) {
        console.error(`[PB] update(${collection}/${id}) error:`, err?.response?.data || err?.message)
        throw err
      }
    },

    async delete(collection: string, id: string) {
      const token = await adminAuth()
      try {
        await axios.delete(`${getBaseUrl()}/api/collections/${collection}/records/${id}`, {
          headers: { Authorization: token },
        })
      } catch (err: any) {
        console.error(`[PB] delete(${collection}/${id}) error:`, err?.response?.data || err?.message)
        throw err
      }
    },
  },
}
