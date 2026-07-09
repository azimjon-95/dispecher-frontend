/* ═══════════════════════════════════════════════════════
   TARTIB CRM — REAL-TIME ENGINE
   Socket.IO (asosiy) + Polling (fallback) + Event Bus

   Tamoyil:
   1. Internet bor → Socket.IO ulanadi → real-time push
   2. Socket.IO ulanmasa (firewall, eski brauzer) → polling fallback
   3. Internet yo'q → urinishlar pauza, 'online' eventda darhol qayta uriniladi
   4. Hech qachon ishni to'xtatmaydi — degradatsiya, crash emas
═══════════════════════════════════════════════════════ */

import { BASE_URL } from '../api/baseApi.js'
const BASE = BASE_URL

/* ───────────────────────────────────────
   Event Bus — sahifalar bu orqali gaplashadi
─────────────────────────────────────── */
const listeners = {}

export const bus = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = new Set()
    listeners[event].add(fn)
    return () => listeners[event].delete(fn)
  },
  emit(event, data) {
    listeners[event]?.forEach(fn => { try { fn(data) } catch (e) { console.error(`bus:${event}`, e) } })
  },
  off(event, fn) { listeners[event]?.delete(fn) },
}

/* ───────────────────────────────────────
   Connection status — markazlashtirilgan holat
   'connecting' | 'connected' | 'polling' | 'offline'
─────────────────────────────────────── */
let _status = 'connecting'
function setStatus(next) {
  if (_status === next) return
  _status = next
  bus.emit('connection:status', next)
}
export function getConnectionStatus() { return _status }

/* ───────────────────────────────────────
   Socket.IO ulanish
─────────────────────────────────────── */
let socket = null
let socketIOFailed = false

function loadSocketIO() {
  return new Promise(resolve => {
    if (window.io) return resolve(window.io)
    const s = document.createElement('script')
    s.src = `${BASE}/socket.io/socket.io.js`
    s.onload  = () => resolve(window.io)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
}

async function connectSocket() {
  if (socket?.connected) return
  if (!navigator.onLine) { setStatus('offline'); return }

  const io = await loadSocketIO()
  if (!io) {
    socketIOFailed = true
    startPolling()
    return
  }

  socket = io(BASE, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,   // hech qachon to'xtamaydi — faqat sekinlashadi
    timeout: 8000,
  })

  socket.on('connect', () => {
    socket.emit('join:admin')
    setStatus('connected')
    stopPolling()
    console.log('🔌 Real-time ulandi (Socket.IO)')
    // Qayta ulanganda — hamma narsani yangilab qo'yamiz, chunki
    // ulanmagan vaqtda o'tkazib yuborilgan eventlar bo'lishi mumkin
    bus.emit('refresh:all', { reason: 'reconnect' })
  })

  socket.on('disconnect', (reason) => {
    console.warn('🔌 Socket.IO uzildi:', reason)
    setStatus(navigator.onLine ? 'polling' : 'offline')
    startPolling()
  })

  socket.on('connect_error', () => {
    setStatus(navigator.onLine ? 'polling' : 'offline')
    startPolling()
  })

  /* ── Server eventlari ── */
  socket.on('data:update', ({ type }) => {
    bus.emit('refresh:' + type)
    bus.emit('refresh:all', { type })

    // RTK Query cache invalidation — Socket.IO dan kelgan o'zgarish
    // Bu sahifalar o'tmasdan ham data yangilanishini ta'minlaydi
    const tagMap = {
      orders:    ['Orders', 'Stats', 'Bootstrap'],
      drivers:   ['Drivers', 'Bootstrap'],
      employees: ['Employees', 'Bootstrap'],
      customers: ['Customers', 'Bootstrap'],
      delivery:  ['Delivery', 'Bootstrap'],
      pickup:    ['Pickup', 'Bootstrap'],
      finance:   ['Finance', 'Stats', 'Bootstrap'],
      attendance:['Attendance'],
      prices:    ['Prices', 'Bootstrap'],
    }
    const tags = tagMap[type] || ['Bootstrap']
    import('../store/index.js').then(({ socketInvalidate }) => {
      socketInvalidate(...tags)
    }).catch(() => {})
  })

  socket.on('driver:live-location', data => {
    bus.emit('driver:location', data)
  })

  socket.on('order:new', data => {
    bus.emit('refresh:orders', data)
    bus.emit('toast', { msg: `📦 Yangi buyurtma: ${data.number}`, type: 'ok' })
  })

  socket.on('order:status', data => {
    bus.emit('refresh:orders', data)
  })
}

export function disconnectSocket() {
  socket?.disconnect()
  stopPolling()
}

/* ───────────────────────────────────────
   Polling — faqat Socket.IO ishlamasa ishlaydi.
   Eksponensial backoff: internet beqaror bo'lsa
   serverni keraksiz so'rovlar bilan to'ldirmaymiz.
─────────────────────────────────────── */
const POLL_RESOURCES = [
  { key: 'orders',    interval: 8000  },
  { key: 'transport', interval: 10000 },
  { key: 'dashboard', interval: 15000 },
]
const POLL_TIMERS = {}
let pollBackoffMultiplier = 1

function startPolling() {
  if (Object.keys(POLL_TIMERS).length > 0) return // allaqachon ishlayapti
  if (!navigator.onLine) return

  console.log("📡 Polling rejimi (Socket.IO ulanmagan)")

  POLL_RESOURCES.forEach(({ key, interval }) => {
    const tick = () => {
      if (_status === 'connected') return // socket qaytdi — polling kerak emas
      if (!navigator.onLine) return
      bus.emit('refresh:' + key)
    }
    POLL_TIMERS[key] = setInterval(tick, interval * pollBackoffMultiplier)
  })
}

function stopPolling() {
  Object.values(POLL_TIMERS).forEach(clearInterval)
  Object.keys(POLL_TIMERS).forEach(k => delete POLL_TIMERS[k])
  pollBackoffMultiplier = 1
}

/* ───────────────────────────────────────
   Brauzer online/offline eventlari
   — internet qaytganda DARHOL qayta urinamiz
─────────────────────────────────────── */
window.addEventListener('online', () => {
  console.log('🌐 Internet qaytdi — qayta ulanmoqda...')
  setStatus('connecting')
  connectSocket()
})

window.addEventListener('offline', () => {
  console.log('🌐 Internet yo\'q')
  setStatus('offline')
  stopPolling()
})

/* ───────────────────────────────────────
   useRealtime hook — komponentlar shu orqali tinglaydi
─────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react'

export function useRealtime(events, callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const offs = events.map(ev => bus.on(ev, data => cbRef.current(ev, data)))
    return () => offs.forEach(off => off())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(',')])
}

/* ── Ulanish holatini real-time kuzatish (Navbar LIVE badge uchun) ── */
export function useConnectionStatus() {
  const [status, setLocalStatus] = useState(getConnectionStatus())
  useEffect(() => {
    const off = bus.on('connection:status', s => setLocalStatus(s))
    return off
  }, [])
  return status
}

/* ── Auto-connect — modul yuklanganda darhol boshlanadi ── */
connectSocket()
