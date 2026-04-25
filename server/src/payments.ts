import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Payments Management — Tripay integration
 *
 * Flow:
 * 1. User create top-up request → INSERT to payments (status: 'open')
 * 2. Server calls Tripay API to create transaction
 * 3. Tripay callback → server updates status via service role (bypass RLS)
 * 4. If paid → add credits to user
 *
 * Status: open → paid / void / expired
 */

// ── CRUD ───────────────────────────────────────────────────

export async function createPayment(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  amount: number,
  method: string = 'QRIS',
  returnUrl: string = ''
) {
  // Validate amount
  if (!amount || amount < 1000) {
    throw new Error('Minimum top up Rp 1.000')
  }

  const { TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE, TRIPAY_API_URL } = process.env

  if (!TRIPAY_API_KEY || !TRIPAY_PRIVATE_KEY || !TRIPAY_MERCHANT_CODE) {
    throw new Error('Payment gateway not configured')
  }

  const baseUrl = TRIPAY_API_URL || 'https://tripay.co.id/api'

  const crypto = await import('crypto')
  const axios = (await import('axios')).default

  const timestamp = Math.floor(Date.now() / 1000)
  const random = Math.floor(Math.random() * 10000)
  const merchant_ref = `TOPUP-${timestamp}-${random}`

  const apiUrl = `${baseUrl}/transaction/create`

  const signature = crypto
    .createHmac('sha256', TRIPAY_PRIVATE_KEY)
    .update(TRIPAY_MERCHANT_CODE + merchant_ref + String(amount))
    .digest('hex')

  const expiredTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60)

  // Create Tripay transaction
  const response = await axios.post(apiUrl, {
    method,
    merchant_ref,
    amount,
    customer_name: userEmail.split('@')[0],
    customer_email: userEmail,
    customer_phone: '',
    order_items: [{
      sku: 'CREDIT-TOPUP',
      name: 'Credit Top Up',
      price: amount,
      quantity: 1,
    }],
    expired_time: expiredTime,
    return_url: returnUrl,
    signature,
  }, {
    headers: { Authorization: `Bearer ${TRIPAY_API_KEY}` },
    validateStatus: (status: number) => status < 999,
  })

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to create Tripay transaction')
  }

  // Save to DB
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount,
      status: 'open',
      url: response.data.data?.checkout_url,
      metadata: {
        merchant_ref,
        method,
        qr_url: response.data.data?.qr_url,
        reference: response.data.data?.reference,
        tripay_response: response.data.data,
      },
    })
    .select('id, amount, status, url, metadata, created_at')
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function listPayments(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, url, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getPayment(supabase: SupabaseClient, userId: string, paymentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, url, metadata, created_at')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single()

  if (error) throw new Error('Payment not found')
  return data
}

/**
 * Check payment status from Tripay and update DB
 * Uses service role client (bypass RLS)
 */
export async function checkAndUpdatePaymentStatus(
  supabaseAdmin: SupabaseClient,
  paymentId: string
) {
  // Get payment
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('id, user_id, amount, status, metadata')
    .eq('id', paymentId)
    .single()

  if (error || !payment) throw new Error('Payment not found')
  if (payment.status !== 'open') return payment

  const tripayRef = payment.metadata?.reference
  if (!tripayRef) return payment

  const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY!
  const baseUrl = process.env.TRIPAY_API_URL || 'https://tripay.co.id/api'

  const axios = (await import('axios')).default

  const response = await axios.get(`${baseUrl}/transaction/detail`, {
    params: { reference: tripayRef },
    headers: { Authorization: `Bearer ${TRIPAY_API_KEY}` },
  })

  if (!response.data.success) {
    throw new Error('Failed to check Tripay status')
  }

  const tripayStatus = response.data.data?.status
  const statusMap: Record<string, string> = {
    PAID: 'paid',
    UNPAID: 'open',
    PENDING: 'open',
    EXPIRED: 'expired',
    CANCELED: 'void',
    FAILED: 'void',
    REFUND: 'refund',
  }
  const newStatus = statusMap[tripayStatus] || 'open'

  if (newStatus === 'open') return payment

  // Update payment status via service role
  const { data: updatedPayment } = await supabaseAdmin
    .from('payments')
    .update({ status: newStatus })
    .eq('id', paymentId)
    .select('id, amount, status, url, metadata, created_at')
    .single()

  // If PAID → add credits + create transaction
  if (tripayStatus === 'PAID') {
    // Add credits (upsert)
    const { data: existingCredit } = await supabaseAdmin
      .from('credits')
      .select('id, total')
      .eq('user_id', payment.user_id)
      .single()

    if (existingCredit) {
      await supabaseAdmin
        .from('credits')
        .update({ total: (existingCredit.total || 0) + payment.amount, updated_at: new Date().toISOString() })
        .eq('id', existingCredit.id)
    } else {
      await supabaseAdmin
        .from('credits')
        .insert({ user_id: payment.user_id, total: payment.amount })
    }

    // Create transaction record
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: payment.user_id,
        description: 'Credit Top Up',
        amount: payment.amount,
        type: 'credit',
        metadata: { payment_id: payment.id },
      })
  }

  return updatedPayment || payment
}
