import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Plus, Pencil, Trash2, Bot, Search as SearchIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { StatsCard } from '@/components/patterns/stats-card'
import { SearchBar } from '@/components/patterns/search-bar'
import { Pagination } from '@/components/patterns/pagination'
import { EmptyState } from '@/components/patterns/empty-state'
import { StatusBadge } from '@/components/patterns/status-badge'

// ── Types ───────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  model: string
  whatsapp_phone: string
  status: string
  created: string
  created_at: string
}

interface AgentForm {
  name: string
  description: string
  system_prompt: string
  model: string
  whatsapp_phone: string
  status: string
}

const emptyForm: AgentForm = {
  name: '',
  description: '',
  system_prompt: '',
  model: 'llama-3.3-70b-versatile',
  whatsapp_phone: '',
  status: 'draft',
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  active: { label: 'Active', variant: 'default', className: 'bg-green-600' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  draft: { label: 'Draft', variant: 'outline' },
}

const MODEL_OPTIONS = [
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  { value: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
]

// ── Component ───────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AgentForm>(emptyForm)

  const [search, setSearch] = useState('')
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  const filtered = search
    ? agents.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      )
    : agents

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fetchAgents = async () => {
    try {
      const res = await authFetch('/api/agents')
      const data = await res.json()
      setAgents(data)
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setEditingId(agent.id)
    setForm({
      name: agent.name,
      description: agent.description || '',
      system_prompt: agent.system_prompt || '',
      model: agent.model,
      whatsapp_phone: agent.whatsapp_phone || '',
      status: agent.status,
    })
    setSheetOpen(true)
  }

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      system_prompt: form.system_prompt || undefined,
      model: form.model,
      whatsapp_phone: form.whatsapp_phone || undefined,
      status: form.status,
    }
    if (editingId) {
      await authFetch(`/api/agents/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } else {
      await authFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }
    setSheetOpen(false)
    setForm(emptyForm)
    setEditingId(null)
    fetchAgents()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus agent ini? Semua tools dan messages juga akan dihapus.')) return
    await authFetch(`/api/agents/${id}`, { method: 'DELETE' })
    fetchAgents()
  }

  const updateField = (field: keyof AgentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const activeCount = filtered.filter((a) => a.status === 'active').length
  const draftCount = filtered.filter((a) => a.status === 'draft').length

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola AI agents kamu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari agent..." />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Agent
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <StatsCard value={filtered.length} label="Total" />
        <StatsCard value={activeCount} label="Active" className="text-green-600" />
        <StatsCard value={draftCount} label="Draft" />
        <StatsCard value={filtered.length - activeCount - draftCount} label="Inactive" />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="agent"
          description='Klik "Tambah Agent" untuk mulai.'
          search={search || undefined}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-8 w-2/5">Agent</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/agents/detail?id=${agent.id}`)}
                >
                  <TableCell className="pl-8">
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{agent.description || 'No description'}</p>
                    </div>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-sm font-mono">{agent.model}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-sm">{agent.whatsapp_phone || '—'}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <StatusBadge status={agent.status} config={STATUS_CONFIG} defaultKey="draft" />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); openEdit(agent) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(agent.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Agent' : 'Tambah Agent Baru'}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nama Agent</Label>
              <Input id="name" placeholder="Nura — MHU Assistant"
                value={form.name} onChange={(e) => updateField('name', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" placeholder="AI assistant untuk travel Umrah"
                value={form.description} onChange={(e) => updateField('description', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="system_prompt">System Prompt</Label>
              <textarea id="system_prompt" rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Kamu adalah AI assistant yang..."
                value={form.system_prompt} onChange={(e) => updateField('system_prompt', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <select id="model" value={form.model} onChange={(e) => updateField('model', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" value={form.status} onChange={(e) => updateField('status', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="whatsapp_phone">WhatsApp Phone (Washarp)</Label>
              <Input id="whatsapp_phone" placeholder="6281234567890"
                value={form.whatsapp_phone} onChange={(e) => updateField('whatsapp_phone', e.target.value)} />
            </div>
          </div>
          <div className="px-4 mt-4">
            <Button onClick={handleSubmit} className="w-full">
              {editingId ? 'Simpan Perubahan' : 'Tambah Agent'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
