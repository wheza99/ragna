import { pb } from './pocketbase'

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = pb.authStore.token

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
    pb.authStore.clear()
    window.location.href = '/login'
  }

  return res
}
