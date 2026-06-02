/* ═══════════════════════════════════════════════════
   OFFLINE QUEUE — Internet uzilsa ham ishlaydi
   IndexedDB + localStorage fallback
═══════════════════════════════════════════════════ */

const DB_NAME    = 'dispecher_offline'
const DB_VERSION = 1
const STORE_NAME = 'queue'

let db = null

/* ── Open IndexedDB ── */
async function openDB() {
  if (db) return db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const d = e.target.result
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess  = e => { db = e.target.result; resolve(db) }
    req.onerror    = e => reject(e.target.error)
  })
}

/* ── Add to queue ── */
export async function enqueue(item) {
  try {
    const d    = await openDB()
    const tx   = d.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add({ ...item, ts: Date.now() })
    return true
  } catch {
    // localStorage fallback
    try {
      const q = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
      q.push({ ...item, ts: Date.now() })
      localStorage.setItem('offlineQueue', JSON.stringify(q.slice(-200)))
      return true
    } catch { return false }
  }
}

/* ── Get all queued items ── */
export async function getQueue() {
  try {
    const d     = await openDB()
    const tx    = d.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = e => resolve(e.target.result || [])
      req.onerror   = e => reject(e.target.error)
    })
  } catch {
    try {
      return JSON.parse(localStorage.getItem('offlineQueue') || '[]')
    } catch { return [] }
  }
}

/* ── Remove item from queue ── */
export async function dequeue(id) {
  try {
    const d     = await openDB()
    const tx    = d.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
  } catch {
    try {
      const q = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
      localStorage.setItem('offlineQueue', JSON.stringify(q.filter(i => i.id !== id)))
    } catch {}
  }
}

/* ── Clear all queue ── */
export async function clearQueue() {
  try {
    const d     = await openDB()
    const tx    = d.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch {
    localStorage.removeItem('offlineQueue')
  }
}

/* ── Queue size ── */
export async function queueSize() {
  const q = await getQueue()
  return q.length
}

/* ── Summary for debugging ── */
export async function summary() {
  const items = await getQueue()
  return items.map(i => ({ id:i.id, method:i.method, url:i.url, ts:i.ts }))
}
