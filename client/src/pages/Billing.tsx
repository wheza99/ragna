import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  CreditCard,
  Receipt,
  Wallet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  metadata: Record<string, any> | null
  created_at: string
}

interface Payment {
  id: string
  amount: number
  status: string
  url: string | null
  metadata: Record<string, any> | null
  created_at: string
}

const AMOUNT_TEMPLATES = [50000, 100000, 200000]

const statusStyle: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  void: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  refund: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const statusLabel: Record<string, string> = {
  open: 'Menunggu Pembayaran',
  paid: 'Berhasil',
  void: 'Gagal',
  expired: 'Kedaluwarsa',
  refund: 'Refund',
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function Billing() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, transactionsRes, creditsRes] = await Promise.all([
        authFetch('/api/payments'),
        authFetch('/api/transactions'),
        authFetch('/api/credits'),
      ])
      setPayments(await paymentsRes.json())
      setTransactions(await transactionsRes.json())
      const creditsData = await creditsRes.json()
      setCredits(creditsData.total || 0)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-check payment status when returning from Tripay
  useEffect(() => {
    const merchantRef = searchParams.get('tripay_merchant_ref')
    if (!merchantRef) return

    // Find matching payment and check status
    const checkReturnPayment = async () => {
      try {
        const res = await authFetch('/api/payments')
        const payments: Payment[] = await res.json()
        const matching = payments.find((p) => p.metadata?.merchant_ref === merchantRef)
        if (matching) {
          await checkStatus(matching.id)
        }
      } catch (err) {
        console.error('Failed to check return payment:', err)
      }
    }

    checkReturnPayment()
    setSearchParams({}, { replace: true })
  }, [searchParams])

  const handleTopup = async () => {
    const amount = Number(topupAmount)
    if (!amount || amount < 1000) return

    setTopupLoading(true)
    try {
      const res = await authFetch('/api/payments/topup', {
        method: 'POST',
        body: JSON.stringify({ amount, method: 'QRIS' }),
      })
      const data = await res.json()

      if (data.url) {
        window.open(data.url, '_blank')
      }

      setDialogOpen(false)
      setTopupAmount('')
      fetchData()
    } catch (err) {
      console.error('Failed to create payment:', err)
    } finally {
      setTopupLoading(false)
    }
  }

  const checkStatus = async (paymentId: string) => {
    setCheckingId(paymentId)
    try {
      const res = await authFetch(`/api/payments/${paymentId}/status`)
      const updated = await res.json()
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? updated : p)))
      // Refresh credits & transactions after status check
      fetchData()
    } catch (err) {
      console.error('Failed to check status:', err)
    } finally {
      setCheckingId(null)
    }
  }

  const getPaymentAction = (payment: Payment) => {
    if (payment.status === 'open') {
      return (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!payment.url} onClick={() => payment.url && window.open(payment.url, '_blank')}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => checkStatus(payment.id)} disabled={checkingId === payment.id}>
            <RefreshCw className={`h-4 w-4 ${checkingId === payment.id ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )
    }
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!payment.url} onClick={() => payment.url && window.open(payment.url, '_blank')}>
        <ExternalLink className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pembayaran dan riwayat transaksi
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setTopupAmount('') }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              Tambah Credits
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Top Up Credits</DialogTitle>
              <DialogDescription>
                Pilih nominal atau masukkan jumlah custom untuk top up balance kamu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah (IDR)</label>
                <Input
                  type="text"
                  placeholder="Masukkan jumlah"
                  value={topupAmount ? formatRupiah(Number(topupAmount)) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setTopupAmount(raw)
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Pilih cepat</label>
                <div className="grid grid-cols-3 gap-2">
                  {AMOUNT_TEMPLATES.map((amount) => (
                    <Button
                      key={amount}
                      variant={topupAmount === String(amount) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTopupAmount(String(amount))}
                    >
                      {formatRupiah(amount)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleTopup} disabled={!topupAmount || Number(topupAmount) < 1000 || topupLoading}>
                {topupLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Top Up'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border px-6 py-4 mb-6 flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Credits</p>
          <p className="text-2xl font-bold">{formatRupiah(credits)}</p>
        </div>
      </div>

      <Tabs defaultValue="transaction">
        <TabsList>
          <TabsTrigger value="transaction" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Transaction
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Belum ada pembayaran.</p>
              <p className="text-sm mt-1">Klik "Tambah Credits" untuk top up.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-8 w-1/4">Tanggal</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/4">Jumlah</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/4">Status</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="pl-8 text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="font-medium">
                        {formatRupiah(payment.amount)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabel[payment.status] || payment.status}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        {getPaymentAction(payment)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transaction" className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Belum ada transaksi.</p>
              <p className="text-sm mt-1">Transaksi kamu akan muncul di sini.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-8 w-1/3">Tanggal</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/3">Deskripsi</TableHead>
                    <TableHead className="py-2"><Separator orientation="vertical" /></TableHead>
                    <TableHead className="w-1/3">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="pl-8 text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className={tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {tx.type === 'credit' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
