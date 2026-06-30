/* ═══════════════════════════════════════════════════════
   useNetworkStatus — soddalashtirilgan
   Faqat internet bor/yo'qligini ko'rsatadi.
   Offline queue, sync, IndexedDB — YO'Q.
   Internet qaytsa: Socket.IO avtomatik qayta ulanadi (realtime.js)
   va sahifalar refresh:* eventlar orqali o'zlari yangilanadi.
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react'
import { bus } from '../services/realtime.js'

export function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => { setOnline(true); bus.emit('network:online') }
    const goOffline = () => { setOnline(false); bus.emit('network:offline') }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return { online }
}

export function NetworkToast() {
  const { online } = useNetworkStatus()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!online) {
      setVisible(true)
    } else if (visible) {
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
  }, [online])

  if (!visible) return null

  return (
    <div style={{
      position:'fixed', bottom:20, right:20, zIndex:9999,
      display:'flex', alignItems:'center', gap:10,
      padding:'12px 18px', borderRadius:14,
      background: online ? 'rgba(34,197,94,.95)' : 'rgba(248,81,73,.95)',
      color:'#fff', fontSize:13, fontWeight:700,
      boxShadow:'0 8px 24px rgba(0,0,0,.35)',
      backdropFilter:'blur(10px)',
      animation:'netSlideIn .3s cubic-bezier(.16,1,.3,1)',
      transition:'background .3s',
    }}>
      <span style={{
        width:8, height:8, borderRadius:'50%', background:'#fff',
        animation: online ? 'none' : 'netPulse 1.2s infinite',
      }}/>
      {online ? "✅ Internet tiklandi" : "⚠️ Internet aloqasi yo'q"}
      <style>{`
        @keyframes netSlideIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes netPulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}
