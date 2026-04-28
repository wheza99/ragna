import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

// Prevent unhandled rejections from crashing the server
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err)
})

import { pb, verifyUser } from './pocketbase'
import { createApiKey, listApiKeys, deleteApiKey, verifyApiKey } from './api-keys'
import { createPayment, listPayments, getPayment, checkAndUpdatePaymentStatus } from './payments'
import { listAgents, getAgent, createAgent, updateAgent, deleteAgent, listTools, createTool, updateTool, deleteTool, listMessages, refreshAgentQR } from './agents'

// ── Config ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000

const app = new Hono()

// ── CORS ────────────────────────────────────────────────────
app.use('/api/*', cors())

// ── Public routes ───────────────────────────────────────────
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Hono! 🔥' })
})

// ── User Auth middleware (PocketBase JWT) ────────────────────
async function userAuth(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const user = await verifyUser(token)

  if (!user) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  c.set('user', user)
  c.set('token', token)
  await next()
}

// ── API Key middleware ──────────────────────────────────────
async function apiKeyAuth(c: any, next: any) {
  const rawKey = c.req.header('X-Api-Key')

  if (!rawKey) {
    return c.json({ error: 'Missing API key. Send X-Api-Key header.' }, 401)
  }

  const keyInfo = await verifyApiKey(rawKey)
  if (!keyInfo) {
    return c.json({ error: 'Invalid or expired API key' }, 401)
  }

  c.set('authType', 'apikey')
  c.set('apiKeyInfo', keyInfo)
  await next()
}

// ═══════════════════════════════════════════════════════════
// USER AUTH ROUTES (JWT dari PocketBase)
// ═══════════════════════════════════════════════════════════

app.use('/api/me', userAuth)
app.use('/api/agents/*', userAuth)
app.use('/api/agents', userAuth)
app.use('/api/tools/*', userAuth)
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
  const body = await c.req.json<{ name: string }>()
  try {
    const key = await createApiKey(user.id, body.name || user.email)
    return c.json(key, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/keys', async (c) => {
  const user = c.get('user')
  try {
    const keys = await listApiKeys(user.id)
    return c.json(keys)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.delete('/api/keys/:id', async (c) => {
  const user = c.get('user')
  const keyId = c.req.param('id')
  try {
    await deleteApiKey(user.id, keyId)
    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ═══════════════════════════════════════════════════════════
// PAYMENTS ROUTES (JWT dari PocketBase)
// ═══════════════════════════════════════════════════════════

app.post('/api/payments/topup', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ amount: number; method?: string }>()
  try {
    const origin = c.req.header('origin') || process.env.APP_URL || 'http://localhost:5173'
    const payment = await createPayment(user.id, user.email, body.amount, body.method, `${origin}/billing`)
    return c.json(payment, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.get('/api/payments', async (c) => {
  const user = c.get('user')
  try {
    const payments = await listPayments(user.id)
    return c.json(payments)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/payments/:id/status', async (c) => {
  const user = c.get('user')
  const paymentId = c.req.param('id')
  try {
    // Verify ownership
    await getPayment(user.id, paymentId)
    // Check and update status
    const payment = await checkAndUpdatePaymentStatus(paymentId)
    return c.json(payment)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// ═══════════════════════════════════════════════════════════
// CREDITS & TRANSACTIONS ROUTES (JWT dari PocketBase)
// ═══════════════════════════════════════════════════════════

app.get('/api/credits', async (c) => {
  const user = c.get('user')
  try {
    const record = await pb.admin.getFirst('credits', `(user_id='${user.id}')`)
    if (!record) return c.json({ total: 0 })
    return c.json({ total: record.total || 0 })
  } catch (err: any) {
    return c.json({ total: 0 })
  }
})

app.get('/api/transactions', async (c) => {
  const user = c.get('user')
  try {
    const items = await pb.admin.list('transactions', `(user_id='${user.id}')`)
    return c.json(items.map((r: any) => ({
      id: r.id,
      description: r.description,
      amount: r.amount,
      type: r.type,
      metadata: r.metadata,
      created_at: r.created,
    })))
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ═══════════════════════════════════════════════════════════
// AGENTS ROUTES
// ═══════════════════════════════════════════════════════════

app.get('/api/agents', async (c) => {
  const user = c.get('user')
  try {
    const agents = await listAgents(user.id)
    return c.json(agents)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.post('/api/agents', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  try {
    const agent = await createAgent(user.id, body)
    return c.json(agent, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.get('/api/agents/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  try {
    const agent = await getAgent(user.id, id)
    return c.json(agent)
  } catch (err: any) {
    return c.json({ error: err.message }, 404)
  }
})

app.put('/api/agents/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    const agent = await updateAgent(user.id, id, body)
    return c.json(agent)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.delete('/api/agents/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  try {
    await deleteAgent(user.id, id)
    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.post('/api/agents/:id/qr', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  try {
    const result = await refreshAgentQR(user.id, id)
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// ── Tools ───────────────────────────────────────────────────
app.get('/api/agents/:agentId/tools', async (c) => {
  const user = c.get('user')
  const agentId = c.req.param('agentId')
  try {
    const tools = await listTools(user.id, agentId)
    return c.json(tools)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.post('/api/agents/:agentId/tools', async (c) => {
  const user = c.get('user')
  const agentId = c.req.param('agentId')
  const body = await c.req.json()
  try {
    const tool = await createTool(user.id, agentId, body)
    return c.json(tool, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.put('/api/tools/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    const tool = await updateTool(user.id, id, body)
    return c.json(tool)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

app.delete('/api/tools/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  try {
    await deleteTool(user.id, id)
    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// ── Messages ────────────────────────────────────────────────
app.get('/api/agents/:agentId/messages', async (c) => {
  const user = c.get('user')
  const agentId = c.req.param('agentId')
  try {
    const messages = await listMessages(user.id, agentId)
    return c.json(messages)
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
app.use('/*', serveStatic({ root: './public' }))
app.get('*', serveStatic({ root: './public', path: 'index.html' }))

// ── Start server ────────────────────────────────────────────
function startServer(port: number, maxRetries = 5) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🚀 Server running at http://localhost:${info.port}`)
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && maxRetries > 0) {
      const nextPort = port + 1
      console.log(`⚠️  Port ${port} in use, trying ${nextPort}...`)
      startServer(nextPort, maxRetries - 1)
    } else {
      console.error('Failed to start server:', err)
      process.exit(1)
    }
  })
}

startServer(PORT)
