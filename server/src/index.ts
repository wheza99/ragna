import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createClient } from '@supabase/supabase-js'
import { createApiKey, listApiKeys, deleteApiKey, verifyApiKey } from './api-keys'
import { createPayment, listPayments, getPayment, checkAndUpdatePaymentStatus } from './payments'

// ── Env config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PORT = Number(process.env.PORT) || 3000

// Anon client (for user operations with JWT + RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Service role client (bypasses RLS, for verify API key)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const app = new Hono()

// ── CORS ────────────────────────────────────────────────────
app.use('/api/*', cors())

// ── Public routes ───────────────────────────────────────────
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Hono! 🔥' })
})

// ── User Auth middleware (Supabase JWT) ─────────────────────
async function userAuth(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  // Create client with user's JWT for RLS
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await userSupabase.auth.getUser(token)

  if (error || !user) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  c.set('user', user)
  c.set('supabase', userSupabase)
  await next()
}

// ── API Key middleware ──────────────────────────────────────
async function apiKeyAuth(c: any, next: any) {
  const rawKey = c.req.header('X-Api-Key')

  if (!rawKey) {
    return c.json({ error: 'Missing API key. Send X-Api-Key header.' }, 401)
  }

  const keyInfo = await verifyApiKey(supabaseAdmin, rawKey)
  if (!keyInfo) {
    return c.json({ error: 'Invalid or expired API key' }, 401)
  }

  c.set('authType', 'apikey')
  c.set('apiKeyInfo', keyInfo)
  await next()
}

// ═══════════════════════════════════════════════════════════
// USER AUTH ROUTES (JWT dari Supabase)
// ═══════════════════════════════════════════════════════════

app.use('/api/me', userAuth)
app.use('/api/todos/*', userAuth)
app.use('/api/keys/*', userAuth)
app.use('/api/payments/*', userAuth)
app.use('/api/transactions', userAuth)
app.use('/api/credits', userAuth)

app.get('/api/me', (c) => {
  const user = c.get('user')
  return c.json({ id: user.id, email: user.email })
})

// ── User Todos ──────────────────────────────────────────────
let todos = [
  { id: 1, text: 'Belajar Vite + Hono', done: true },
  { id: 2, text: 'Bikin project keren', done: false },
]

app.get('/api/todos', (c) => {
  const user = c.get('user')
  console.log(`Todos requested by: ${user.email}`)
  return c.json(todos)
})

app.post('/api/todos', async (c) => {
  const body = await c.req.json<{ text: string }>()
  const newTodo = { id: Date.now(), text: body.text, done: false }
  todos.push(newTodo)
  return c.json(newTodo, 201)
})

app.put('/api/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ done: boolean }>()
  todos = todos.map((t) => (t.id === id ? { ...t, done: body.done } : t))
  return c.json({ ok: true })
})

app.delete('/api/todos/:id', (c) => {
  const id = Number(c.req.param('id'))
  todos = todos.filter((t) => t.id !== id)
  return c.json({ ok: true })
})

// ── Manage API Keys (user auth) ─────────────────────────────
app.post('/api/keys', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')
  const body = await c.req.json<{ name: string }>()

  try {
    const key = await createApiKey(db, user.id, body.name || user.email)
    return c.json(key, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/keys', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')

  try {
    const keys = await listApiKeys(db, user.id)
    return c.json(keys)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.delete('/api/keys/:id', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')
  const keyId = c.req.param('id')

  try {
    await deleteApiKey(db, user.id, keyId)
    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ═══════════════════════════════════════════════════════════
// PAYMENTS ROUTES (JWT dari Supabase)
// ═══════════════════════════════════════════════════════════

app.post('/api/payments/topup', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')
  const body = await c.req.json<{ amount: number; method?: string }>()

  try {
    const origin = c.req.header('origin') || process.env.APP_URL || 'http://localhost:5173'
    const payment = await createPayment(db, user.id, user.email, body.amount, body.method, `${origin}/billing`)
    return c.json(payment, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.get('/api/payments', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')

  try {
    const payments = await listPayments(db, user.id)
    return c.json(payments)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/payments/:id/status', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')
  const paymentId = c.req.param('id')

  try {
    // Verify ownership
    await getPayment(db, user.id, paymentId)
    // Check and update status via service role
    const payment = await checkAndUpdatePaymentStatus(supabaseAdmin, paymentId)
    return c.json(payment)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// ═══════════════════════════════════════════════════════════
// CREDITS & TRANSACTIONS ROUTES (JWT dari Supabase)
// ═══════════════════════════════════════════════════════════

app.get('/api/credits', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')

  try {
    const { data, error } = await db
      .from('credits')
      .select('total')
      .eq('user_id', user.id)
      .single()

    if (error || !data) return c.json({ total: 0 })
    return c.json(data)
  } catch (err: any) {
    return c.json({ total: 0 })
  }
})

app.get('/api/transactions', async (c) => {
  const user = c.get('user')
  const db: ReturnType<typeof createClient> = c.get('supabase')

  try {
    const { data, error } = await db
      .from('transactions')
      .select('id, description, amount, type, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ═══════════════════════════════════════════════════════════
// PUBLIC API ROUTES (API Key auth)
// ═══════════════════════════════════════════════════════════

app.use('/api/public/*', apiKeyAuth)

app.get('/api/public/todos', (c) => {
  return c.json({ data: todos })
})

app.get('/api/public/stats', (c) => {
  return c.json({
    total: todos.length,
    done: todos.filter((t) => t.done).length,
    pending: todos.filter((t) => !t.done).length,
  })
})

// ── Production: serve React static files ────────────────────
app.use('/assets/*', serveStatic({ root: './public' }))
app.get('*', serveStatic({ root: './public' }))

// ── Start server ────────────────────────────────────────────
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`)
})
