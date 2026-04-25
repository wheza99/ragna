import { supabase } from './supabase'

export async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    // Token expired, force sign out
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return res
}
