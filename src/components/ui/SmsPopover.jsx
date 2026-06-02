import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MdMessage, MdClose } from 'react-icons/md'
import { toast } from './UI.jsx'

function TgLogo() {
  return <svg viewBox="0 0 24 24" fill="currentColor" style={{width:15,height:15,flexShrink:0}}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/></svg>
}
function SmsLogo() {
  return <svg viewBox="0 0 24 24" fill="currentColor" style={{width:15,height:15,flexShrink:0}}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
}

export function SmsPopover({ phone, customerName, orderNum, messageType = 'pickup' }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top:0, left:0 })
  const btnRef = useRef(null)

  // Recalculate popover position when opened
  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const popH = 260  // approximate popover height
    const popW = 280

    let top  = rect.bottom + window.scrollY + 4
    let left = rect.left   + window.scrollX

    // If not enough space below → show above
    if (rect.bottom + popH > window.innerHeight) {
      top = rect.top + window.scrollY - popH - 4
    }
    // If goes beyond right edge
    if (left + popW > window.innerWidth) {
      left = window.innerWidth - popW - 8
    }

    setPos({ top, left })
  }, [open])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    function h(e) {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        // Check if click is inside the portal popover
        const portal = document.getElementById('sms-popover-portal')
        if (portal && portal.contains(e.target)) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  if (!phone) return null

  const clean = phone.replace(/\D/g,'')
  const name  = customerName || 'Hurmatli mijoz'

  const SMS_PICKUP   = `Salom, ${name}! Buyurtmangiz #${orderNum} qabul qilindi. Tez orada shafyorimiz sizga yetib boradi. Minnatdorchilik bilan, CleanPro.`
  const SMS_DELIVERY = `Salom, ${name}! Buyurtmangiz #${orderNum} tayyor va yetkazib berilmoqda. Shafyorimiz tez orada keladi. CleanPro.`

  const smsText = messageType === 'pickup' ? SMS_PICKUP : SMS_DELIVERY
  const tgUrl   = `https://t.me/+${clean}?text=${encodeURIComponent(smsText)}`
  const smsUrl  = `sms:+${clean}?body=${encodeURIComponent(smsText)}`

  const popover = open && createPortal(
    <div
      id="sms-popover-portal"
      style={{
        position:  'fixed',
        top:       pos.top,
        left:      pos.left,
        zIndex:    99999,
        background:'var(--bg2)',
        border:    '1px solid var(--border)',
        borderRadius: 'var(--r2)',
        boxShadow: '0 12px 40px rgba(0,0,0,.6)',
        width:     280,
        overflow:  'hidden',
        animation: 'slideUp 120ms both',
      }}
    >
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)'}}>
        <div style={{fontSize:12,fontWeight:700}}>📨 Xabar yuborish</div>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,margin:'0 8px'}}>
          <span style={{fontSize:11,color:'var(--text2)',fontFamily:'monospace'}}>{phone}</span>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:2,display:'flex'}}>
          <MdClose size={14}/>
        </button>
      </div>

      {/* Message type label */}
      <div style={{padding:'6px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)'}}>
        <div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.4px',fontWeight:700,marginBottom:3}}>
          {messageType==='pickup' ? '📥 Olib kelish xabari' : '📦 Yetkazib berish xabari'}
        </div>
        <div style={{fontSize:11,color:'var(--text)',lineHeight:1.5,fontStyle:'italic',background:'var(--bg4)',borderRadius:'var(--r)',padding:'5px 8px'}}>
          {smsText.slice(0,80)}...
        </div>
      </div>

      {/* Buttons */}
      <a href={tgUrl} target="_blank" rel="noopener noreferrer"
        onClick={()=>{toast(`TG: ${name} ga yuborildi`,'ok');setOpen(false)}}
        style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',textDecoration:'none',color:'var(--text)',borderBottom:'1px solid var(--border)',transition:'background 100ms'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <div style={{width:30,height:30,borderRadius:8,background:'#229ED9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <TgLogo/>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:700}}>Telegram orqali</div>
          <div style={{fontSize:10,color:'var(--text2)'}}>TG ilovasida tayyor xabar</div>
        </div>
      </a>

      <a href={smsUrl}
        onClick={()=>{toast(`SMS: ${name} ga yuborilmoqda`,'ok');setOpen(false)}}
        style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',textDecoration:'none',color:'var(--text)',transition:'background 100ms'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <div style={{width:30,height:30,borderRadius:8,background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <SmsLogo/>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:700}}>SMS orqali</div>
          <div style={{fontSize:10,color:'var(--text2)'}}>Telefon SMS ilovasida</div>
        </div>
      </a>
    </div>,
    document.body
  )

  return (
    <>
      <button ref={btnRef}
        onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}
        title="SMS / TG yuborish"
        style={{
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          width:20,height:20,borderRadius:4,
          background:open?'var(--accentbg)':'var(--bg3)',
          border:'1px solid var(--border)',
          cursor:'pointer',flexShrink:0,marginLeft:4,
          transition:'all 150ms',color:'var(--text2)',
        }}
      >
        <MdMessage size={12}/>
      </button>
      {popover}
    </>
  )
}
