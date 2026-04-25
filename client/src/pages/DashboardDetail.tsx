import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { authFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Copy, Check, Settings, FileText,
  Plus, Trash2, Search, Loader2,
  UploadCloud, X, Pencil,
} from 'lucide-react'
import { StatsCard } from '@/components/patterns/stats-card'
import { SearchBar } from '@/components/patterns/search-bar'
import { Pagination } from '@/components/patterns/pagination'
import { EmptyState } from '@/components/patterns/empty-state'
import { ConfigField } from '@/components/patterns/config-field'
import { FileUpload } from '@/components/patterns/file-upload'

// ── Types ───────────────────────────────────────────────────

interface TodoData {
  id: number
  text: string
  done: boolean
  priority?: string
  notes?: string
  attachment?: string | null
}

interface NoteForm {
  text: string
}

// ── Helpers ─────────────────────────────────────────────────

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ── Component ───────────────────────────────────────────────

export function DashboardDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = searchParams.get('id')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parent data (the todo itself)
  const [todo, setTodo] = useState<{ id: number; text: string; done: boolean; priority?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Child data (notes/sub-tasks)
  const [notes, setNotes] = useState<TodoData[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Note detail sheet (RULE: view child detail → Sheet)
  const [selectedNote, setSelectedNote] = useState<TodoData | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Add/Edit note sheet
  const [formSheetOpen, setFormSheetOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [noteForm, setNoteForm] = useState<NoteForm>({ text: '' })
  const [submitting, setSubmitting] = useState(false)

  // File upload dialog (RULE: action inside Sheet → Dialog)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const filteredNotes = search
    ? notes.filter((n) => n.text.toLowerCase().includes(search.toLowerCase()))
    : notes

  const totalPages = Math.ceil(filteredNotes.length / PAGE_SIZE)
  const paginatedNotes = filteredNotes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Fetch parent ────────────────────────────────────────
  const fetchTodo = useCallback(async () => {
    // In real app, this would fetch from API. Using todos as example.
    setTodo({ id: Number(id), text: `Todo #${id}`, done: false, priority: 'medium' })
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchTodo()
  }, [fetchTodo])

  // ── Fetch children ──────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    // Simulated child data
    setNotes([
      { id: 1, text: 'Research best practices', done: true, priority: 'high' },
      { id: 2, text: 'Write documentation', done: false, priority: 'medium', attachment: null },
      { id: 3, text: 'Setup CI/CD pipeline', done: false, priority: 'high' },
      { id: 4, text: 'Code review', done: true, priority: 'low' },
      { id: 5, text: 'Deploy to staging', done: false, priority: 'medium', attachment: 'deploy-plan.pdf' },
    ])
    setNotesLoading(false)
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // ── Note CRUD ────────────────────────────────────────────
  const openCreateNote = () => {
    setEditingNoteId(null)
    setNoteForm({ text: '' })
    setFormSheetOpen(true)
  }

  const openEditNote = (note: TodoData) => {
    setEditingNoteId(note.id)
    setNoteForm({ text: note.text })
    setFormSheetOpen(true)
  }

  const openNoteDetail = (note: TodoData) => {
    setSelectedNote(note)
    setSheetOpen(true)
  }

  const handleNoteSubmit = async () => {
    setSubmitting(true)
    // In real app: authFetch POST/PUT
    setFormSheetOpen(false)
    setNoteForm({ text: '' })
    setEditingNoteId(null)
    fetchNotes()
    setSubmitting(false)
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Hapus note ini?')) return
    // In real app: authFetch DELETE
    fetchNotes()
  }

  // ── File upload (RULE: action inside Sheet → Dialog) ────
  const openUploadDialog = () => {
    setSelectedFile(null)
    setPreview(null)
    setDialogOpen(true)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    setUploading(true)
    // In real app: authFetch POST with FormData
    if (selectedNote) {
      setNotes((prev) =>
        prev.map((n) => n.id === selectedNote.id ? { ...n, attachment: selectedFile?.name || 'uploaded' } : n)
      )
    }
    setUploading(false)
    setDialogOpen(false)
    setPreview(null)
    setSelectedFile(null)
  }

  // ── Config fields ───────────────────────────────────────
  const configFields: { label: string; value: string | null; full: boolean; copy: boolean }[] = todo ? [
    { label: 'Text', value: todo.text, full: true, copy: true },
    { label: 'Status', value: todo.done ? 'Done' : 'Pending', full: false, copy: false },
    { label: 'Priority', value: todo.priority || 'medium', full: false, copy: false },
    { label: 'ID', value: todo.id.toString(), full: false, copy: false },
    { label: 'Created At', value: formatDate(new Date().toISOString()), full: false, copy: false },
  ] : []

  const doneCount = filteredNotes.filter((n) => n.done).length

  if (!id) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-6">
        <p className="text-muted-foreground">ID tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      {/* Back button */}
      <Button variant="outline" size="icon" className="mb-4" onClick={() => navigate('/todos')}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : !todo ? (
        <p className="text-center text-muted-foreground py-8">Todo tidak ditemukan.</p>
      ) : (
        <>
          {/* Header + Badge */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{todo.text}</h1>
                {todo.done ? (
                  <Badge variant="default" className="bg-green-600">Done</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">Detail todo</p>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="flex gap-4 mb-6">
            <StatsCard value={filteredNotes.length} label="Total Notes" />
            <StatsCard value={doneCount} label="Selesai" className="text-green-600" />
            <StatsCard value={filteredNotes.length - doneCount} label="Pending" />
          </div>

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </TabsTrigger>
            </TabsList>

            {/* ── Notes Tab (child table) ────────────────── */}
            <TabsContent value="notes" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Cari notes..." />
                <Button onClick={openCreateNote}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Note
                </Button>
              </div>

              {notesLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="notes"
                  description='Klik "Tambah Note" untuk mulai.'
                  search={search || undefined}
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-8 w-1/2">Note</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead>Attachment</TableHead>
                        <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedNotes.map((note) => (
                        <TableRow
                          key={note.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openNoteDetail(note)}
                        >
                          <TableCell className="pl-8 font-medium">
                            {note.text}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            {note.done ? (
                              <Badge variant="default" className="text-xs bg-green-600">Done</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {note.attachment || '—'}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); openEditNote(note) }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
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
                    totalItems={filteredNotes.length}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              )}
            </TabsContent>

            {/* ── Configuration Tab ─────────────────────── */}
            <TabsContent value="config" className="mt-6">
              <Card className="rounded-md">
                <CardHeader>
                  <CardTitle className="text-base">Configuration</CardTitle>
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

      {/* ── Note Detail Sheet (RULE: view child → Sheet) ──── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedNote(null) }}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selectedNote && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedNote.text}</SheetTitle>
                <SheetDescription>Detail Note</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                {/* Status */}
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">
                    {selectedNote.done ? (
                      <Badge variant="default" className="bg-green-600">Done</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Priority */}
                <div>
                  <Label className="text-muted-foreground text-xs">Priority</Label>
                  <p className="text-sm mt-1">{selectedNote.priority || 'medium'}</p>
                </div>

                <Separator />

                {/* Attachment */}
                <div>
                  <Label className="text-muted-foreground text-xs">Attachment</Label>
                  <div className="mt-2">
                    {selectedNote.attachment ? (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedNote.attachment}</span>
                        <Check className="h-4 w-4 text-green-600 ml-auto" />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Belum ada attachment.</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={openUploadDialog}
                  >
                    <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                    {selectedNote.attachment ? 'Ganti File' : 'Upload File'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Upload Dialog (RULE: action in Sheet → Dialog) ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setPreview(null); setSelectedFile(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              preview={preview}
              onClear={() => { setPreview(null); setSelectedFile(null) }}
            />
            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                'Upload'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Note Sheet ────────────────────────────── */}
      <Sheet open={formSheetOpen} onOpenChange={setFormSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingNoteId ? 'Edit Note' : 'Tambah Note Baru'}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="noteText">Note</Label>
              <Input
                id="noteText"
                placeholder="contoh: Research best practices"
                value={noteForm.text}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, text: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleNoteSubmit()}
              />
            </div>
          </div>
          <div className="px-4 mt-4">
            <Button onClick={handleNoteSubmit} className="w-full" disabled={submitting}>
              {submitting ? 'Menyimpan...' : editingNoteId ? 'Simpan Perubahan' : 'Tambah Note'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
