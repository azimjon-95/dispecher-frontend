/* ═══════════════════════════════════════════════════
   api.js — Offline-first API client
   Mock data O'CHIRILDI — faqat real API + offline queue
═══════════════════════════════════════════════════ */
import axios from 'axios'
import { enqueue, getQueue, dequeue, queueSize } from './offlineQueue.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const http = axios.create({ baseURL: BASE_URL + '/api', timeout: 12000 })

http.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
http.interceptors.response.use(
  r => r.data,
  err => {
    const status = err?.response?.status
    // 401 yoki 403 — token yaroqsiz yoki muddati o'tgan
    if (status === 401 || status === 403) {
      // LocalStorage tozala
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Toast chiqar (agar mavjud bo'lsa)
      try {
        const event = new CustomEvent('auth:expired', {
          detail: { msg: 'Sessiya muddati tugadi. Qayta kiring.' }
        })
        window.dispatchEvent(event)
      } catch {}
      // Login sahifasiga yo'naltir (hard reload)
      setTimeout(() => { window.location.href = '/' }, 800)
    }
    return Promise.reject(new Error(err?.response?.data?.error || err?.message || 'Server xatosi'))
  }
)

/* ── Online state — kuchli aniqlash ── */
let _online = navigator.onLine

// navigator.onLine har doim ishonchli emas
// Server ping bilan tekshiramiz
let _lastPing = 0
async function pingServer() {
  try {
    await fetch(BASE_URL + '/health', { method:'HEAD', signal: AbortSignal.timeout(3000) })
    if (!_online) { _online = true; window.dispatchEvent(new Event('online')) }
    return true
  } catch {
    if (_online) { _online = false; window.dispatchEvent(new Event('offline')) }
    return false
  }
}

// Har 8 soniyada ping (faqat online tuyulsa)
setInterval(() => {
  if (navigator.onLine) pingServer()
  else if (_online) { _online = false; window.dispatchEvent(new Event('offline')) }
}, 8000)

window.addEventListener('online',  () => { pingServer() })
window.addEventListener('offline', () => { _online = false })

export function isOnline() { return _online }

/* ── Normalize → always array ── */
export function norm(res) {
  if (Array.isArray(res))       return res
  if (Array.isArray(res?.data)) return res.data
  return []
}

/* ── Retry helper ── */
async function withRetry(fn, retries = 3, delay = 800) {
  for (let i = 0; i < retries; i++) {
    try { return await fn() }
    catch (e) {
      if (i === retries - 1) throw e
      if (e?.response?.status < 500) throw e
      await new Promise(r => setTimeout(r, delay * (i + 1)))
    }
  }
}

/* ── Offline-safe mutation ── */
const _pendingKeys = new Set()

// Stable hash for dedup (not timestamp-based)
function makeKey(method, url, data) {
  const str = method + '|' + url + '|' + JSON.stringify(data || {})
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return String(h)
}

async function mutate(method, url, data, optimistic) {
  const key = makeKey(method, url, data)
  
  // Prevent duplicate in-flight (e.g. double click)
  if (_pendingKeys.has(key)) {
    return null
  }
  _pendingKeys.add(key)
  setTimeout(() => _pendingKeys.delete(key), 8000)

  if (!_online) {
    // Check if exactly same request already in queue
    const existing = await getQueue()
    const isDup = existing.some(i =>
      i.method === method && i.url === url &&
      JSON.stringify(i.data || {}) === JSON.stringify(data || {})
    )
    if (!isDup) {
      await enqueue({ method, url, data, _key: key })
    }
    _pendingKeys.delete(key)
    return optimistic?.() ?? null
  }
  
  try {
    const result = await http[method](url, data)
    _pendingKeys.delete(key)
    return result
  } catch (e) {
    _pendingKeys.delete(key)
    if (!e?.response) {  // Network error only
      const existing = await getQueue()
      const isDup = existing.some(i =>
        i.method === method && i.url === url &&
        JSON.stringify(i.data || {}) === JSON.stringify(data || {})
      )
      if (!isDup) {
        await enqueue({ method, url, data, _key: key })
      }
      return optimistic?.() ?? null
    }
    throw e
  }
}

/* ── Sync when online ── */
let _syncing = false  // Global lock — parallel sync bo'lmasin

export async function syncOfflineQueue() {
  if (_syncing) return 0          // Already syncing — skip
  if (!_online) return 0          // No internet — skip
  
  _syncing = true
  let synced = 0
  
  try {
    const items = await getQueue()
    if (!items.length) return 0

    for (const item of items) {
      // Double-check: still online?
      if (!_online) break
      
      try {
        // Remove from queue BEFORE sending to prevent retry on concurrent sync
        await dequeue(item.id)
        
        const result = await http[item.method || 'post'](item.url, item.data)
        synced++
      } catch (e) {
        if (e?.response?.status >= 400 && e?.response?.status < 500) {
          // 4xx — bad data, already dequeued, skip
        } else {
          // Network error — re-enqueue
          await enqueue({ method: item.method, url: item.url, data: item.data })
          break  // Stop on network error, try again later
        }
      }
    }
  } finally {
    _syncing = false
  }
  
  return synced
}

export const getQueueSize = queueSize

export const api = {
  /* Auth */
  login: (phone, password) => withRetry(() => http.post('/auth/login', { phone, password }), 2, 500),

  /* Orders */
  getOrders:   () => withRetry(() => http.get('/orders')),
  createOrder: b  => mutate('post', '/orders', b, () => ({ _id:'_tmp_'+Date.now(), ...b, number:'#...', itemCount:0, total:0, _pending:true })),
  updateOrder: (id,b) => mutate('put', `/orders/${id}`, b, () => ({ _id:id, ...b })),
  deleteOrder: id  => mutate('delete', `/orders/${id}`, null),

  /* Order Items */
  getOrderItems:   orderId => withRetry(() => http.get(`/order-items?orderId=${orderId}`)),
  createOrderItem: b       => mutate('post', '/order-items', b),
  updateOrderItem: (id,b)  => mutate('put', `/order-items/${id}`, b),
  deleteOrderItem: (id, orderId) => mutate('delete', `/order-items/${id}`, null),
  assignWorker:    (itemId, workerId, stage) => mutate('post', `/order-items/${itemId}/assign`, { workerId, stage }),
  advanceStage:    itemId => mutate('post', `/order-items/${itemId}/advance`, {}),

  /* Prices */
  getPrices:   () => withRetry(() => http.get('/prices')),
  createPrice: b  => mutate('post', '/prices', b),
  updatePrice: (id,b) => mutate('put', `/prices/${id}`, b),
  deletePrice: id => mutate('delete', `/prices/${id}`, null),

  /* Delivery */
  getDelivery:    () => withRetry(() => http.get('/delivery')),
  createDelivery: b  => mutate('post', '/delivery', { ...b, type:'delivery' }),
  updateDelivery: (id,b) => mutate('put', `/delivery/${id}`, b),
  deleteDelivery: id => mutate('delete', `/delivery/${id}`, null),

  /* Pickup */
  getPickup:    () => withRetry(() => http.get('/pickup')),
  createPickup: b  => mutate('post', '/pickup', { ...b, type:'pickup' }),
  updatePickup: (id,b) => mutate('put', `/pickup/${id}`, b),
  deletePickup: id => mutate('delete', `/pickup/${id}`, null),

  /* Employees */
  getEmployees:   () => withRetry(() => http.get('/employees')),
  createEmployee: b  => mutate('post', '/employees', b),
  updateEmployee: (id,b) => mutate('put', `/employees/${id}`, b),
  deleteEmployee: id => mutate('delete', `/employees/${id}`, null),

  /* Drivers */
  getDrivers:   () => withRetry(() => http.get('/drivers')),
  createDriver: b  => mutate('post', '/drivers', b),
  updateDriver: (id,b) => mutate('put', `/drivers/${id}`, b),
  deleteDriver: id => mutate('delete', `/drivers/${id}`, null),

  /* Customers */
  getCustomers:   () => withRetry(() => http.get('/customers')),
  createCustomer: b  => mutate('post', '/customers', b),
  updateCustomer: (id,b) => mutate('put', `/customers/${id}`, b),
  deleteCustomer: id => mutate('delete', `/customers/${id}`, null),

  /* Finance */
  getFinance:   () => withRetry(() => http.get('/finance')),
  createFinance: b => mutate('post', '/finance', b),
  updateFinance: (id,b) => mutate('put', `/finance/${id}`, b),
  deleteFinance: id => mutate('delete', `/finance/${id}`, null),

  /* Salary */
  getSalary:    () => withRetry(() => http.get('/salary')),
  updateSalary: (id,b) => mutate('put', `/salary/${id}`, b),

  /* Archive */
  getArchive: () => withRetry(() => http.get('/archive')),

  /* Workers */
  getWorkers:   () => withRetry(() => http.get('/order-items')).catch(() => []),
  createWorker: b  => mutate('post', '/order-items', b),
  updateWorker: (id,b) => mutate('put', `/order-items/${id}`, b),
  deleteWorker: id => mutate('delete', `/order-items/${id}`, null),

  /* Dashboard */
  getDashStats: () => withRetry(() => http.get('/dashboard/stats')),

  /* Live locations */
  getLiveLocations: () => http.get(BASE_URL + '/api/driver/live-locations').then(r=>r.data||[]).catch(()=>[]),

  /* Attendance */
  getAttendanceToday:   ()     => withRetry(() => http.get('/attendance/today')),
  getAttendance:        (q={}) => withRetry(() => http.get('/attendance', { params:q })),
  createAttendance:     b      => mutate('post', '/attendance', b),

  /* SalaryPayments */
  getSalaryPayments:    (q={}) => withRetry(() => http.get('/salary-payments', { params:q })),
  createSalaryPayment:  b      => mutate('post', '/salary-payments', b),
  getSalarySummary:     month  => withRetry(() => http.get('/salary-payments/summary/' + month)),

  /* HomeService */
  getHomeServices:      ()     => withRetry(() => http.get('/home-service')),
  createHomeService:    b      => mutate('post', '/home-service', b),
  updateHomeService:    (id,b) => mutate('put',  '/home-service/' + id, b),
  deleteHomeService:    id     => mutate('delete','/home-service/' + id, null),
  completeHomeService:  (id,b) => mutate('post', '/home-service/' + id + '/complete', b),
}

export const fmt = {
  currency: n => (n||0).toLocaleString('uz-UZ') + " so'm",
  num:      n => (n||0).toLocaleString('uz-UZ'),
}

export const botApi = {
  sendPickup:   id => http.post(`/delivery/${id}/send-tg`).catch(()=>null),
  sendDelivery: id => http.post(`/delivery/${id}/send-tg`).catch(()=>null),
  driverLink:   id => http.get(`/drivers/${id}/bot-link`).catch(()=>null),
  workerLink:   id => http.get(`/employees/${id}/bot-link`).catch(()=>null),
  driverStats:  id => http.get(`/drivers/${id}/stats`).catch(()=>null),
}

export default api
