// Backend API istemcisi. Bearer token ekler, 401'de oturumu düşürür.
// Ortak backend: health-tracker, etsy, flm hepsi buna konuşur (bkz. backend/BACKEND_PLAN.md).

const API_BASE = (
  import.meta.env.VITE_API_BASE || 'https://backend-production-0b2bb.up.railway.app'
).replace(/\/$/, '')

const TOKEN_KEY = 'ht_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// OAuth dönüşünde URL fragment'indeki #token=... değerini yakala ve sakla.
// main.jsx'te render'dan ÖNCE çağrılır. URL'i temizler ki token adres çubuğunda kalmasın.
export function captureTokenFromUrl() {
  const hash = window.location.hash || ''
  if (hash.startsWith('#token=')) {
    const token = decodeURIComponent(hash.slice('#token='.length))
    if (token) setToken(token)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return Boolean(token)
  }
  return false
}

// Girişi başlat: backend'in ortak Google OAuth akışına yönlendir.
// redirect = giriş sonrası dönülecek bu app'in URL'i (backend ALLOWED_ORIGINS ile doğrular).
export function login() {
  const back = window.location.origin + window.location.pathname
  window.location.href = `${API_BASE}/api/auth/google?redirect=${encodeURIComponent(back)}`
}

export function logout() {
  clearToken()
  window.location.reload()
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Ana fetch sarmalayıcı. path '/api/...' ile başlar. body verilirse JSON'a çevrilir.
export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('ht-unauthorized'))
    throw new ApiError(401, 'Oturum süresi doldu, tekrar giriş yap')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || `HTTP ${res.status}`)
  return data
}

export { API_BASE }
