/**
 * FRONTEND SECURITY UTILITIES
 * 
 * 1. Input sanitization (XSS)
 * 2. Token validation
 * 3. Content Security
 * 4. Secure storage
 */

/* ── XSS sanitization ── */
export function sanitize(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/* ── Validate inputs ── */
export const validators = {
  phone: (p) => {
    if (!p) return false
    const clean = String(p).replace(/[\s\-\(\)]/g, '')
    return /^(\+998|998)?[0-9]{9}$/.test(clean)
  },
  amount: (n, max = 999_999_999) => {
    const num = Number(n)
    return !isNaN(num) && num >= 0 && num <= max
  },
  name: (s) => {
    if (!s) return false
    const str = String(s).trim()
    return str.length >= 2 && str.length <= 100 && !/[<>{}$]/.test(str)
  },
  safeText: (s, maxLen = 1000) => {
    if (!s) return true
    return String(s).length <= maxLen && !/<script|javascript:|on\w+=/i.test(s)
  },
  objectId: (id) => /^[a-f\d]{24}$/i.test(String(id || '')),
}

/* ── Secure token storage ── */
export const secureStorage = {
  setToken(token) {
    // sessionStorage is slightly safer than localStorage (cleared on tab close)
    // For production: use httpOnly cookies instead
    try { localStorage.setItem('token', token) } catch {}
  },
  getToken() {
    try { return localStorage.getItem('token') || '' } catch { return '' }
  },
  clearToken() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.clear()
    } catch {}
  },
  isTokenValid() {
    try {
      const token = this.getToken()
      if (!token) return false
      // Decode without verify (verify on backend)
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp && payload.exp < Date.now()/1000) {
        this.clearToken()
        return false
      }
      return true
    } catch { return false }
  },
}

/* ── CSRF protection ── */
export function getCsrfToken() {
  // Generate per-session CSRF token
  let token = sessionStorage.getItem('csrf_token')
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2,'0')).join('')
    sessionStorage.setItem('csrf_token', token)
  }
  return token
}

/* ── Rate limiting (frontend) ── */
const requestCounts = new Map()
export function checkFrontendRateLimit(key, maxPerMinute = 30) {
  const now   = Date.now()
  const entry = requestCounts.get(key) || { count:0, reset: now + 60000 }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000 }
  entry.count++
  requestCounts.set(key, entry)
  return entry.count <= maxPerMinute
}

/* ── Sanitize form data before sending ── */
export function sanitizeFormData(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const clean = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      // Remove potential injection attempts
      clean[k] = v
        .replace(/\$\w+/g, '')    // MongoDB operators
        .replace(/<script[^>]*>/gi, '')
        .trim()
        .slice(0, 2000)
    } else if (typeof v === 'number') {
      clean[k] = isNaN(v) ? 0 : Math.min(v, 999_999_999)
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeFormData(v)
    } else {
      clean[k] = v
    }
  }
  return clean
}

/* ── Auto-logout on token expiry ── */
export function watchTokenExpiry(onExpiry) {
  const check = () => {
    if (!secureStorage.isTokenValid()) {
      secureStorage.clearToken()
      onExpiry?.()
    }
  }
  const interval = setInterval(check, 60000) // har 1 daqiqa
  return () => clearInterval(interval)
}
