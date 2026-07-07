/**
 * store/appStore.js — Singleton global store
 * 
 * Bitta GET /api/dashboard/bootstrap → barcha data
 * Socket.IO "data:update" → faqat o'zgargan qism qayta yuklanadi
 */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { bus } from '../services/realtime.js'

const BASE = 'https://gilam.medme.uz'

const EMPTY = {
  orders: [], drivers: [], employees: [], customers: [],
  delivery: [], pickup: [], finance: [], prices: [],
  stats: {}, loaded: false, loading: false, error: null,
}

let _state    = { ...EMPTY }
let _subs     = new Set()
let _fetching = false   // race condition oldini olish

function getToken() {
  try { return localStorage.getItem('token') || '' } catch { return '' }
}

function set(patch) {
  _state = { ..._state, ...patch }
  _subs.forEach(fn => fn(_state))
  // useCRUD larni ham xabardor qilamiz
  Object.keys(patch).forEach(k => {
    if (Array.isArray(patch[k])) bus.emit('data:updated:' + k, patch[k])
  })
}

// ── Bitta resource qayta yuklovchi ──
const URLS = {
  orders: '/api/orders', drivers: '/api/drivers',
  employees: '/api/employees', customers: '/api/customers',
  delivery: '/api/delivery', pickup: '/api/pickup',
  finance: '/api/finance', prices: '/api/prices',
  stats: '/api/dashboard/stats',
}

async function refetch(type) {
  const url = URLS[type]
  if (!url) return
  try {
    const r = await axios.get(BASE + url, {
      headers: { Authorization: 'Bearer ' + getToken() },
      timeout: 8000,
    })
    const data = Array.isArray(r.data) ? r.data : (r.data?.data || r.data)
    set({ [type]: data })
  } catch (e) {
    console.warn('[store] refetch', type, e.message)
  }
}

// ── Bootstrap — bitta so'rovda hammasi ──
export async function bootstrap() {
  if (_fetching) return          // parallel chaqiruvni bloklash
  if (!getToken()) return        // login bo'lmagan

  // sessionStorage'dan darhol ko'rsatish (0ms)
  try {
    const c = sessionStorage.getItem('bs')
    if (c) {
      const p = JSON.parse(c)
      if (Date.now() - p._ts < 60_000) {   // 60s ichida fresh
        set({ ...p, loaded: true, loading: false })
      }
    }
  } catch {}

  _fetching = true
  set({ loading: true, error: null })

  try {
    const r = await axios.get(BASE + '/api/dashboard/bootstrap', {
      headers: { Authorization: 'Bearer ' + getToken() },
      timeout: 12000,
    })
    const d = r.data || {}
    const fresh = {
      orders:    d.orders    || [],
      drivers:   d.drivers   || [],
      employees: d.employees || [],
      customers: d.customers || [],
      delivery:  d.delivery  || [],
      pickup:    d.pickup    || [],
      finance:   d.finance   || [],
      prices:    d.prices    || [],
      stats:     d.stats     || {},
      loaded:    true,
      loading:   false,
      error:     null,
      _ts:       Date.now(),
    }
    set(fresh)
    try { sessionStorage.setItem('bs', JSON.stringify(fresh)) } catch {}
  } catch (e) {
    console.error('[store] bootstrap xato:', e.message)
    set({ loading: false, error: e.message })
  } finally {
    _fetching = false
  }
}

// ── Socket.IO real-time yangilash ──
bus.on('data:update', ({ type }) => {
  if (!_state.loaded) return
  refetch(type)
  if (['orders','finance','employees','customers'].includes(type)) refetch('stats')
})

bus.on('refresh:all', () => bootstrap())

// ── React hook ──
export function useStore(select) {
  const [s, setS] = useState(() => select ? select(_state) : _state)

  useEffect(() => {
    // Agar store bo'sh bo'lsa — bootstrap chaqir
    if (!_state.loaded && !_fetching) bootstrap()

    const unsub = (newState) => {
      const next = select ? select(newState) : newState
      setS(prev => {
        // Reference equality — faqat o'zgarsa render
        if (select) return next
        return prev === newState ? prev : newState
      })
    }
    _subs.add(unsub)
    return () => _subs.delete(unsub)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return s
}

export const store = {
  bootstrap,
  refetch,
  getState:  () => _state,
  subscribe: (fn) => { _subs.add(fn); return () => _subs.delete(fn) },
}
