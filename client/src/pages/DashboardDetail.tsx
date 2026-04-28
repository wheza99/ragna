import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Settings, Wrench, MessageSquare,
  Plus, Trash2, Pencil, Bot,
} from 'lucide-react'
import { StatsCard } from '@/components/patterns/stats-card'
import { SearchBar } from '@/components/patterns/search-bar'
import { Pagination } from '@/components/patterns/pagination'
import { EmptyState } from '@/components/patterns/empty-state'
import { ConfigField } from '@/components/patterns/config-field'
import { StatusBadge } from '@/components/patterns/status-badge'

// ── Types ───────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  model: string
  washarp_session_id: string
  washarp_phone: string
  washarp_status: string
  status: string
  created_at: string
}

interface Tool {
  id: string
  name: string
  description: string
  method: string
  url: string
  headers: Record<string, string> | null
  body: Record<string, unknown> | null
  status: string
  created_at: string
}

interface Message {
  id: string
  phone: string
  direction: string
  content: string
  status: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface ToolForm {
  name: string
  description: string
  method: string
  url: string
  headers: string
  body: string
  status: string
}

const emptyToolForm: ToolForm = {
  name: '', description: '', method: 'GET', url: '', headers: '', body: '', status: 'active',
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  active: { label: 'Active', variant: 'default', className: 'bg-green-600' },
  inactive: { label: 'Inactive', variant: 'secondary' },
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-600',
  POST: 'bg-green-600',
  PUT: 'bg-yellow-600',
  PATCH: 'bg-orange-600',
  DELETE: 'bg-red-600',
}

// ── Component ───────────────────────────────────────────────

export function DashboardDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const id = searchParams.get('id')

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  const [tools, setTools] = useState<Tool[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  // Tools sheet
  const [toolSheetOpen, setToolSheetOpen] = useState(false)
  const [editingToolId, setEditingToolId] = useState<string | null>(null)
  const [toolForm, setToolForm] = useState<ToolForm>(emptyToolForm)

  // Search & pagination for messages
  const [msgSearch, setMsgSearch] = useState('')
  const MSG_PAGE_SIZE = 10
  const [msgPage, setMsgPage] = useState(1)

  const filteredMessages = msgSearch
    ? messages.filter((m) =>
        m.phone.includes(msgSearch) || m.content.toLowerCase().includes(msgSearch.toLowerCase())
      )
    : messages
  const msgTotalPages = Math.ceil(filteredMessages.length / MSG_PAGE_SIZE)
  const paginatedMessages = filteredMessages.slice((msgPage - 1) * MSG_PAGE_SIZE, msgPage * MSG_PAGE_SIZE)

  // ── Fetch agent ────────────────────────────────────────
  const fetchAgent = useCallback(async () => {
    if (!id) return
    try {
      const res = await authFetch(`/api/agents/${id}`)
      if (!res.ok) throw new Error('Not found')
      setAgent(await res.json())
    } catch { setAgent(null) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchAgent() }, [fetchAgent])

  // ── Fetch tools ────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    if (!id) return
    try {
      const res = await authFetch(`/api/agents/${id}/tools`)
      setTools(await res.json())
    } catch { setTools([]) }
  }, [id])

  useEffect(() => { fetchTools() }, [fetchTools])

  // ── Fetch messages ─────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!id) return
    try {
      const res = await authFetch(`/api/agents/${id}/messages`)
      setMessages(await res.json())
    } catch { setMessages([]) }
  }, [id])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  // ── Tool CRUD ──────────────────────────────────────────
  const openCreateTool = () => {
    setEditingToolId(null)
    setToolForm(emptyToolForm)
    setToolSheetOpen(true)
  }

  const openEditTool = (tool: Tool) => {
    setEditingToolId(tool.id)
    setToolForm({
      name: tool.name,
      description: tool.description || '',
      method: tool.method,
      url: tool.url,
      headers: tool.headers ? JSON.stringify(tool.headers, null, 2) : '',
      body: tool.body ? JSON.stringify(tool.body, null, 2) : '',
      status: tool.status,
    })
    setToolSheetOpen(true)
  }

  const handleToolSubmit = async () => {
    let parsedHeaders = null
    let parsedBody = null
    try { if (toolForm.headers) parsedHeaders = JSON.parse(toolForm.headers) } catch {}
    try { if (toolForm.body) parsedBody = JSON.parse(toolForm.body) } catch {}

    const payload = {
      name: toolForm.name,
      description: toolForm.description || undefined,
      method: toolForm.method,
      url: toolForm.url,
      headers: parsedHeaders,
      body: parsedBody,
      status: toolForm.status,
    }

    if (editingToolId) {
      await authFetch(`/api/tools/${editingToolId}`, { method: 'PUT', body: JSON.stringify(payload) })
    } else {
      await authFetch(`/api/agents/${id}/tools`, { method: 'POST', body: JSON.stringify(payload) })
    }
    setToolSheetOpen(false)
    setToolForm(emptyToolForm)
    setEditingToolId(null)
    fetchTools()
  }

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm('Hapus tool ini?')) return
    await authFetch(`/api/tools/${toolId}`, { method: 'DELETE' })
    fetchTools()
  }

  // ── Config fields ──────────────────────────────────────
  const configFields = agent ? [
    { label: 'Name', value: agent.name, full: true, copy: true },
    { label: 'Description', value: agent.description, full: true, copy: false },
    { label: 'Model', value: agent.model, full: false, copy: false },
    { label: 'Status', value: agent.status, full: false, copy: false },
    { label: 'WAHA Session', value: agent.washarp_session_id || '—', full: false, copy: true },
    { label: 'WA Status', value: agent.washarp_status || '—', full: false, copy: false },
    { label: 'WA Phone', value: agent.washarp_phone || '—', full: false, copy: true },
    { label: 'Created', value: agent.created_at ? new Date(agent.created_at).toLocaleString('id-ID') : '-', full: false, copy: false },
    { label: 'System Prompt', value: agent.system_prompt || '—', full: true, copy: false },
  ] : []

  const inboundCount = filteredMessages.filter((m) => m.direction === 'inbound').length
  const outboundCount = filteredMessages.filter((m) => m.direction === 'outbound').length

  if (!id) return <div className="max-w-7xl mx-auto py-8 px-6"><p className="text-muted-foreground">ID tidak ditemukan.</p></div>

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <Button variant="outline" size="icon" className="mb-4" onClick={() => navigate('/todos')}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : !agent ? (
        <p className="text-center text-muted-foreground py-8">Agent tidak ditemukan.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <Badge variant={agent.washarp_status === 'connected' ? 'default' : 'secondary'} className={agent.washarp_status === 'connected' ? 'bg-green-600' : ''}>
                  WA: {agent.washarp_status || '—'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">{agent.description || 'No description'}</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <StatsCard value={tools.length} label="Tools" />
            <StatsCard value={inboundCount + outboundCount} label="Messages" />
            <StatsCard value={inboundCount} label="Inbound" className="text-blue-600" />
            <StatsCard value={outboundCount} label="Outbound" className="text-green-600" />
          </div>

          <Tabs defaultValue="tools">
            <TabsList>
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Tools
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Messages
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Configuration
              </TabsTrigger>
            </TabsList>

            {/* ── Tools Tab ──────────────────────────────── */}
            <TabsContent value="tools" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">HTTP API tools yang bisa dipanggil oleh AI agent</p>
                <Button onClick={openCreateTool}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Tool
                </Button>
              </div>

              {tools.length === 0 ? (
                <EmptyState icon={Wrench} title="tool" description='Klik "Tambah Tool" untuk menambahkan HTTP API tool.' />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-8 w-2/5">Tool</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tools.map((tool) => (
                        <TableRow key={tool.id}>
                          <TableCell className="pl-8">
                            <div>
                              <p className="font-medium">{tool.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[250px]">{tool.description || 'No description'}</p>
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Badge className={`text-xs text-white ${METHOD_COLORS[tool.method] || 'bg-gray-600'}`}>
                              {tool.method}
                            </Badge>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-xs font-mono max-w-[200px] truncate">{tool.url}</TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <StatusBadge status={tool.status} config={STATUS_CONFIG} defaultKey="active" />
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => openEditTool(tool)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteTool(tool.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ── Messages Tab ──────────────────────────── */}
            <TabsContent value="messages" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <SearchBar value={msgSearch} onChange={(v) => { setMsgSearch(v); setMsgPage(1) }} placeholder="Cari phone atau pesan..." />
              </div>

              {filteredMessages.length === 0 ? (
                <EmptyState icon={MessageSquare} title="message" description="Belum ada pesan masuk atau keluar." />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-8 w-2/5">Message</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMessages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="pl-8 text-sm max-w-[300px] truncate">{msg.content}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-sm font-mono">{msg.phone}</TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Badge variant={msg.direction === 'inbound' ? 'default' : 'secondary'}
                              className={`text-xs ${msg.direction === 'inbound' ? 'bg-blue-600' : 'bg-green-600'}`}>
                              {msg.direction === 'inbound' ? '← In' : '→ Out'}
                            </Badge>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {msg.created_at ? new Date(msg.created_at).toLocaleString('id-ID') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={msgPage} totalPages={msgTotalPages} onPageChange={setMsgPage}
                    totalItems={filteredMessages.length} pageSize={MSG_PAGE_SIZE}
                  />
                </div>
              )}
            </TabsContent>

            {/* ── Configuration Tab ─────────────────────── */}
            <TabsContent value="config" className="mt-6">
              <Card className="rounded-md">
                <CardHeader>
                  <CardTitle className="text-base">Agent Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {configFields.map(({ label, value, full, copy }) => (
                      <ConfigField key={label} label={label} value={value} full={full} copy={copy} />
                    ))}
                  </div>
                </CardContent>
                <div className="h-2" />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ── Tool Create/Edit Sheet ────────────────────────── */}
      <Sheet open={toolSheetOpen} onOpenChange={setToolSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingToolId ? 'Edit Tool' : 'Tambah Tool Baru'}</SheetTitle>
            <SheetDescription>HTTP API request yang bisa dipanggil oleh AI agent</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="col-span-2 space-y-2">
              <Label>Name</Label>
              <Input placeholder="GET Packages" value={toolForm.name} onChange={(e) => setToolForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Input placeholder="Tool untuk mendapatkan daftar paket" value={toolForm.description} onChange={(e) => setToolForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select value={toolForm.method} onChange={(e) => setToolForm((p) => ({ ...p, method: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={toolForm.status} onChange={(e) => setToolForm((p) => ({ ...p, status: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>URL</Label>
              <Input placeholder="https://api.example.com/v1/packages" value={toolForm.url} onChange={(e) => setToolForm((p) => ({ ...p, url: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Headers (JSON)</Label>
              <textarea rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder='{"X-Api-Key": "sk-xxx", "Content-Type": "application/json"}'
                value={toolForm.headers} onChange={(e) => setToolForm((p) => ({ ...p, headers: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Body (JSON)</Label>
              <textarea rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder='{"from": "628xxx", "to": "{{phone}}", "text": "{{reply}}"}'
                value={toolForm.body} onChange={(e) => setToolForm((p) => ({ ...p, body: e.target.value }))} />
            </div>
          </div>
          <div className="px-4 mt-4">
            <Button onClick={handleToolSubmit} className="w-full">
              {editingToolId ? 'Simpan Perubahan' : 'Tambah Tool'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
