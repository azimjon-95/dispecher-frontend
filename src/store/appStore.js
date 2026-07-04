/**
 * store/appStore.js
 *
 * ARXITEKTURA:
 *   1. Sahifa ochilishi bilan BITTA so'rov: GET /api/dashboard/bootstrap
 *      Barcha asosiy data (orders, drivers, employees, customers,
 *      delivery, pickup, finance, prices, stats) bir JSON da keladi.
 *
 *   2. Socket.IO "data:update" eventi — faqat o'zgargan qismni
 *      qayta yuklab oladi (masalan, faqat orders)
 *
 *   3. Sahifalar store'dan o'qiydi — server'ga alohida so'rov yubormaydliar
 *
 * Foydalanish:
 *   import { useStore, store } from '../../store/appStore'
 *   const { orders, drivers, stats } = useStore()
 */

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { bus } from '../services/realtime.js'

const BASE_URL = 'https://gilam.medme.uz'

// ── Singleton state ──
let _state = {
  orders:    [],
  drivers:   [],
  employees: [],
  customers: [],
  delivery:  [],
  pickup:    [],
  finance:   [],
  prices:    [],
  stats:     {},
  loaded:    false,
  loading:   false,
  error:     null,
  _ts:       0,
}

const _listeners = new Set()

function notify() {
  _listeners.forEach(fn => fn({ ..._state }))
}

function setState(patch) {
  _state = { ..._state, ...patch }
  notify()
}

// ── Token olish ──
function getToken() {
  try { return JSON.parse(localStorage.getItem('crm_user') || '{}').token || '' } catch { return '' }
}

// ── Bitta resource'ni qayta yuklovchi helper ──
const RESOURCE_URL = {
  orders:    '/api/orders',
  drivers:   '/api/drivers',
  employees: '/api/employees',
  customers: '/api/customers',
  delivery:  '/api/delivery',
  pickup:    '/api/pickup',
  finance:   '/api/finance',
  prices:    '/api/prices',
  stats:     '/api/dashboard/stats',
}

async function refetchOne(type) {
  const url = RESOURCE_URL[type]
  if (!url) return
  try {
    const res = await axios.get(BASE_URL + url, {
      headers: { Authorization: 'Bearer ' + getToken() },
      timeout: 8000,
    })
    const data = res.data?.data || res.data
    if (type === 'stats') {
      setState({ stats: data })
    } else if (Array.isArray(data)) {
      setState({ [type]: data })
    }
  } catch (e) {
    console.warn('refetchOne', type, e.message)
  }
}

// ── Bootstrap — barcha data bitta so'rovda ──
let _bootstrapPromise = null

export async function bootstrap(force = false) {
  // Allaqachon yuklanayotgan bo'lsa — qayta so'rov yo'q
  if (_bootstrapPromise && !force) return _bootstrapPromise

  _bootstrapPromise = (async () => {
    if (_state.loading) return
    setState({ loading: true, error: null })

    // sessionStorage'dan tezkor ko'rsatish
    try {
      const cached = sessionStorage.getItem('app_bootstrap')
      if (cached) {
        const parsed = JSON.parse(cached)
        const age = Date.now() - (parsed._ts || 0)
        if (age < 30_000) { // 30 soniyadan yangi bo'lsa ishlat
          setState({ ...parsed, loaded: true, loading: false })
          // Background'da yangilash davom etadi
        }
      }
    } catch {}

    try {
      const res = await axios.get(BASE_URL + '/api/dashboard/bootstrap', {
        headers: { Authorization: 'Bearer ' + getToken() },
        timeout: 10000,
      })
      const d = res.data
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
        _ts:       d._ts || Date.now(),
      }
      setState(fresh)
      // Cache ga saqlash
      try { sessionStorage.setItem('app_bootstrap', JSON.stringify(fresh)) } catch {}
    } catch (e) {
      setState({ loading: false, error: e.message })
      console.error('bootstrap xato:', e.message)
    }
    _bootstrapPromise = null
  })()

  return _bootstrapPromise
}

// ── Socket.IO orqali real-time yangilash ──
bus.on('data:update', ({ type }) => {
  if (!type || !_state.loaded) return
  // Faqat o'zgargan resource'ni qayta yuklaymiz
  refetchOne(type)
  // Stats ham yangilanadi
  if (['orders','finance','employees','customers'].includes(type)) {
    refetchOne('stats')
  }
})

// Qayta ulanganda to'liq yangilash
bus.on('refresh:all', () => { bootstrap(true) })

// ── Public API ──
export const store = {
  getState: () => ({ ..._state }),
  subscribe: (fn) => { _listeners.add(fn); return () => _listeners.delete(fn) },
  refetch: refetchOne,
  bootstrap,
}

// ── React hook ──
export function useStore(selector) {
  const [state, setState2] = useState(() => {
    const s = { ..._state }
    return selector ? selector(s) : s
  })
  const selectorRef = useRef(selector)
  selectorRef.current = selector

  useEffect(() => {
    const unsub = store.subscribe(newState => {
      const next = selectorRef.current ? selectorRef.current(newState) : newState
      setState2(next)
    })
    // Agar hali yuklanmagan bo'lsa — bootstrap chaqiramiz
    if (!_state.loaded && !_state.loading) bootstrap()
    return unsub
  }, [])

  return state
}

// Selector helpers — faqat kerakli qismni oling
export const sel = {
  orders:    s => s.orders,
  drivers:   s => s.drivers,
  employees: s => s.employees,
  customers: s => s.customers,
  delivery:  s => s.delivery,
  pickup:    s => s.pickup,
  finance:   s => s.finance,
  prices:    s => s.prices,
  stats:     s => s.stats,
  loaded:    s => s.loaded,
  loading:   s => s.loading,
}
