import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Copy, Check, Trash2, TriangleAlert, KeyRound, FileText } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle'
import 'swagger-ui-dist/swagger-ui.css'
import { swaggerSpec } from '@/swagger/spec'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  keySuffix: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}

interface NewKeyResponse {
  id: string
  name: string
  keyPrefix: string
  keySuffix: string
  createdAt: string
  rawKey: string
}

// ── Swagger sub-component ───────────────────────────────────

function SwaggerDocs({ apiKey }: { apiKey: string }) {
  const swaggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!swaggerRef.current) return

    const ui = SwaggerUIBundle({
      spec: swaggerSpec,
      domNode: swaggerRef.current,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: 'BaseLayout',
      deepLinking: true,
      showExtensions: true,
      showCommonExtensions: true,
    })

    // Pre-authorize with API Key if available
    if (apiKey) {
      ui.preauthorizeApiKey('apiKeyAuth', apiKey)
    }
  }, [apiKey])

  return (
    <div className="space-y-4">
      {/* Guide for users */}
      <div className="rounded-md bg-muted/50 border px-4 py-3 text-sm text-muted-foreground flex gap-2">
        <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Klik tombol <strong>Authorize</strong> (gembok 🔒) di atas, lalu paste API Key kamu (format: <code className="bg-muted px-1 rounded">sk-xxxx...</code>) ke kolom X-Api-Key.
          {apiKey && ' API Key kamu sudah otomatis diisi.'}
        </span>
      </div>
      <div className="swagger-ui-wrapper rounded-lg border bg-card text-card-foreground shadow-sm bg-white">
        <div ref={swaggerRef} />
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────

export function ApiKeys() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResponse | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await authFetch('/api/keys')
      const data = await res.json()
      setKeys(data)
    } catch (err) {
      console.error('Failed to fetch keys:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const createKey = async () => {
    try {
      const res = await authFetch('/api/keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName || user?.email }),
      })
      const data = await res.json()
      setNewKeyResult(data)
      setNewKeyName('')
      fetchKeys()
    } catch (err) {
      console.error('Failed to create key:', err)
    }
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Hapus API key ini?')) return
    await authFetch(`/api/keys/${id}`, { method: 'DELETE' })
    fetchKeys()
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setNewKeyResult(null)
    setNewKeyName('')
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">API</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola API key dan baca dokumentasi
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) closeDialog() }}>
          <DialogTrigger asChild>
            <Button>
              <KeyRound className="h-4 w-4 mr-2" />
              Buat API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newKeyResult ? 'API Key Dibuat!' : 'Buat API Key Baru'}
              </DialogTitle>
            </DialogHeader>

            {newKeyResult ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <code className="block rounded bg-muted px-3 py-2 text-sm font-mono">
                    {newKeyResult.name}
                  </code>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={newKeyResult.rawKey}
                      className="font-mono text-sm"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button variant="outline" size="icon"
                      onClick={() => copyToClipboard(newKeyResult.rawKey, 'key')}>
                      {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={closeDialog} className="w-full">Done</Button>

                <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 flex gap-2">
                  <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Simpan API Key kamu di tempat yang aman. Key ini hanya ditampilkan sekali dan tidak bisa dilihat lagi setelah dialog ini ditutup.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Nama (opsional)</Label>
                  <Input
                    id="keyName"
                    placeholder="contoh: My Mobile App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <Button onClick={createKey} className="w-full">Buat</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Docs
          </TabsTrigger>
        </TabsList>

        {/* ── Keys Tab ──────────────────────────────────────── */}
        <TabsContent value="keys" className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada API key.</p>
              <p className="text-sm mt-1">Klik "Buat API Key" untuk mulai.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-8 w-1/5">Nama</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/5">Key</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/5">Dibuat</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/5">Terakhir Digunakan</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="pl-8 font-medium">{key.name}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          {key.keyPrefix}...{key.keySuffix}
                        </code>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(key.createdAt).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleDateString('id-ID')
                          : '-'}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Docs Tab ──────────────────────────────────────── */}
        <TabsContent value="docs" className="mt-6">
          <SwaggerDocs apiKey={newKeyResult?.rawKey || ''} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
