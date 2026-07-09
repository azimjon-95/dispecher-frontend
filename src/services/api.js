/* ═══════════════════════════════════════════════════
   api.js — Online-only API client
   Internet bo'lsa ishlaydi, bo'lmasa aniq xato beradi.
   Offline queue / IndexedDB / sync — YO'Q.
   Real-time yangilanish Socket.IO orqali (realtime.js)
═══════════════════════════════════════════════════ */
import { BASE_URL, axiosInstance } from '../api/baseApi.js'

const http = axiosInstance

// ── Sahifa cache (sessionStorage) — tezkor ko'rsatish uchun
// Foydalanuvchi sahifaga o'tganda darhol eski ma'lumot ko'rinadi,
// keyin server'dan yangi ma'lumot kelgach yangilanadi (stale-while-revalidate)
const pageCache = {
  get: (key) => { try { const d = sessionStorage.getItem('pc:'+key); return d ? JSON.parse(d) : null } catch { return null } },
  set: (key, val) => { try { sessionStorage.setItem('pc:'+key, JSON.stringify(val)) } catch {} },
}

http.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
http.interceptors.response.use(
  r => r.data,
  err => {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      try {
        window.dispatchEvent(new CustomEvent('auth:expired', {
          detail: { msg: 'Sessiya muddati tugadi. Qayta kiring.' }
        }))
      } catch {}
      setTimeout(() => { window.location.href = '/' }, 800)
    }
    if (!err?.response) {
      // Internet yo'q yoki server javob bermadi — aniq xabar
      return Promise.reject(new Error("Internet aloqasi yo'q yoki server javob bermayapti"))
    }
    return Promise.reject(new Error(err?.response?.data?.error || err?.message || 'Server xatosi'))
  }
)

/* ── Online holatni kuzatish (faqat ko'rsatish uchun, queue yo'q) ── */
let _online = navigator.onLine
window.addEventListener('online',  () => { _online = true })
window.addEventListener('offline', () => { _online = false })
export function isOnline() { return _online }

export { pageCache, withRetry }

/* ── Normalize → always array ── */
export function norm(res) {
  if (Array.isArray(res))       return res
  if (Array.isArray(res?.data)) return res.data
  return []
}

/* ── Retry helper — vaqtinchalik tarmoq xatolarida qayta urinish ── */
async function withRetry(fn, retries = 2, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try { return await fn() }
    catch (e) {
      if (i === retries - 1) throw e
      if (e?.response?.status >= 400 && e?.response?.status < 500) throw e
      await new Promise(r => setTimeout(r, delay * (i + 1)))
    }
  }
}

/* ── Double-submit himoyasi (masalan, tugmani 2 marta bosish) ── */
const _pendingKeys = new Set()
function makeKey(method, url, data) {
  const str = method + '|' + url + '|' + JSON.stringify(data || {})
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return String(h)
}

/* ── Mutation — to'g'ridan-to'g'ri serverga, queue yo'q ── */
async function mutate(method, url, data) {
  const key = makeKey(method, url, data)
  if (_pendingKeys.has(key)) return null  // double-click himoyasi
  _pendingKeys.add(key)
  setTimeout(() => _pendingKeys.delete(key), 6000)

  try {
    return await http[method](url, data)
  } finally {
    _pendingKeys.delete(key)
  }
}

export const api = {
  /* Auth */
  login: (phone, password) => withRetry(() => http.post('/auth/login', { phone, password }), 2, 500),

  /* Orders */
  getOrders:   () => withRetry(() => http.get('/orders')),
  createOrder: b  => mutate('post', '/orders', b),
  updateOrder: (id,b) => mutate('put', `/orders/${id}`, b),
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

  /* Settings — Telegram .env orqali (frontend dan sozlanmaydi) */
  getTgBotStatus: () => withRetry(() => http.get('/telegram-settings')).catch(()=>({})),

  /* Filial (Ximchistka) joylashuvi — xarita markazi, viloyatga moslab saqlanadi */
  getCompanyLocation: () => withRetry(() => http.get('/settings/company-location')).catch(()=>null),
  saveCompanyLocation: (lat, lon, address, city) =>
    mutate('put', '/settings/company-location', { lat, lon, address, city }),

  /* Smart Customer */
  getCustomerByPhone:  phone => http.get('/customers/by-phone/'+encodeURIComponent(phone)).catch(()=>null),
  upsertCustomer:      b     => mutate('post','/customers/upsert', b),
  saveCustomerLocation:(id,b)=> mutate('post','/customers/'+id+'/location', b),
  syncCustomerStats:   b     => mutate('post','/customers/sync-stats', b).catch(()=>{}),

  /* PIN */
  generatePinEmp: id => mutate('post', '/employees/'+id+'/generate-pin', {}),
  generatePinDrv: id => mutate('post', '/drivers/'+id+'/generate-pin', {}),
}

export const fmt = {
  currency: n => (n||0).toLocaleString('uz-UZ') + " so'm",
  num:      n => (n||0).toLocaleString('uz-UZ'),
}

export const botApi = {
  sendPickup:      id => http.post(`/delivery/${id}/send-tg`).catch(()=>null),
  sendDelivery:    id => http.post(`/delivery/${id}/send-tg`).catch(()=>null),
  driverLink:      id => http.get(`/drivers/${id}/bot-link`).catch(()=>null),
  workerLink:      id => http.get(`/employees/${id}/bot-link`).catch(()=>null),
  driverStats:     id => http.get(`/drivers/${id}/stats`).catch(()=>null),
  requestLocation: async (orderId, phone, custId) => {
    try {
      const r = await http.post('/bot/request-location', { orderId, phone, custId })
      return r.data || {}
    } catch(e) {
      return { sent: false, method: 'link', deepLink: '', name: '', phone: '', hasTg: false }
    }
  },
}

export default api
