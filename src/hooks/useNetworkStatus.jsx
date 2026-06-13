import { useState, useEffect, useCallback, useRef } from 'react'
import { syncOfflineQueue, getQueueSize, isOnline } from '../services/api.js'

/* ══════════════════════════════════════
   useNetworkStatus — kuchli offline tizim
══════════════════════════════════════ */
export function useNetworkStatus() {
  const [online,   setOnline]   = useState(navigator.onLine)
  const [queueLen, setQueueLen] = useState(0)
  const [syncing,  setSyncing]  = useState(false)
  const syncRef = useRef(false)

  const checkQueue = useCallback(async () => {
    try { setQueueLen(await getQueueSize()) } catch {}
  }, [])

  const doSync = useCallback(async () => {
    if (syncRef.current || !navigator.onLine) return
    syncRef.current = true
    setSyncing(true)
    try {
      const size = await getQueueSize()
      if (size === 0) { setSyncing(false); syncRef.current = false; return }
      const synced = await syncOfflineQueue()
      await checkQueue()
      if (synced > 0) {
        window.dispatchEvent(new CustomEvent('net:synced', { detail: { count: synced } }))
      }
    } catch {}
    setSyncing(false)
    syncRef.current = false
  }, [checkQueue])

  useEffect(() => {
    checkQueue()
    const iv = setInterval(async () => {
      await checkQueue()
      if (navigator.onLine) { const s = await getQueueSize(); if (s > 0) doSync() }
    }, 10000)

    const handleOnline = () => {
      setOnline(true)
      window.dispatchEvent(new CustomEvent('net:online'))
      setTimeout(doSync, 600)
    }
    const handleOffline = () => {
      setOnline(false)
      window.dispatchEvent(new CustomEvent('net:offline'))
    }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { clearInterval(iv); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [doSync, checkQueue])

  return { online, queueLen, syncing, doSync }
}

/* ══════════════════════════════════════
   NetworkBar — Navbar ichida kichik chip
══════════════════════════════════════ */
export function NetworkBar({ online, queueLen, syncing, doSync }) {
  if (online && queueLen === 0) return null
  const waiting = online && queueLen > 0
  return (
    <button
      onClick={() => waiting && doSync()}
      title={waiting ? `${queueLen} ta o'zgarish kutmoqda` : 'Internet yo\'q'}
      style={{
        display:'flex', alignItems:'center', gap:5,
        padding:'3px 9px', borderRadius:'var(--r)',
        background: online ? 'var(--yellowbg)' : 'var(--redbg)',
        border:`1px solid ${online ? 'rgba(210,153,34,.3)' : 'rgba(248,81,73,.3)'}`,
        fontSize:10, fontWeight:700,
        color: online ? 'var(--yellow)' : 'var(--red)',
        cursor: waiting ? 'pointer' : 'default',
        transition:'all .2s', outline:'none',
      }}>
      <span style={{ fontSize:11 }}>{online ? (syncing ? '⏳' : '📤') : '📡'}</span>
      {!online ? 'Offline' : syncing ? 'Sync...' : `${queueLen} kutmoqda`}
    </button>
  )
}

/* ══════════════════════════════════════
   NetworkToast — ekran burchagida kichik
   "Internet uzildi" / "Tiklandi" notification
══════════════════════════════════════ */
export function NetworkToast() {
  const [state, setState] = useState(null)
  // state: null | 'offline' | 'syncing' | { synced: N }
  const timerRef = useRef(null)

  const clear = () => { clearTimeout(timerRef.current); setState(null) }

  useEffect(() => {
    const onOffline = () => {
      clearTimeout(timerRef.current)
      setState('offline')   // qoladi — internet kelguncha
    }
    const onOnline = () => {
      setState('syncing')
      timerRef.current = setTimeout(() => setState(null), 6000)
    }
    const onSynced = e => {
      setState({ synced: e.detail.count })
      timerRef.current = setTimeout(clear, 4000)
    }

    window.addEventListener('net:offline', onOffline)
    window.addEventListener('net:online',  onOnline)
    window.addEventListener('net:synced',  onSynced)
    return () => {
      window.removeEventListener('net:offline', onOffline)
      window.removeEventListener('net:online',  onOnline)
      window.removeEventListener('net:synced',  onSynced)
    }
  }, [])

  if (!state) return null

  const isOffline  = state === 'offline'
  const isSyncing  = state === 'syncing'
  const isSynced   = typeof state === 'object'

  const cfg = isOffline ? {
    bg:     'rgba(15,10,10,.96)',
    border: 'rgba(248,81,73,.35)',
    icon:   '📡',
    title:  'Internet uzildi',
    sub:    "Barcha o'zgarishlar saqlanadi",
    btn:    "Offline davom etish →",
    btnC:   'rgba(248,81,73,.15)',
    btnT:   '#f85149',
  } : isSyncing ? {
    bg:     'rgba(10,15,10,.96)',
    border: 'rgba(34,197,94,.35)',
    icon:   '🔄',
    title:  'Internet tiklandi',
    sub:    "Ma'lumotlar yuborilmoqda...",
    btn:    null,
    btnC:   null,
    btnT:   null,
  } : {
    bg:     'rgba(10,15,10,.96)',
    border: 'rgba(34,197,94,.35)',
    icon:   '✅',
    title:  `${state.synced} ta o'zgarish yuborildi`,
    sub:    'Hammasi saqland',
    btn:    null,
    btnC:   null,
    btnT:   null,
  }

  return (
    <div style={{
      position:   'fixed',
      bottom:     20,
      right:      20,
      zIndex:     9999,
      background: cfg.bg,
      border:     `1px solid ${cfg.border}`,
      borderRadius: 12,
      padding:    '10px 14px',
      minWidth:   220,
      maxWidth:   280,
      backdropFilter: 'blur(16px)',
      boxShadow:  '0 8px 32px rgba(0,0,0,.4)',
      animation:  'netSlideIn .25s cubic-bezier(.16,1,.3,1) both',
      display:    'flex',
      flexDirection: 'column',
      gap:        6,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* Animated icon */}
        <span style={{
          fontSize:16, flexShrink:0,
          animation: isSyncing ? 'netSpin 1s linear infinite' : 'none',
          display: 'inline-block',
        }}>
          {cfg.icon}
        </span>
        <div style={{ flex:1 }}>
          <div style={{
            fontSize:12, fontWeight:700,
            color: isOffline ? '#f85149' : '#22c55e',
          }}>
            {cfg.title}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', marginTop:1 }}>
            {cfg.sub}
          </div>
        </div>
        {/* Close — faqat offline holatda emas (u qolsin) */}
        {!isOffline && (
          <button onClick={clear} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'rgba(255,255,255,.3)', fontSize:14, lineHeight:1, padding:2,
          }}>✕</button>
        )}
      </div>

      {/* Offline progressbar — pulsing */}
      {isOffline && (
        <div style={{ height:2, background:'rgba(248,81,73,.15)', borderRadius:99, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:'40%',
            background:'#f85149',
            borderRadius:99,
            animation:'netPulseBar 1.8s ease-in-out infinite',
          }}/>
        </div>
      )}

      {/* Syncing progress */}
      {isSyncing && (
        <div style={{ height:2, background:'rgba(34,197,94,.15)', borderRadius:99, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:'100%',
            background:'linear-gradient(90deg,#22c55e,#06B6D4)',
            borderRadius:99,
            animation:'netProgress 1.4s ease-in-out infinite',
          }}/>
        </div>
      )}

      {/* "Offline davom etish" button */}
      {cfg.btn && (
        <button onClick={clear} style={{
          background: cfg.btnC,
          border:     `1px solid ${cfg.btnT}40`,
          borderRadius: 7,
          padding:    '5px 10px',
          fontSize:   11,
          fontWeight: 700,
          color:      cfg.btnT,
          cursor:     'pointer',
          transition: 'all .15s',
          marginTop:  2,
          textAlign:  'left',
        }}
          onMouseEnter={e => e.currentTarget.style.background = cfg.btnT + '25'}
          onMouseLeave={e => e.currentTarget.style.background = cfg.btnC}
        >
          {cfg.btn}
        </button>
      )}

      <style>{`
        @keyframes netSlideIn {
          from { opacity:0; transform:translateY(12px) scale(.96) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes netSpin {
          to { transform: rotate(360deg) }
        }
        @keyframes netPulseBar {
          0%   { transform: translateX(-100%) }
          50%  { transform: translateX(150%) }
          100% { transform: translateX(150%) }
        }
        @keyframes netProgress {
          0%   { transform: translateX(-100%) scaleX(.5) }
          50%  { transform: translateX(0%)   scaleX(1) }
          100% { transform: translateX(100%) scaleX(.5) }
        }
      `}</style>
    </div>
  )
}
