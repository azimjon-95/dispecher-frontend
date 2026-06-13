/* ═══════════════════════════════════════════════════════
   OFFLINE QUEUE v2 — IndexedDB + localStorage fallback
   Barcha mutation so'rovlar offline holatda saqlanadi
   Internet qaytganda avtomatik sinxronlanadi
═══════════════════════════════════════════════════════ */

const DB_NAME    = 'tartib_crm_offline'
const DB_VERSION = 2
const STORE      = 'queue'
const META_STORE = 'meta'

let _db = null

/* ── IndexedDB ochish ── */
async function openDB() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = e => {
      const d = e.target.result
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath:'id', autoIncrement:true })
        s.createIndex('ts',     'ts',     { unique:false })
        s.createIndex('url',    'url',    { unique:false })
        s.createIndex('status', 'status', { unique:false })
      }
      if (!d.objectStoreNames.contains(META_STORE)) {
        d.createObjectStore(META_STORE, { keyPath:'key' })
      }
    }

    req.onsuccess = e => { _db = e.target.result; resolve(_db) }
    req.onerror   = e => reject(e.target.error)
  })
}

/* ── Queue ga qo'shish ── */
export async function enqueue(item) {
  const entry = {
    ...item,
    ts:       Date.now(),
    status:   'pending',
    retries:  0,
    maxRetry: 5,
  }
  try {
    const d  = await openDB()
    const tx = d.transaction(STORE, 'readwrite')
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE).add(entry)
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => reject(req.error)
    })
  } catch {
    /* localStorage fallback */
    const q = _lsGet()
    q.push({ ...entry, id: Date.now() })
    _lsSet(q.slice(-300))
    return Date.now()
  }
}

/* ── Hammani olish ── */
export async function getQueue() {
  try {
    const d  = await openDB()
    const tx = d.transaction(STORE, 'readonly')
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => reject(req.error)
    })
  } catch {
    return _lsGet()
  }
}

/* ── Bitta o'chirish ── */
export async function dequeue(id) {
  try {
    const d  = await openDB()
    const tx = d.transaction(STORE, 'readwrite')
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE).delete(id)
      req.onsuccess = () => resolve()
      req.onerror   = () => reject(req.error)
    })
  } catch {
    const q = _lsGet().filter(i => i.id !== id)
    _lsSet(q)
  }
}

/* ── Retry count yangilash ── */
export async function updateRetry(id, retries) {
  try {
    const d  = await openDB()
    const tx = d.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    return new Promise((resolve, reject) => {
      const get = store.get(id)
      get.onsuccess = () => {
        if (!get.result) { resolve(); return }
        const upd = store.put({ ...get.result, retries, status:'retrying' })
        upd.onsuccess = () => resolve()
        upd.onerror   = () => reject(upd.error)
      }
      get.onerror = () => reject(get.error)
    })
  } catch { /* silent */ }
}

/* ── Soni ── */
export async function queueSize() {
  try {
    const q = await getQueue()
    return q.length
  } catch { return 0 }
}

/* ── Hammasini tozalash ── */
export async function clearQueue() {
  try {
    const d  = await openDB()
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    localStorage.removeItem('tartib_offline_q')
  } catch {}
}

/* ── localStorage helpers ── */
function _lsGet() {
  try { return JSON.parse(localStorage.getItem('tartib_offline_q') || '[]') } catch { return [] }
}
function _lsSet(arr) {
  try { localStorage.setItem('tartib_offline_q', JSON.stringify(arr)) } catch {}
}
