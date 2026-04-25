import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { authFetch } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Plus, Pencil, Trash2, ClipboardList, Eye } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { StatsCard } from '@/components/patterns/stats-card'
import { SearchBar } from '@/components/patterns/search-bar'
import { Pagination } from '@/components/patterns/pagination'
import { EmptyState } from '@/components/patterns/empty-state'
import { StatusBadge } from '@/components/patterns/status-badge'

// ── Types ───────────────────────────────────────────────────

interface Todo {
  id: number
  text: string
  done: boolean
  created_at?: string
  priority?: string
}

interface TodoForm {
  text: string
  priority: string
}

const emptyForm: TodoForm = { text: '', priority: 'medium' }

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  high: { label: 'High', variant: 'destructive' },
  medium: { label: 'Medium', variant: 'default', className: 'bg-yellow-600' },
  low: { label: 'Low', variant: 'secondary' },
}

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// ── Component ───────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  // Create/Edit sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TodoForm>(emptyForm)

  // View sheet
  const [viewTodo, setViewTodo] = useState<Todo | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  // Search & pagination
  const [search, setSearch] = useState('')
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  const filteredTodos = search
    ? todos.filter((t) =>
        t.text.toLowerCase().includes(search.toLowerCase()) ||
        t.priority?.toLowerCase().includes(search.toLowerCase())
      )
    : todos

  const totalPages = Math.ceil(filteredTodos.length / PAGE_SIZE)
  const paginatedTodos = filteredTodos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Fetch ───────────────────────────────────────────────
  const fetchTodos = async () => {
    try {
      const res = await authFetch('/api/todos')
      const data = await res.json()
      setTodos(data)
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  // ── Sheet handlers ──────────────────────────────────────
  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  const openEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setForm({ text: todo.text, priority: todo.priority || 'medium' })
    setSheetOpen(true)
  }

  const openView = (todo: Todo) => {
    setViewTodo(todo)
    setViewOpen(true)
  }

  const handleSubmit = async () => {
    if (editingId) {
      await authFetch(`/api/todos/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ done: false, priority: form.priority, text: form.text }),
      })
    } else {
      await authFetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text: `${form.priority}:${form.text}` }),
      })
    }
    setSheetOpen(false)
    setForm(emptyForm)
    setEditingId(null)
    fetchTodos()
  }

  const toggleTodo = async (id: number, done: boolean) => {
    await authFetch(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ done: !done }),
    })
    fetchTodos()
  }

  const deleteTodo = async (id: number) => {
    if (!confirm('Hapus todo ini?')) return
    await authFetch(`/api/todos/${id}`, { method: 'DELETE' })
    fetchTodos()
  }

  const updateField = (field: keyof TodoForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── Stats ───────────────────────────────────────────────
  const doneCount = filteredTodos.filter((t) => t.done).length
  const highCount = filteredTodos.filter((t) => t.priority === 'high').length

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola todo list kamu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari todo..." />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Todo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <StatsCard value={filteredTodos.length} label="Total" />
        <StatsCard value={doneCount} label="Selesai" className="text-green-600" />
        <StatsCard value={filteredTodos.length - doneCount} label="Pending" />
        <StatsCard value={highCount} label="High Priority" className="text-red-500" />
      </div>

      {/* Table / Empty State */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : filteredTodos.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="todo"
          description='Klik "Tambah Todo" untuk mulai.'
          search={search || undefined}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-8 w-1/2">Todo</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTodos.map((todo) => (
                <TableRow
                  key={todo.id}
                  className="cursor-pointer"
                  onClick={() => openView(todo)}
                >
                  <TableCell className="pl-8 font-medium">
                    <span className={todo.done ? 'line-through text-muted-foreground' : ''}>
                      {todo.text}
                    </span>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <StatusBadge status={todo.priority || 'medium'} config={PRIORITY_CONFIG} defaultKey="medium" />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    {todo.done ? (
                      <Badge variant="default" className="text-xs bg-green-600">Done</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); toggleTodo(todo.id, todo.done) }}
                      >
                        {todo.done ? '↩️' : '✓'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); openEdit(todo) }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id) }}
                      >
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
            totalItems={filteredTodos.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {/* View Sheet */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewTodo?.text || 'Untitled'}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 px-4">
            {viewTodo && [
              { label: 'Text', value: viewTodo.text, full: true },
              { label: 'Status', value: viewTodo.done ? 'Done' : 'Pending', full: false },
              { label: 'Priority', value: viewTodo.priority || 'medium', full: false },
              { label: 'ID', value: viewTodo.id.toString(), full: false },
            ].map(({ label, value, full }) => (
              <div key={label} className={`space-y-1 ${full ? 'col-span-2' : ''}`}>
                <Label className="text-muted-foreground">{label}</Label>
                <Input readOnly value={value || '-'} className="font-mono text-sm" />
              </div>
            ))}
          </div>
          <div className="px-4 mt-4">
            <Button
              className="w-full"
              onClick={() => { navigate(`/todos/detail?id=${viewTodo?.id}`); setViewOpen(false) }}
            >
              <Eye className="h-4 w-4 mr-2" /> Lihat Detail
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingId ? 'Edit Todo' : 'Tambah Todo Baru'}
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="text">Todo</Label>
              <Input
                id="text"
                placeholder="contoh: Belajar Hono"
                value={form.text}
                onChange={(e) => updateField('text', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-4 mt-4">
            <Button onClick={handleSubmit} className="w-full">
              {editingId ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
