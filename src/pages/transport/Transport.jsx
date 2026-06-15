import { useState, useEffect, useMemo, useRef } from 'react'
import { io } from 'socket.io-client'
import {
  MdEdit, MdDelete, MdDirectionsCar, MdLocationOn,
  MdSwapHoriz, MdRefresh, MdSend, MdFullscreen, MdFullscreenExit,
  MdMyLocation, MdArrowDropDown
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Confirm, Sbadge, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Transport.css'
import { useRealtime, bus } from '../../services/realtime.js'
import { useStore } from '../../store/AppStore.jsx'
const isMob = () => window.innerWidth <= 768

const STATUSES     = ['yangi','jarayonda','yetkazildi','bekor']
const DRIVER_COLORS= ['#3fb950','#58a6ff','#f0883e','#bc8cff','#ff7b72','#ffa657']

function norm(r) {
  if (Array.isArray(r)) return r
  if (Array.isArray(r?.data)) return r.data
  return []
}
function tgLink(phone, text) {
  const c = (phone||'').replace(/\D/g,'')
  return `https://t.me/+${c}?text=${encodeURIComponent(text)}`
}
function TgIcon() {
  return <svg style={{width:11,height:11,flexShrink:0}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/></svg>
}

function orderToTask(order, type) {
  return {
    _id:       'task_'+order._id, orderId:order._id,
    order:     order.number,    customer:order.customer,
    phone:     order.phone,     address:order.address,
    lat:       order.lat,       lon:order.lon,
    driver:    order.driver||'', status:'yangi', type, auto:true,
    totalPrice:order.total||0,  amountDue:order.total||0,
  }
}


/* ══════════════════════════════════════════
   MOBILE TASK CARD — iOS style
══════════════════════════════════════════ */
function MobileTaskCard({ row, type, drivers, onAssign, onSendTg, sending }) {
  const color = type === 'delivery' ? '#3fb950' : '#f0883e'
  const hasDriver = !!row.driver

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Top accent bar */}
      <div style={{height:3, background:`linear-gradient(90deg,${color},${color}88)`}}/>

      <div style={{padding:'12px 14px'}}>
        {/* Header row */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              <span style={{
                fontFamily:'monospace',fontWeight:800,fontSize:14,color,
              }}>{row.order}</span>
              {row.auto && (
                <span style={{
                  fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4,
                  background:'rgba(59,130,246,.15)',color:'#3B82F6',
                }}>AUTO</span>
              )}
            </div>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{row.customer}</div>
          </div>
          {/* TG button */}
          {row.phone && (
            <a href={tgLink(row.phone,'Salom!')} target="_blank" rel="noopener noreferrer"
              style={{
                display:'flex',alignItems:'center',gap:4,
                padding:'5px 10px',borderRadius:99,
                background:'rgba(34,158,217,.12)',
                border:'1px solid rgba(34,158,217,.25)',
                color:'#229ED9',fontSize:11,fontWeight:700,
                textDecoration:'none',flexShrink:0,
              }}>
              <TgIcon/> TG
            </a>
          )}
        </div>

        {/* Address */}
        {row.address && (
          <div style={{
            display:'flex',alignItems:'flex-start',gap:6,
            padding:'7px 10px',borderRadius:10,
            background:'var(--bg3)',marginBottom:8,
            fontSize:12,color:'var(--text2)',lineHeight:1.4,
          }}>
            <MdLocationOn size={14} style={{color,flexShrink:0,marginTop:1}}/>
            <span>{row.address}</span>
          </div>
        )}

        {/* Driver + Actions */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          {/* Driver status */}
          <button onClick={()=>onAssign(row)} style={{
            flex:1,display:'flex',alignItems:'center',gap:6,
            padding:'8px 12px',borderRadius:10,cursor:'pointer',
            background: hasDriver ? `${color}12` : 'var(--bg3)',
            border: `1px solid ${hasDriver ? color+'40' : 'var(--border)'}`,
            color: hasDriver ? color : 'var(--text3)',
            fontSize:12,fontWeight:600,
            WebkitTapHighlightColor:'transparent',
          }}>
            <MdDirectionsCar size={14}/>
            {hasDriver ? row.driver : 'Shafyor biriktirish'}
            {hasDriver && <MdSwapHoriz size={12} style={{marginLeft:'auto',opacity:.6}}/>}
          </button>

          {/* Send TG to customer */}
          {row.phone && (
            <button onClick={()=>onSendTg(row)} disabled={sending===row._id} style={{
              padding:'8px 12px',borderRadius:10,cursor:'pointer',
              background: row.tgSent ? 'rgba(34,197,94,.12)' : 'rgba(34,158,217,.12)',
              border: `1px solid ${row.tgSent ? 'rgba(34,197,94,.3)' : 'rgba(34,158,217,.3)'}`,
              color: row.tgSent ? '#22c55e' : '#229ED9',
              fontSize:12,fontWeight:700,
              display:'flex',alignItems:'center',gap:4,
              WebkitTapHighlightColor:'transparent',
            }}>
              <MdSend size={13}/>
              {row.tgSent ? 'Yuborildi' : 'Xabar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════
   TASK PANEL
════════════════════════════════ */
function TaskPanel({ title, icon, color, type, apiFns, drivers, allOrders, onDriverChange }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [assign,  setAssign]  = useState(null)
  const [selDrv,  setSelDrv]  = useState(null)
  const [delId,   setDelId]   = useState(null)
  const [sending, setSending] = useState(null)

  useEffect(() => { load() }, [allOrders])

  async function load() {
    setLoading(true)
    try {
      // Faqat allOrders dan filter qilamiz — Task DB ikki marta chiqishga sabab bo'ladi
      const pickupStatuses   = ['yangi', 'qabul_qilindi', 'qabul']
      const deliveryStatuses = ['yetkazishda']
      const statusKeys = type === 'pickup' ? pickupStatuses : deliveryStatuses
      const rows = allOrders
        .filter(o => statusKeys.includes(o.status))
        .map(o => orderToTask(o, type))
      setRows(rows)
    } catch { setRows([]) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => !q || r.order?.includes(q) || r.customer?.toLowerCase().includes(q))
  }, [rows, search])

  async function confirmAssign() {
    if (!selDrv) return
    const dr = drivers.find(d=>d._id===selDrv)
    if (!dr) return
    try {
      await apiFns.update(assign._id, { driver: dr.name })
      setRows(p=>p.map(r=>r._id===assign._id?{...r,driver:dr.name}:r))
      onDriverChange?.(dr.name, 'band')
      // Send TG to driver
      if (dr.phone) {
        const url = tgLink(dr.phone, `🚗 Yangi topshiriq!\n📋 ${assign.order}\n👤 ${assign.customer}\n📍 ${assign.address}\n\nDasturga kiring: /start`)
        window.open(url, '_blank')
      }
      toast(`${dr.name} biriktirildi, TG xabari tayyorlandi ✅`, 'ok')
    } catch(e) { toast(e.message,'err') }
    setAssign(null); setSelDrv(null)
  }

  async function changeStatus(row, s) {
    try { await apiFns.update(row._id, { status:s }) } catch {}
    setRows(p=>p.map(r=>r._id===row._id?{...r,status:s}:r))
  }

  async function sendTg(row) {
    setSending(row._id)
    try {
      const msg = type==='delivery'
        ? `📦 Buyurtmangiz ${row.order} tayyor!\n👤 ${row.customer}\n📍 ${row.address}\nBizga murojaat: +998901234567`
        : `🚗 Shafyor yo'lda, tez orada yetib boradi.\n📋 ${row.order}\nBizga murojaat: +998901234567`
      window.open(tgLink(row.phone, msg), '_blank')
      setRows(p=>p.map(r=>r._id===row._id?{...r,tgSent:true}:r))
      toast('TG xabari tayyorlandi ✅','ok')
    } catch { toast('Xato','err') }
    setSending(null)
  }

  return (
    <div className="tp-panel active">
      <div className="tp-panel-hd">
        <div className="tp-panel-title">
          <div className="tp-panel-icon" style={{background:color+'22'}}>{icon}</div>
          {title}
          <span className="tp-panel-count">{filtered.length} ta</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><MdRefresh size={14}/></button>
      </div>

      <div className="tp-fbar">
        <input placeholder="🔍 Qidirish..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="tp-tbl-wrap">
        {loading ? (
          <div className="tp-empty"><div className="tp-empty-ico">⏳</div>Yuklanmoqda...</div>
        ) : filtered.length===0 ? (
          <div className="tp-empty"><div className="tp-empty-ico">📭</div>Topshiriq yo'q</div>
        ) : (
          <table className="tp-tbl">
            <thead>
              <tr>
                <th>Buyurtma</th>
                <th>Mijoz / TG</th>
                <th>Manzil</th>
                <th>Shafyor</th>
                <th>Xabar</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row._id}>
                  <td>
                    <span className="tp-order-num">{row.order}</span>
                    {row.auto&&<span className="badge b-blue" style={{fontSize:9,marginLeft:4}}>AUTO</span>}
                  </td>
                  <td>
                    <div style={{fontWeight:600,fontSize:12.5}}>{row.customer}</div>
                    {row.phone && (
                      <a href={tgLink(row.phone,'Salom!')} target="_blank" rel="noopener noreferrer" className="tp-tg-btn">
                        <TgIcon/> {row.phone}
                      </a>
                    )}
                  </td>
                  <td>
                    <div style={{fontSize:11}}>{row.address||'—'}</div>
                    {(row.lat&&row.lon) && (
                      <a href={`https://yandex.com/maps/?ll=${row.lon},${row.lat}&z=15&pt=${row.lon},${row.lat},pm2rdm`} target="_blank" rel="noopener noreferrer" className="tp-loc-btn">
                        <MdLocationOn size={11}/> Xaritada
                      </a>
                    )}
                  </td>
                  <td>
                    {row.driver ? (
                      <div style={{display:'flex',flexDirection:'column',gap:3}}>
                        <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:500}}>
                          <MdDirectionsCar size={12} style={{color:'var(--text2)'}}/> {row.driver}
                        </div>
                        <button className="tp-change-btn" onClick={()=>{setAssign(row);setSelDrv(null)}}>
                          <MdSwapHoriz size={11}/> Almashtirish
                        </button>
                      </div>
                    ) : (
                      <button className="tp-assign-btn" onClick={()=>{setAssign(row);setSelDrv(null)}}>
                        <MdDirectionsCar size={11}/> Biriktirish
                      </button>
                    )}
                  </td>
                  <td>
                    {row.driver ? (
                      <button className={`tp-send-btn ${row.tgSent?'sent':'unsent'}`}
                        onClick={()=>sendTg(row)} disabled={sending===row._id}>
                        {sending===row._id?'⏳':row.tgSent?'✅ Yuborildi':<><MdSend size={11}/> Yuborish</>}
                      </button>
                    ) : <span style={{fontSize:10,color:'var(--text3)'}}>Shafyor kerak</span>}
                  </td>
                  <td>
                    <select value={row.status} onChange={e=>changeStatus(row,e.target.value)}
                      style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'3px 6px',color:'var(--text)',fontFamily:'inherit',fontSize:11,cursor:'pointer',outline:'none'}}>
                      {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={13}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign modal */}
      <Modal open={!!assign} onClose={()=>{setAssign(null);setSelDrv(null)}}
        title={assign?.driver?`🔄 Shafyor almashtirish`:`🚗 Shafyor biriktirish`} size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>{setAssign(null);setSelDrv(null)}}>Bekor</button>
          <button className="btn btn-primary" onClick={confirmAssign} disabled={!selDrv}>✅ Biriktirish</button></>}>
        {assign?.driver&&<div style={{padding:'7px 10px',background:'var(--orangebg)',borderRadius:'var(--r)',marginBottom:10,fontSize:12,color:'var(--orange)',fontWeight:600}}>⚠️ Hozirgi: {assign.driver}</div>}
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>{assign?.customer} — {assign?.address}</div>
        <div className="assign-driver-list">
          {drivers.map(dr=>(
            <div key={dr._id} className={`assign-driver-item ${selDrv===dr._id?'sel':''}`} onClick={()=>setSelDrv(dr._id)}>
              <div className="assign-driver-avatar">{dr.name?.[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{dr.name}</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>{dr.car} · {dr.plate}</div>
              </div>
              <Sbadge s={dr.status}/>
            </div>
          ))}
        </div>
      </Modal>
      <Confirm open={!!delId} onClose={()=>setDelId(null)}
        onOk={async()=>{try{await apiFns.remove(delId)}catch{};setRows(p=>p.filter(r=>r._id!==delId));setDelId(null);toast("O'chirildi",'inf')}}
        title="O'chirish" msg="O'chirishni xohlaysizmi?" danger/>
    </div>
  )
}

/* ════════════════════════════════
   LIVE MAP — Leaflet.js (OpenStreetMap)
════════════════════════════════ */
function LiveMap({ drivers, driverLocations, setDriverLocations, orders }) {
  const [connected,   setConnected]   = useState(false)
  const [fullscreen,  setFullscreen]  = useState(false)
  const [focused,     setFocused]     = useState(null)
  const [assignOrder, setAssignOrder] = useState(null)
  const [selDrv,      setSelDrv]      = useState(null)
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef({})
  const socketRef  = useRef(null)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const pendingPickup   = orders.filter(o => o && !o.driver && o.status==='yangi')
  const pendingDelivery = orders.filter(o => o && o.status==='yetkazishda')
  const activeDrivers   = drivers.filter(d => driverLocations[d.tgChatId||d._id]?.online)

  // Init Leaflet map
  useEffect(() => {
    if (leafletRef.current) return
    if (!mapRef.current) return

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = window.L
      const map = L.map(mapRef.current, { zoomControl: true }).setView([41.2995, 69.2401], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      leafletRef.current = map
      updateMarkers()
    }
    document.head.appendChild(script)

    return () => { leafletRef.current?.remove(); leafletRef.current = null }
  }, [])

  // Update markers when data changes
  function updateMarkers() {
    const L = window.L
    if (!L || !leafletRef.current) return
    const map = leafletRef.current

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    // Driver markers
    drivers.forEach((dr, i) => {
      const tgId = dr.tgChatId || dr._id
      const loc  = driverLocations[tgId]
      if (!loc?.latitude || !loc?.longitude) return
      const colors = ['#3fb950','#58a6ff','#f0883e','#bc8cff','#ff7b72']
      const clr = colors[i % colors.length]
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${clr};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.4)">🚗</div>`,
        iconSize: [32,32], iconAnchor: [16,16],
      })
      const marker = L.marker([loc.latitude, loc.longitude], { icon })
        .addTo(map)
        .bindPopup(`<b>${dr.name||'Shafyor'}</b><br>📍 Online<br>${loc.speed?'🚀 '+Math.round(loc.speed*3.6)+'km/h':''}`)
      markersRef.current['drv_'+tgId] = marker
    })

    // Pickup markers (green)
    pendingPickup.forEach(o => {
      if (!o.lat || !o.lon) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#3fb950;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">📥 ${o.number}</div>`,
        iconSize: [80,28], iconAnchor: [40,14],
      })
      const m = L.marker([o.lat, o.lon], { icon })
        .addTo(map)
        .bindPopup(`<b>${o.number}</b><br>👤 ${o.customer||''}<br>📍 ${o.address||''}`)
        .on('click', () => { setAssignOrder(o); setSelDrv(null) })
      markersRef.current['pickup_'+o._id] = m
    })

    // Delivery markers (orange)
    pendingDelivery.forEach(o => {
      if (!o.lat || !o.lon) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#f0883e;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">📦 ${o.number}</div>`,
        iconSize: [80,28], iconAnchor: [40,14],
      })
      const m = L.marker([o.lat, o.lon], { icon }).addTo(map)
        .bindPopup(`<b>${o.number}</b><br>👤 ${o.customer||''}<br>📍 ${o.address||''}`)
      markersRef.current['delivery_'+o._id] = m
    })
  }

  useEffect(() => { updateMarkers() }, [driverLocations, drivers, orders])

  // Focus on driver
  useEffect(() => {
    if (!focused || !leafletRef.current) return
    const loc = driverLocations[focused]
    if (loc?.latitude && loc?.longitude) {
      leafletRef.current.setView([loc.latitude, loc.longitude], 15, { animate: true })
    }
  }, [focused])

  // Socket.IO
  useEffect(() => {
    fetch(`${API}/api/driver/live-locations`)
      .then(r=>r.json()).then(arr=>{
        if (Array.isArray(arr)) {
          const locs={}; arr.forEach(d=>{locs[d.telegramId]={...d,online:true}}); setDriverLocations(locs)
        }
      }).catch(()=>{})

    try {
      const socket = io(API, { transports:['websocket','polling'] })
      socketRef.current = socket
      socket.on('connect',    ()=>setConnected(true))
      socket.on('disconnect', ()=>setConnected(false))
      socket.on('driver:live-location', data => setDriverLocations(prev=>({...prev,[data.telegramId]:{...data,online:true}})))
    } catch {}

    const poll = setInterval(()=>{
      fetch(`${API}/api/driver/live-locations`).then(r=>r.json())
        .then(arr=>{ if(Array.isArray(arr)){const l={};arr.forEach(d=>{l[d.telegramId]={...d,online:true}});setDriverLocations(p=>({...p,...l}))} })
        .catch(()=>{})
    }, 15000)

    return () => { socketRef.current?.disconnect(); clearInterval(poll) }
  }, [])

  async function confirmMapAssign() {
    if (!selDrv || !assignOrder) return
    const dr = drivers.find(d=>d._id===selDrv)
    try {
      await api.updateOrder(assignOrder._id, { driver: dr.name })
      toast(`${dr.name} → ${assignOrder.number} biriktirildi ✅`, 'ok')
      if (dr.phone) {
        const msg = `🚗 Yangi topshiriq!\n📋 ${assignOrder.number}\n👤 ${assignOrder.customer}\n📍 ${assignOrder.address||''}`
        window.open(`https://t.me/+${dr.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
      }
    } catch(e) { toast(e.message,'err') }
    setAssignOrder(null); setSelDrv(null)
  }

  return (
    <div className="live-map-section" style={{position:fullscreen?'fixed':undefined,top:fullscreen?0:undefined,left:fullscreen?0:undefined,right:fullscreen?0:undefined,bottom:fullscreen?0:undefined,zIndex:fullscreen?9000:undefined,margin:fullscreen?0:undefined,borderRadius:fullscreen?0:undefined}}>
      {/* Header */}
      <div className="live-map-hd">
        <div className="live-map-title">
          <div style={{width:10,height:10,borderRadius:'50%',background:connected?'var(--green)':'var(--yellow)',flexShrink:0}}/>
          🗺️ Live Xarita
          <span style={{fontSize:11,color:'var(--text2)',fontWeight:400}}>{connected?'· Socket.IO ulangan':'· Polling'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'var(--text2)'}}>
            🚗 {activeDrivers.length} ta online
            · 📥 {pendingPickup.length} ta kutayapti
            · 📦 {pendingDelivery.length} ta yetkazilmoqda
          </span>
          <button className="btn btn-ghost btn-sm" onClick={()=>setFullscreen(v=>!v)}>
            {fullscreen?<MdFullscreenExit size={16}/>:<MdFullscreen size={16}/>}
          </button>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="live-map-frame" style={{height:fullscreen?'calc(100vh - 90px)':'420px',position:'relative'}}>
        <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
      </div>

      {/* Bottom chips */}
      <div className="map-pins-bar" style={{flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:10,alignItems:'center',fontSize:11,color:'var(--text2)'}}>
          <span>🚗 Shafyor</span>
          <span>📥 Olib kelish</span>
          <span>📦 Yetkazish</span>
          <span style={{color:'var(--text3)',fontSize:10}}>· Belgi ustiga bosing — batafsil</span>
        </div>

        {drivers.map((dr,i)=>{
          const tgId = dr.tgChatId||dr._id
          const loc  = driverLocations[tgId]
          const colors=['#3fb950','#58a6ff','#f0883e','#bc8cff','#ff7b72']
          const clr  = colors[i%colors.length]
          return (
            <div key={dr._id}
              className="map-pin-chip"
              style={{borderColor:focused===tgId?clr:undefined,color:focused===tgId?clr:undefined,background:focused===tgId?clr+'11':undefined,cursor:'pointer'}}
              onClick={()=>setFocused(prev=>prev===tgId?null:tgId)}
            >
              <div className="pin-dot" style={{background:loc?.online?clr:'var(--text3)'}}/>
              🚗 {(dr.name||'Shafyor').split(' ')[0]}
              {loc?.speed ? ` · ${Math.round(loc.speed*3.6)}km/h` : ''}
              {!loc?.online && <span style={{fontSize:9,color:'var(--text3)',marginLeft:3}}>offline</span>}
            </div>
          )
        })}

        {pendingPickup.slice(0,5).map(o=>(
          <div key={o._id}
            className="map-pin-chip"
            style={{borderColor:'var(--green)',color:'var(--green)',cursor:'pointer'}}
            onClick={()=>{setAssignOrder(o);setSelDrv(null)}}
          >
            <div className="pin-dot" style={{background:'var(--green)'}}/>
            📥 {o.number}
          </div>
        ))}
      </div>

      {/* Assign modal */}
      <Modal open={!!assignOrder} onClose={()=>{setAssignOrder(null);setSelDrv(null)}}
        title={`🗺️ Shafyor biriktirish — ${assignOrder?.number}`} size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>{setAssignOrder(null);setSelDrv(null)}}>Bekor</button>
          <button className="btn btn-primary" onClick={confirmMapAssign} disabled={!selDrv}>✅ Biriktirish + TG</button></>}>
        <div style={{padding:'8px 10px',background:'var(--bg3)',borderRadius:'var(--r)',fontSize:12,marginBottom:10}}>
          <div style={{fontWeight:700}}>{assignOrder?.customer}</div>
          <div style={{color:'var(--text2)',marginTop:2}}>{assignOrder?.address}</div>
        </div>
        <div className="assign-driver-list">
          {drivers.map(dr=>{
            const tgId = dr.tgChatId||dr._id
            const loc  = driverLocations[tgId]
            return (
              <div key={dr._id} className={`assign-driver-item ${selDrv===dr._id?'sel':''}`} onClick={()=>setSelDrv(dr._id)}>
                <div className="assign-driver-avatar">{(dr.name||'?')[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{dr.name}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{dr.car} · {dr.plate}</div>
                </div>
                {loc?.online && <span style={{fontSize:10,color:'var(--green)',fontWeight:700}}>📍 Online</span>}
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}

/* ════════════════════════════════
   MAIN TRANSPORT
════════════════════════════════ */

/* ══════════════════════════════════════════
   MOBILE TASK PANEL
══════════════════════════════════════════ */
function MobileTaskPanel({ type, color, apiFns, drivers, allOrders, onDriverChange }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [assign,  setAssign]  = useState(null)
  const [selDrv,  setSelDrv]  = useState(null)
  const [sending, setSending] = useState(null)

  useEffect(() => { load() }, [allOrders, type])

  async function load() {
    setLoading(true)
    try {
      const tasks = norm(await apiFns.getAll())
      // pickup = yangi/qabul_qilindi (olib kelish kerak)
      // delivery = yetkazishda (olib borish kerak)
      const pickupStatuses   = ['yangi', 'qabul_qilindi', 'qabul']
      const deliveryStatuses = ['yetkazishda']
      const statusKeys = type === 'pickup' ? pickupStatuses : deliveryStatuses
      const autoTasks = allOrders
        .filter(o => statusKeys.includes(o.status))
        .map(o => orderToTask(o, type))
      const toId = v => v?.$oid || (typeof v === 'object' ? JSON.stringify(v) : String(v||''))
      const existing = new Set(tasks.map(t => toId(t.orderId || t.order)))
      setRows([...tasks, ...autoTasks.filter(t => !existing.has(toId(t.orderId)))])
    } catch { setRows([]) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => !q || r.order?.includes(q) || r.customer?.toLowerCase().includes(q))
  }, [rows, search])

  async function confirmAssign() {
    if (!selDrv) return
    const dr = drivers.find(d=>d._id===selDrv)
    if (!dr) return
    try {
      await apiFns.update(assign._id, { driver: dr.name })
      setRows(p=>p.map(r=>r._id===assign._id?{...r,driver:dr.name}:r))
      onDriverChange?.(dr.name, 'band')
      if (dr.phone) {
        const url = tgLink(dr.phone, `🚗 Yangi topshiriq!\n📋 ${assign.order}\n👤 ${assign.customer}\n📍 ${assign.address}`)
        window.open(url, '_blank')
      }
      toast(`${dr.name} biriktirildi ✅`, 'ok')
    } catch(e) { toast(e.message,'err') }
    setAssign(null); setSelDrv(null)
  }

  async function sendTg(row) {
    setSending(row._id)
    const msg = type==='delivery'
      ? `📦 Buyurtmangiz ${row.order} tayyor!\n👤 ${row.customer}\n📍 ${row.address}`
      : `🚗 Shafyor yo'lda!\n📋 ${row.order}`
    window.open(tgLink(row.phone, msg), '_blank')
    setRows(p=>p.map(r=>r._id===row._id?{...r,tgSent:true}:r))
    setSending(null)
  }

  return (
    <div>
      {/* Search */}
      <div style={{
        display:'flex',alignItems:'center',gap:8,
        background:'var(--bg2)',border:'1px solid var(--border)',
        borderRadius:12,padding:'8px 12px',marginBottom:10,
      }}>
        <span style={{fontSize:15,flexShrink:0}}>🔍</span>
        <input placeholder="Buyurtma raqam yoki mijoz..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,background:'none',border:'none',outline:'none',
            color:'var(--text)',fontSize:14,fontFamily:'inherit'}}/>
        {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',
          color:'var(--text3)',cursor:'pointer',fontSize:16}}>✕</button>}
      </div>

      {/* Count */}
      <div style={{fontSize:12,color:'var(--text3)',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span>{filtered.length} ta topshiriq</span>
        <button onClick={load} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:3}}>
          <MdRefresh size={13}/> Yangilash
        </button>
      </div>

      {/* Cards */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {loading ? (
          [...Array(3)].map((_,i)=>(
            <div key={i} style={{height:100,borderRadius:14,background:'var(--bg2)',
              animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*80+'ms'}}/>
          ))
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:'36px 0',color:'var(--text3)'}}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>Topshiriq yo'q</div>
          </div>
        ) : filtered.map(row=>(
          <MobileTaskCard key={row._id} row={row} type={type}
            drivers={drivers}
            onAssign={r=>{setAssign(r);setSelDrv(null)}}
            onSendTg={sendTg}
            sending={sending}
          />
        ))}
      </div>

      {/* Assign modal */}
      <Modal open={!!assign} onClose={()=>{setAssign(null);setSelDrv(null)}}
        title={`🚗 Shafyor — ${assign?.order||''}`} size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>{setAssign(null);setSelDrv(null)}}>Bekor</button>
          <button className="btn btn-primary" onClick={confirmAssign} disabled={!selDrv}>✅ Biriktirish + TG</button>
        </>}>
        {assign && (
          <div style={{padding:'7px 10px',background:'var(--bg3)',borderRadius:'var(--r)',marginBottom:10,fontSize:12}}>
            <div style={{fontWeight:700}}>{assign.customer}</div>
            <div style={{color:'var(--text2)',marginTop:2}}>{assign.address}</div>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflowY:'auto'}}>
          {drivers.length===0
            ? <div style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Shafyor topilmadi</div>
            : drivers.map(d=>(
              <div key={d._id}
                className={`assign-driver-item ${selDrv===d._id?'sel':''}`}
                onClick={()=>setSelDrv(d._id)}>
                <div className="assign-driver-avatar">{d.name?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{d.name}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{d.car} · {d.plate}</div>
                </div>
                <Sbadge s={d.status}/>
              </div>
            ))
          }
        </div>
      </Modal>

      <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  )
}

export default function Transport() {
  const [drivers,         setDrivers]         = useState([])
  const [orders,          setOrders]           = useState([])
  const [driverLocations, setDriverLocations]  = useState({})
  const [mobileTab,       setMobileTab]        = useState('delivery')
  // mobile state added below in return

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [dR, oR] = await Promise.allSettled([api.getDrivers(), api.getOrders()])
      setDrivers(norm(dR.value))
      setOrders(norm(oR.value))
    } catch {}
  }

  function onDriverChange(name, status) {
    setDrivers(p => p.map(d => d.name===name ? {...d,status} : d))
  }

  const apiFns = {
    delivery: {
      getAll:  api.getDelivery  || (()=>Promise.resolve([])),
      update:  api.updateDelivery || (()=>Promise.resolve({})),
      remove:  api.deleteDelivery || (()=>Promise.resolve({})),
    },
    pickup: {
      getAll:  api.getPickup    || (()=>Promise.resolve([])),
      update:  api.updatePickup  || (()=>Promise.resolve({})),
      remove:  api.deletePickup  || (()=>Promise.resolve({})),
    },
  }

  const [mobile, setMobile] = useState(isMob())
  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useRealtime(['refresh:orders','refresh:transport','refresh:all'], () => { loadAll() })

  return (
    <ErrorBoundary>
      <div className="transport-wrap">

        {/* ── MOBILE LAYOUT ── */}
        {mobile && (
          <div style={{paddingBottom:90}}>
            {/* Hero stats */}
            <div style={{
              background:'linear-gradient(160deg,#0d1a0d 0%,#0d1117 100%)',
              padding:'14px 16px 16px',
              display:'flex',gap:10,
            }}>
              {[
                {emoji:'🚚',lbl:'Olib ketish',val:orders.filter(o=>o.status==='yetkazishda'&&o.driver).length,c:'#3fb950'},
                {emoji:'📮',lbl:'Olib kelish', val:orders.filter(o=>o.status==='qabul_qilindi'&&o.driver).length,c:'#f0883e'},
                {emoji:'🚗',lbl:'Online',      val:Object.values(driverLocations).filter(d=>d.online).length,c:'#58a6ff'},
              ].map(s=>(
                <div key={s.lbl} style={{
                  flex:1,background:'rgba(255,255,255,.05)',
                  border:'1px solid rgba(255,255,255,.08)',
                  borderRadius:14,padding:'10px 10px',textAlign:'center',
                }}>
                  <div style={{fontSize:18,marginBottom:3}}>{s.emoji}</div>
                  <div style={{fontSize:20,fontWeight:900,color:s.c,fontFamily:'monospace'}}>{s.val}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:1}}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Tab switcher */}
            <div style={{
              display:'flex',gap:0,margin:'0 16px',marginTop:12,
              background:'var(--bg2)',borderRadius:12,
              border:'1px solid var(--border)',overflow:'hidden',
            }}>
              {[
                {key:'delivery',label:'🚚 Olib Ketish',color:'#3fb950'},
                {key:'pickup',  label:'📮 Olib Kelish',color:'#f0883e'},
                {key:'map',     label:'🗺️ Xarita',      color:'#58a6ff'},
              ].map((t,i)=>(
                <button key={t.key} onClick={()=>setMobileTab(t.key)} style={{
                  flex:1,padding:'10px 4px',
                  background:mobileTab===t.key?`${t.color}18`:'transparent',
                  border:'none',borderRight:i<2?'1px solid var(--border)':'none',
                  color:mobileTab===t.key?t.color:'var(--text3)',
                  fontSize:11,fontWeight:700,cursor:'pointer',
                  transition:'all .2s',WebkitTapHighlightColor:'transparent',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Content */}
            <div style={{padding:'12px 16px 0'}}>
              {mobileTab !== 'map' && (
                <MobileTaskPanel
                  type={mobileTab}
                  color={mobileTab==='delivery'?'#3fb950':'#f0883e'}
                  apiFns={apiFns[mobileTab]}
                  drivers={drivers}
                  allOrders={orders}
                  onDriverChange={onDriverChange}
                />
              )}
              {mobileTab === 'map' && (
                <div style={{borderRadius:14,overflow:'hidden',border:'1px solid var(--border)'}}>
                  <LiveMap
                    drivers={drivers}
                    driverLocations={driverLocations}
                    setDriverLocations={setDriverLocations}
                    orders={orders}
                  />
                </div>
              )}
            </div>

            {/* Refresh FAB */}
            <button onClick={loadAll} style={{
              position:'fixed',bottom:74,right:20,
              width:46,height:46,borderRadius:'50%',
              background:'var(--bg2)',border:'1px solid var(--border)',
              color:'var(--text2)',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 4px 16px rgba(0,0,0,.3)',zIndex:200,
            }}>
              <MdRefresh size={20}/>
            </button>
          </div>
        )}

        {/* ── DESKTOP LAYOUT ── */}
        {!mobile && (<>
          <div className="ph">
            <div>
              <div className="ph-title">🚛 Transport</div>
              <div className="ph-sub">Olib Kelish · Olib Ketish · Live Xarita</div>
            </div>
            <div className="ph-actions">
              <button className="btn btn-ghost btn-sm" onClick={loadAll}><MdRefresh size={15}/> Yangilash</button>
            </div>
          </div>
          <div className="tp-tabs">
            {['delivery','pickup','map'].map(t=>(
              <button key={t} className={`tp-tab ${mobileTab===t?'active':''}`} onClick={()=>setMobileTab(t)}>
                {t==='delivery'?'🚚 Olib Ketish':t==='pickup'?'📮 Olib Kelish':'🗺️ Xarita'}
              </button>
            ))}
          </div>
          <div className="tp-grid">
            <div className={mobileTab==='pickup'||mobileTab==='map'?'tp-panel':'tp-panel active'}>
              <TaskPanel title="Olib Ketish" icon="🚚" color="#3fb950"
                type="delivery" apiFns={apiFns.delivery}
                drivers={drivers} allOrders={orders} onDriverChange={onDriverChange}/>
            </div>
            <div className={mobileTab==='delivery'||mobileTab==='map'?'tp-panel':'tp-panel active'}>
              <TaskPanel title="Olib Kelish" icon="📮" color="#f0883e"
                type="pickup" apiFns={apiFns.pickup}
                drivers={drivers} allOrders={orders} onDriverChange={onDriverChange}/>
            </div>
          </div>
          <div style={mobileTab!=='map'?{}:{display:'block'}}>
            <LiveMap drivers={drivers} driverLocations={driverLocations}
              setDriverLocations={setDriverLocations} orders={orders}/>
          </div>
        </>)}
      </div>
    </ErrorBoundary>
  )
}
