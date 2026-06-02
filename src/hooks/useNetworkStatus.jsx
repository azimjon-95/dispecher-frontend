import { useState, useEffect, useCallback } from 'react'
import { syncOfflineQueue, getQueueSize, isOnline } from '../services/api.js'
import { toast } from '../components/ui/UI.jsx'

export function useNetworkStatus() {
  const [online,   setOnline]   = useState(isOnline())
  const [queueLen, setQueueLen] = useState(0)
  const [syncing,  setSyncing]  = useState(false)

  const checkQueue = useCallback(async () => {
    const n = await getQueueSize()
    setQueueLen(n)
  }, [])

  const doSync = useCallback(async () => {
    if (!isOnline() || syncing) return  // Already syncing — skip
    setSyncing(true)
    try {
      const size = await getQueueSize()
      if (size === 0) return             // Nothing to sync
      
      const synced = await syncOfflineQueue()
      await checkQueue()
      if (synced > 0) {
        toast(synced + " ta offline o'zgarish serverga yuborildi", 'ok')
      }
    } finally {
      setSyncing(false)
    }
  }, [syncing, checkQueue])

  useEffect(() => {
    checkQueue()
    // Check every 5s + sync if online and queue not empty
    const interval = setInterval(async () => {
      await checkQueue()
      // Only auto-sync if online AND not already syncing
      if (isOnline()) {
        const size = await getQueueSize()
        if (size > 0) {
          doSync()  // doSync itself checks 'syncing' flag
        }
      }
    }, 15000)  // 15s — koproq vaqt bering

    function handleOnline() {
      setOnline(true)
      toast("Internet tiklandi — ma'lumotlar yuborilmoqda...", 'ok')
      setTimeout(doSync, 500)  // slight delay for connection to stabilize
    }
    function handleOffline() {
      setOnline(false)
      toast("Internet uzildi — barcha o'zgarishlar saqlanadi", 'err')
    }
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online, queueLen, syncing, doSync }
}

/* NetworkBar — shows in Navbar when offline or queue > 0 */
export function NetworkBar({ online, queueLen, syncing, doSync }) {
  if (online && queueLen === 0) return null
  const isWaiting = online && queueLen > 0
  const label     = !online ? 'Offline' : (syncing ? 'Yuborilmoqda...' : (queueLen + ' ta kutmoqda'))
  const icon      = !online ? '📡' : (syncing ? '⏳' : '📤')
  const color     = !online ? 'var(--red)' : 'var(--yellow)'
  const bg        = !online ? 'var(--redbg)' : 'var(--yellowbg)'
  const border    = !online ? 'rgba(248,81,73,.25)' : 'rgba(210,153,34,.25)'

  return (
    <div
      onClick={() => isWaiting && doSync()}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:'var(--r)', background:bg, border:`1px solid ${border}`, fontSize:11, fontWeight:700, color, cursor:isWaiting?'pointer':'default' }}
      title={isWaiting ? (queueLen + " ta o'zgarish kutmoqda — bosib yuboring") : ''}
    >
      <span>{icon}</span>
      {label}
    </div>
  )
}
