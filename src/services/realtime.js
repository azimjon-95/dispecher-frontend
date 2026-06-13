/* ═══════════════════════════════════════════════════════
   TARTIB CRM — REAL-TIME STORE
   Socket.IO + Smart Polling + Event Bus
   Barcha sahifalar shu orqali yangilanadi
═══════════════════════════════════════════════════════ */

const BASE = 'https://gilam.medme.uz'

/* ── Event Bus ── */
const listeners = {}

export const bus = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = new Set()
    listeners[event].add(fn)
    return () => listeners[event].delete(fn)
  },
  emit(event, data) {
    listeners[event]?.forEach(fn => { try { fn(data) } catch {} })
  },
  off(event, fn) {
    listeners[event]?.delete(fn)
  },
}

/* ── Socket.IO connection ── */
let socket = null
let connected = false
let reconnectTimer = null

function loadSocketIO(cb) {
  if (window.io) return cb(window.io)
  const s = document.createElement('script')
  s.src = `${BASE}/socket.io/socket.io.js`
  s.onload  = () => cb(window.io)
  s.onerror = () => console.warn('Socket.IO CDN failed')
  document.head.appendChild(s)
}

export function connectSocket() {
  if (socket?.connected) return

  loadSocketIO(io => {
    if (!io) return startPolling()

    socket = io(BASE, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
    })

    socket.on('connect', () => {
      connected = true
      socket.emit('join:admin')
      bus.emit('socket:connected')
      stopPolling()
      console.log('🔌 Real-time ulandi')
    })

    socket.on('disconnect', () => {
      connected = false
      bus.emit('socket:disconnected')
      startPolling() // fallback to polling
    })

    socket.on('connect_error', () => {
      startPolling() // fallback
    })

    // ── Data update events ──
    socket.on('data:update', ({ type }) => {
      bus.emit('refresh:' + type)
      bus.emit('refresh:all', { type })
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
  })
}

export function disconnectSocket() {
  socket?.disconnect()
  stopPolling()
}

/* ── Smart Polling (Socket.IO bo'lmasa) ── */
const POLL_INTERVALS = {}

function startPolling() {
  if (Object.keys(POLL_INTERVALS).length > 0) return // already polling

  const RESOURCES = [
    { key: 'orders',    interval: 8000  },
    { key: 'transport', interval: 10000 },
    { key: 'dashboard', interval: 15000 },
  ]

  RESOURCES.forEach(({ key, interval }) => {
    POLL_INTERVALS[key] = setInterval(() => {
      if (connected) return // socket connected, no need to poll
      bus.emit('refresh:' + key)
    }, interval)
  })

  console.log('📡 Polling mode (Socket.IO yo\'q)')
}

function stopPolling() {
  Object.values(POLL_INTERVALS).forEach(clearInterval)
  Object.keys(POLL_INTERVALS).forEach(k => delete POLL_INTERVALS[k])
}

/* ── useRealtime hook ── */
import { useEffect, useRef } from 'react'

export function useRealtime(events, callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const offs = events.map(ev => bus.on(ev, data => cbRef.current(ev, data)))
    return () => offs.forEach(off => off())
  }, [events.join(',')])
}

/* ── Auto-connect on import ── */
connectSocket()
