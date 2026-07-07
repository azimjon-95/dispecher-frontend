import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from '../components/ui/UI.jsx'
import { bus } from '../services/realtime.js'
import { withRetry } from '../services/api.js'
import { store, bootstrap } from '../store/appStore.js'

function normalize(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res.items)) return res.items
  return []
}

/**
 * useCRUD — aqlli data hook
 *
 * Ishlash tartibi:
 *  1. store.getState()[resourceType] bor → DARHOL ko'rsatiladi (0ms)
 *  2. store subscribe → store yangilanganda avtomatik yangilanadi
 *  3. Store bo'sh bo'lsa → bootstrap() chaqiriladi (1 so'rov, hammasi uchun)
 *  4. Bootstrap ham ishlamasa → o'z API'sini chaqiradi (fallback)
 *
 * Natija: sahifalar server'ga alohida so'rov yubormaydi.
 * Faqat bitta bootstrap so'rovi, keyin Socket.IO orqali yangilanish.
 */
export function useCRUD(apiFns, searchKeys = [], pageSize = 10, resourceType = null) {
  // Store dan darhol boshlang'ich qiymat
  const initial = resourceType ? (store.getState()[resourceType] || []) : []

  const [data,    setData]    = useState(initial)
  const [loading, setLoading] = useState(initial.length === 0)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({})
  const [page,    setPage]    = useState(1)
  const [selIds,  setSelIds]  = useState([])

  const apiFnsRef = useRef(apiFns)
  apiFnsRef.current = apiFns

  // ── API fallback (store bo'sh va bootstrap ishlamasa) ──
  const fetchFromApi = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res   = await withRetry(() => apiFnsRef.current.getAll(), 2, 500)
      const fresh = normalize(res)
      setData(fresh)
    } catch (e) {
      const msg = e?.message || 'Server bilan aloqa yo\'q'
      setError(msg)
      toast(msg, 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Mount: store bor → ishlatamiz, yo'q → bootstrap ──
  useEffect(() => {
    if (!resourceType) {
      fetchFromApi()
      return
    }

    const cur = store.getState()[resourceType]
    if (cur?.length) {
      // Store da bor — darhol
      setData(cur)
      setLoading(false)
    } else {
      // Store bo'sh — bootstrap chaqiramiz (1 so'rov hammasi uchun)
      bootstrap().then(() => {
        const fresh = store.getState()[resourceType]
        if (fresh?.length) {
          setData(fresh)
          setLoading(false)
        } else {
          // Bootstrap ham bo'sh bo'lsa — API fallback
          fetchFromApi()
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Store subscribe: bootstrap/refetch kelganda yangilanish ──
  useEffect(() => {
    if (!resourceType) return

    // Store yangilanganda — shu resource'ni olamiz
    const onStoreUpdate = (newState) => {
      const d = newState[resourceType]
      if (d) { setData(d); setLoading(false) }
    }
    const unsub = store.subscribe ? store.subscribe(onStoreUpdate) : null

    // Bus events — Socket.IO va manual refresh uchun
    const offBus1 = bus.on('data:updated:' + resourceType, () => {
      const d = store.getState()[resourceType]
      if (d?.length) { setData(d); setLoading(false) }
    })
    const offBus2 = bus.on('refresh:' + resourceType, fetchFromApi)
    const offBus3 = bus.on('network:online', () => {
      const d = store.getState()[resourceType]
      if (d?.length) setData(d)
      else fetchFromApi()
    })

    return () => {
      if (unsub) unsub()
      offBus1(); offBus2(); offBus3()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType])

  // ── Filtered + paginated (memoized) ──
  const filtered = useMemo(() => {
    if (!Array.isArray(data)) return []
    const q = search.toLowerCase()
    return data.filter(row => {
      if (!row || typeof row !== 'object') return false
      const matchSearch  = !q || searchKeys.some(k =>
        String(row[k] ?? '').toLowerCase().includes(q))
      const matchFilters = Object.entries(filters).every(([k, v]) =>
        !v || String(row[k]) === String(v))
      return matchSearch && matchFilters
    })
  }, [data, search, filters, searchKeys])

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  )

  // ── CRUD operatsiyalar ──
  async function create(formData) {
    try {
      const raw = await apiFnsRef.current.create(formData)
      const rec = raw?.data || raw
      if (rec?._id) setData(d => [rec, ...d])
      toast("Qo'shildi ✅", 'ok')
      return rec || null
    } catch (e) { toast(String(e?.message || e), 'err'); return null }
  }

  async function update(id, formData) {
    try {
      await apiFnsRef.current.update(id, formData)
      setData(d => d.map(r => r._id === id ? { ...r, ...formData } : r))
      toast('Yangilandi ✅', 'ok'); return true
    } catch (e) { toast(String(e?.message || e), 'err'); return false }
  }

  async function remove(id) {
    try {
      await apiFnsRef.current.remove(id)
      setData(d => d.filter(r => r._id !== id))
      setSelIds(s => s.filter(x => x !== id))
      toast("O'chirildi", 'inf'); return true
    } catch (e) { toast(String(e?.message || e), 'err'); return false }
  }

  async function bulkRemove() {
    for (const id of selIds) await apiFnsRef.current.remove(id).catch(() => {})
    setData(d => d.filter(r => !selIds.includes(r._id)))
    toast(`${selIds.length} ta o'chirildi`, 'inf')
    setSelIds([])
  }

  return {
    data, filtered, paginated, loading, error,
    search, onSearch: v => { setSearch(v); setPage(1) },
    filters, setFilter: (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) },
    page, setPage, selIds, setSelIds,
    create, update, remove, bulkRemove,
    reload: fetchFromApi,
    total: filtered.length, pageSize,
  }
}
