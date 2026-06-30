import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from '../components/ui/UI.jsx'
import { bus } from '../services/realtime.js'

/* normalize: API { data:[] } yoki [] ikkalasini ham qabul qiladi */
function normalize(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res.items)) return res.items
  return []
}

/* retry helper: xato bo'lsa N marta qayta urinadi */
async function withRetry(fn, retries = 3, baseDelay = 800) {
  for (let i = 0; i < retries; i++) {
    try { return await fn() }
    catch (e) {
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, baseDelay * (i + 1)))
    }
  }
}

/**
 * @param {object} apiFns        — { getAll, create, update, remove }
 * @param {string[]} searchKeys  — qidiruv qilinadigan fieldlar
 * @param {number} pageSize
 * @param {string} [resourceType] — Socket.IO 'refresh:<type>' eventiga obuna bo'lish uchun
 *   (masalan 'employees', 'drivers'). Berilsa: boshqa admin/bot o'zgartirganda
 *   bu ro'yxat ham avtomatik qayta yuklanadi — qo'lda refresh kerak emas.
 */
export function useCRUD(apiFns, searchKeys = [], pageSize = 10, resourceType = null) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({})
  const [page,    setPage]    = useState(1)
  const [selIds,  setSelIds]  = useState([])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await withRetry(() => apiFns.getAll(), 3, 800)
      setData(normalize(res))
    } catch (e) {
      const msg = e?.message || String(e) || 'Server bilan aloqa yo\'q'
      setError(msg)
      toast(msg, 'err')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [apiFns])

  useEffect(() => { load() }, [])

  /* Boshqa client (admin yoki bot) shu turdagi datani o'zgartirsa —
     Socket.IO orqali xabar keladi va ro'yxat sokin qayta yuklanadi.
     Internet uzilib qaytganda ham eskirgan datani yangilab qo'yadi. */
  useEffect(() => {
    if (!resourceType) return
    const off1 = bus.on('refresh:' + resourceType, () => load())
    const off2 = bus.on('network:online', () => load())
    return () => { off1(); off2() }
  }, [resourceType, load])

  const filtered = useMemo(() => {
    if (!Array.isArray(data)) return []
    const q = search.toLowerCase()
    return data.filter(row => {
      if (!row || typeof row !== 'object') return false
      const matchSearch  = !q || searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
      const matchFilters = Object.entries(filters).every(([k, v]) => !v || row[k] === v)
      return matchSearch && matchFilters
    })
  }, [data, search, filters])

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  )

  /** Yangi yozuv yaratadi. Internet bo'lmasa yoki server javob bermasa
   *  aniq xato ko'rsatiladi — soxta "saqlandi" holatiga olib bormaydi. */
  async function create(formData) {
    try {
      const raw = await apiFns.create(formData)
      const rec = raw?.data || raw
      if (rec?._id) setData(d => [rec, ...d])
      toast("Qo'shildi ✅", 'ok')
      return rec || null
    } catch (e) {
      toast(String(e?.message || e), 'err')
      return null
    }
  }

  async function update(id, formData) {
    try {
      await apiFns.update(id, formData)
      setData(d => d.map(r => r._id === id ? { ...r, ...formData } : r))
      toast('Yangilandi ✅', 'ok'); return true
    } catch (e) { toast(String(e?.message || e), 'err'); return false }
  }

  async function remove(id) {
    try {
      await apiFns.remove(id)
      setData(d => d.filter(r => r._id !== id))
      setSelIds(s => s.filter(x => x !== id))
      toast("O'chirildi", 'inf'); return true
    } catch (e) { toast(String(e?.message || e), 'err'); return false }
  }

  async function bulkRemove() {
    for (const id of selIds) await apiFns.remove(id).catch(() => {})
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
    reload: load, total: filtered.length, pageSize,
  }
}
