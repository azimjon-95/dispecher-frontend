import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import {
  MdAdd, MdEdit, MdDelete, MdDirectionsCar, MdLocationOn,
  MdSwapHoriz, MdMap, MdGpsFixed, MdRefresh, MdSend
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Confirm, Sbadge, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Transport.css'

/* ══ Constants ══ */
const STATUSES    = ['yangi','jarayonda','yetkazildi','bekor']
const EMPTY_FORM  = { order:'', customer:'', phone:'', address:'', lat:'', lon:'', driver:'', status:'yangi', time:'', date:new Date().toISOString().slice(0,10) }
const DRIVER_COLORS = ['#3fb950','#58a6ff','#f0883e','#bc8cff','#ff7b72','#ffa657']

/* ══ Helpers ══ */
function norm(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  return []
}
function tgLink(phone, orderNum, address) {
  const c = (phone||'').replace(/\D/g,'')
  return `https://t.me/+${c}?text=${encodeURIComponent(`Salom! Buyurtmangiz ${orderNum} tayyor.\nManzil: ${address}\nBizga murojaat: +998901234567`)}`
}
function mapUrl(lat, lon, addr) {
  if (lat && lon) return `https://yandex.com/maps/?ll=${lon},${lat}&z=16&pt=${lon},${lat},pm2rdm`
  return `https://yandex.com/maps/?text=${encodeURIComponent(addr||'')}`
}
function TgIcon() {
  return <svg style={{width:11,height:11,flexShrink:0}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/></svg>
}

/* ══ Sync orders → tasks helper ══
   Buyurtma shafyorga biriktirilganda delivery/pickup ga avtomatik o'tadi */
function orderToTask(order, type) {
  return {
    _id:      'task_' + order._id,
    order:    order.number,
    orderId:  order._id,
    customer: order.customer,
    phone:    order.phone,
    address:  order.address,
    lat:      order.lat    || null,
    lon:      order.lon    || null,
    driver:   order.driver || '',
    status:   'yangi',
    type,
    time:     '',
    date:     new Date().toISOString().slice(0,10),
    tgSent:   false,
    totalPrice: order.total || 0,
    amountDue:  order.total || 0,
    auto:     true,  // flag: came from orders
  }
}

/* ══════════════════════════════════════════
   TRANSPORT PANEL (delivery OR pickup)
══════════════════════════════════════════ */
function TransportPanel({ title, icon, color, apiFns, type, drivers, onDriverChange }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [statusF, setStatusF] = useState('')
  const [formModal,   setFormModal]   = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [assignModal, setAssignModal] = useState(null)
  const [selDriver,   setSelDriver]   = useState(null)
  const [delId,       setDelId]       = useState(null)
  const [sending,     setSending]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // Load tasks
      const taskRes = await apiFns.getAll()
      const tasks   = norm(taskRes)

      // Auto-merge orders with driver assigned
      let orders = []
      try { orders = norm(await api.getOrders()) } catch {}

      const statusForType = type === 'pickup' ? 'yangi' : 'yetkazishda'
      const autoTasks = orders
        .filter(o => o.driver && (type==='pickup' ? o.status==='qabul_qilindi' : o.status==='yetkazishda'))
        .map(o => orderToTask(o, type))

      // Merge: real tasks first, then auto (no duplicates by orderId)
      const existingOrderIds = new Set(tasks.map(t => t.orderId || t.order))
      const merged = [
        ...tasks,
        ...autoTasks.filter(t => !existingOrderIds.has(t.orderId) && !existingOrderIds.has(t.order))
      ]
      setRows(merged)
    } catch { setRows([]) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r =>
      (!q || r.order?.includes(q) || r.customer?.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q))
      && (!statusF || r.status === statusF)
    )
  }, [rows, search, statusF])

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function saveForm() {
    if (!form.order || !form.address) { toast('Buyurtma va manzil kerak!', 'err'); return }
    if (formModal === 'create') {
      const rec = await apiFns.create(form)
      setRows(p => [rec?.data||rec, ...p])
      toast('Yaratildi ✅', 'ok')
    } else {
      await apiFns.update(form._id, form)
      setRows(p => p.map(r => r._id===form._id ? {...r,...form} : r))
      toast('Yangilandi ✅', 'ok')
    }
    setFormModal(null)
  }

  /* Assign or change driver */
  async function confirmAssign() {
    if (!selDriver) { toast('Shafyorni tanlang', 'err'); return }
    const dr = drivers.find(d => d._id === selDriver)
    if (!dr) return

    // Mark previous driver as free
    const prev = assignModal.driver
    if (prev && prev !== dr.name) {
      onDriverChange(prev, 'faol')
    }

    try {
      await apiFns.update(assignModal._id, { driver: dr.name })
    } catch {}

    setRows(p => p.map(r => r._id===assignModal._id ? {...r, driver:dr.name} : r))
    onDriverChange(dr.name, 'band')
    toast(`${dr.name} biriktirildi ✅`, 'ok')
    setAssignModal(null); setSelDriver(null)
  }

  /* Send TG to driver */
  async function sendTg(row) {
    setSending(row._id)
    try {
      const url = tgLink(row.phone, row.order, row.address)
      window.open(url, '_blank')
      setRows(p => p.map(r => r._id===row._id ? {...r, tgSent:true} : r))
      toast('TG habar tayyorlandi ✅', 'ok')
    } catch { toast('Xato', 'err') }
    setSending(null)
  }

  async function changeStatus(row, s) {
    try { await apiFns.update(row._id, { status: s }) } catch {}
    setRows(p => p.map(r => r._id===row._id ? {...r, status:s} : r))
    toast(`Status: ${s}`, 'ok')
  }

  return (
    <div className="tp-panel active">
      {/* Header */}
      <div className="tp-panel-hd">
        <div className="tp-panel-title">
          <div className="tp-panel-icon" style={{background:color+'22'}}>{icon}</div>
          {title}
          <span className="tp-panel-count">{filtered.length} ta</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className="btn btn-ghost btn-sm" onClick={load} title="Yangilash"><MdRefresh size={14}/></button>
        </div>
      </div>

      {/* Filter */}
      <div className="tp-fbar">
        <input placeholder="🔍 Qidirish..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)}>
          <option value="">Barcha</option>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
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
                <th>Manzil / Xarita</th>
                <th>Shafyor</th>
                <th>TG Xabar</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row._id}>
                  {/* Buyurtma */}
                  <td>
                    <span className="tp-order-num">{row.order}</span>
                    {row.auto && <span className="badge b-blue" style={{fontSize:9,marginLeft:4}}>AUTO</span>}
                    {row.time && <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{row.time}</div>}
                  </td>

                  {/* Mijoz + TG */}
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:2}}>
                      <span style={{fontWeight:600,fontSize:12.5}}>{row.customer||'—'}</span>
                      {row.phone && (
                        <a href={tgLink(row.phone,row.order,row.address)} target="_blank" rel="noopener noreferrer" className="tp-tg-btn">
                          <TgIcon/> {row.phone}
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Manzil + Xarita */}
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      <span style={{fontSize:11.5}}>{row.address||'—'}</span>
                      {((row.lat&&row.lon)||row.address) && (
                        <a href={mapUrl(row.lat,row.lon,row.address)} target="_blank" rel="noopener noreferrer" className="tp-loc-btn">
                          <MdLocationOn size={11}/> Xaritada
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Shafyor + almashtirish */}
                  <td>
                    {row.driver ? (
                      <div style={{display:'flex',flexDirection:'column',gap:3}}>
                        <div className="tp-driver-cell">
                          <MdDirectionsCar size={13} style={{color:'var(--text2)'}}/>
                          <span style={{fontSize:12,fontWeight:500}}>{row.driver}</span>
                        </div>
                        <button className="tp-change-btn" onClick={()=>{setAssignModal(row);setSelDriver(null)}}>
                          <MdSwapHoriz size={11}/> Almashtirish
                        </button>
                      </div>
                    ) : (
                      <button className="tp-assign-btn" onClick={()=>{setAssignModal(row);setSelDriver(null)}}>
                        <MdDirectionsCar size={11}/> Biriktirish
                      </button>
                    )}
                  </td>

                  {/* TG yuborish */}
                  <td>
                    {row.driver ? (
                      <button
                        className={`tp-send-btn ${row.tgSent?'sent':'unsent'}`}
                        onClick={()=>sendTg(row)}
                        disabled={sending===row._id}
                      >
                        {sending===row._id ? '⏳' : row.tgSent ? '✅ Yuborildi' : <><MdSend size={11}/> Yuborish</>}
                      </button>
                    ) : (
                      <span style={{fontSize:10,color:'var(--text3)'}}>Shafyor kerak</span>
                    )}
                  </td>

                  {/* Holat */}
                  <td>
                    <select value={row.status}
                      onChange={e=>changeStatus(row,e.target.value)}
                      style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'3px 6px',color:'var(--text)',fontFamily:'inherit',fontSize:11,fontWeight:600,cursor:'pointer',outline:'none'}}>
                      {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="tp-row-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setFormModal('edit')}}><MdEdit size={14}/></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign/Change modal */}
      <Modal open={!!assignModal} onClose={()=>{setAssignModal(null);setSelDriver(null)}}
        title={assignModal?.driver ? `🔄 Shafyorni almashtirish — ${assignModal?.order}` : `🚗 Shafyor biriktirish — ${assignModal?.order}`}
        size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>{setAssignModal(null);setSelDriver(null)}}>Bekor</button>
          <button className="btn btn-primary" onClick={confirmAssign} disabled={!selDriver}>
            {assignModal?.driver ? '🔄 Almashtirish' : '✅ Biriktirish'}
          </button>
        </>}
      >
        {assignModal?.driver && (
          <div style={{padding:'8px 10px',background:'var(--orangebg)',border:'1px solid rgba(240,136,62,.2)',borderRadius:'var(--r)',fontSize:12,marginBottom:10,color:'var(--orange)',fontWeight:600}}>
            ⚠️ Hozirgi shafyor: {assignModal.driver}
          </div>
        )}
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>
          {assignModal?.customer} — {assignModal?.address}
        </div>
        <div className="assign-driver-list">
          {drivers.filter(d=>d.status==='faol'||d.status==='band').map(dr=>(
            <div key={dr._id}
              className={`assign-driver-item ${selDriver===dr._id?'sel':''}`}
              onClick={()=>setSelDriver(dr._id)}
            >
              <div className="assign-driver-avatar">{dr.name?.[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{dr.name}</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>{dr.car} · {dr.plate}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                <Sbadge s={dr.status}/>
                {dr.tgChatId
                  ? <span style={{fontSize:9,color:'#229ED9'}}>✅ TG</span>
                  : <span style={{fontSize:9,color:'var(--text3)'}}>⚠️ TG yo'q</span>}
              </div>
            </div>
          ))}
          {drivers.filter(d=>d.status==='faol'||d.status==='band').length===0 && (
            <div style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Faol shafyor yo'q</div>
          )}
        </div>
      </Modal>

      {/* Form modal */}
      <Modal open={formModal==='create'||formModal==='edit'} onClose={()=>setFormModal(null)}
        title={formModal==='create'?`➕ Yangi ${title}`:`✏️ ${title} tahrirlash`} size="lg"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setFormModal(null)}>Bekor</button>
          <button className="btn btn-primary" onClick={saveForm}>Saqlash</button>
        </>}
      >
        <div className="tp-form-row">
          <div className="fg"><label className="flabel">Buyurtma raqami *</label><input className="finput" placeholder="#1042" value={form.order} onChange={set('order')}/></div>
          <div className="fg"><label className="flabel">Mijoz</label><input className="finput" value={form.customer} onChange={set('customer')}/></div>
        </div>
        <div className="tp-form-row">
          <div className="fg"><label className="flabel">📱 Telefon</label><input className="finput" placeholder="+998 90 000 00 00" value={form.phone} onChange={set('phone')}/></div>
          <div className="fg"><label className="flabel">Shafyor</label>
            <select className="fselect" value={form.driver} onChange={set('driver')}>
              <option value="">— Tanlang —</option>
              {drivers.map(d=><option key={d._id} value={d.name}>{d.name} ({d.car}) {d.tgChatId?'✅':''}</option>)}
            </select>
          </div>
        </div>
        <div className="fg"><label className="flabel">Manzil *</label><input className="finput" value={form.address} onChange={set('address')}/></div>
        <div className="tp-form-row">
          <div className="fg"><label className="flabel">🌍 Latitude</label><input className="finput" type="number" step="any" placeholder="41.2995" value={form.lat} onChange={set('lat')}/></div>
          <div className="fg"><label className="flabel">🌍 Longitude</label><input className="finput" type="number" step="any" placeholder="69.2401" value={form.lon} onChange={set('lon')}/></div>
        </div>
        <div className="tp-form-row">
          <div className="fg"><label className="flabel">Holat</label>
            <select className="fselect" value={form.status} onChange={set('status')}>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fg"><label className="flabel">Vaqt</label><input className="finput" type="time" value={form.time} onChange={set('time')}/></div>
        </div>
      </Modal>

      <Confirm open={!!delId} onClose={()=>setDelId(null)}
        onOk={async()=>{try{await apiFns.remove(delId)}catch{} setRows(p=>p.filter(r=>r._id!==delId));setDelId(null);toast("O'chirildi",'inf')}}
        title="O'chirish" msg="O'chirishni xohlaysizmi?" danger/>
    </div>
  )
}

/* ══════════════════════════════════════════
   LIVE MAP SECTION — Real Socket.IO
══════════════════════════════════════════ */
function LiveMapSection({ drivers, driverLocations, setDriverLocations }) {
  const [focused,    setFocused]    = useState(null)
  const [connected,  setConnected]  = useState(false)
  const [fetchedOnce,setFetchedOnce]= useState(false)
  const socketRef = useRef(null)

  /* ── Connect to Socket.IO & fetch initial locations ── */
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

    // Fetch existing online drivers from Redis
    fetch(`${API}/api/driver/live-locations`)
      .then(r => r.json())
      .then(arr => {
        if (Array.isArray(arr)) {
          const locs = {}
          arr.forEach(d => { locs[d.telegramId] = d })
          setDriverLocations(locs)
          setFetchedOnce(true)
        }
      })
      .catch(() => {})

    // Socket.IO realtime
    try {
      const socket = io(API, { transports:['websocket','polling'], autoConnect:true })
      socketRef.current = socket

      socket.on('connect', () => {
        setConnected(true)
        socket.emit('join:admin')  // join admin room
      })
      socket.on('disconnect', () => setConnected(false))

      // Real-time driver location update
      socket.on('driver:live-location', (data) => {
        setDriverLocations(prev => ({
          ...prev,
          [data.telegramId]: { ...data, online: true },
        }))
      })

      // Driver went offline
      socket.on('driver:offline', ({ telegramId }) => {
        setDriverLocations(prev => {
          const u = { ...prev }
          if (u[telegramId]) u[telegramId] = { ...u[telegramId], online: false }
          return u
        })
      })
    } catch (e) {
      console.warn('Socket.IO connect failed:', e)
    }

    // Polling fallback: every 15s fetch from API
    const poll = setInterval(() => {
      const API2 = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      fetch(`${API2}/api/driver/live-locations`)
        .then(r => r.json())
        .then(arr => {
          if (Array.isArray(arr)) {
            const locs = {}
            arr.forEach(d => { locs[d.telegramId] = d })
            setDriverLocations(prev => ({ ...prev, ...locs }))
          }
        })
        .catch(() => {})
    }, 15000)

    return () => {
      socketRef.current?.disconnect()
      clearInterval(poll)
    }
  }, [])

  /* ── Build Yandex Maps iframe URL ── */
  const yandexUrl = useMemo(() => {
    const onlineLocs = Object.values(driverLocations).filter(d => d.online && d.latitude && d.longitude)

    if (focused && driverLocations[focused]?.latitude) {
      const loc = driverLocations[focused]
      return `https://yandex.com/maps/?ll=${loc.longitude},${loc.latitude}&z=15&pt=${loc.longitude},${loc.latitude},pm2rdm&l=map`
    }
    if (onlineLocs.length === 0) {
      return 'https://yandex.com/maps/?ll=69.2401,41.2995&z=12&l=map'
    }
    if (onlineLocs.length === 1) {
      const loc = onlineLocs[0]
      return `https://yandex.com/maps/?ll=${loc.longitude},${loc.latitude}&z=14&pt=${loc.longitude},${loc.latitude},pm2rdm&l=map`
    }
    // Multiple: use rtext for route or center
    const pts = onlineLocs.map(l => `${l.longitude},${l.latitude},pm2rdm`).join('~')
    const center = onlineLocs[0]
    return `https://yandex.com/maps/?ll=${center.longitude},${center.latitude}&z=12&pt=${pts}&l=map`
  }, [driverLocations, focused])

  /* OpenStreetMap iframe URL — works without iframe CSP restrictions */
  const osmUrl = useMemo(() => {
    const onlineLocs = Object.values(driverLocations).filter(d => d.online && d.latitude && d.longitude)
    if (onlineLocs.length === 0) {
      return 'https://www.openstreetmap.org/export/embed.html?bbox=69.0,41.1,69.5,41.5&layer=mapnik'
    }
    const loc = focused && driverLocations[focused]?.latitude ? driverLocations[focused] : onlineLocs[0]
    const markers = onlineLocs.map(l => `${l.latitude},${l.longitude}`).join('|')
    const zoom = onlineLocs.length === 1 ? 15 : 13
    return `https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude-0.02},${loc.latitude-0.01},${loc.longitude+0.02},${loc.latitude+0.01}&layer=mapnik&marker=${loc.latitude},${loc.longitude}`
  }, [driverLocations, focused])

  const onlineDrivers = drivers.filter(d => {
    const loc = Object.values(driverLocations).find(l => l.telegramId)
    return d.status === 'band' || Object.values(driverLocations).some(l => l.online)
  })
  const locList = Object.values(driverLocations).filter(l => l.online)

  return (
    <div className="live-map-section">
      {/* Header */}
      <div className="live-map-hd">
        <div className="live-map-title">
          <div className="live-dot-pulse" style={{background:connected?'var(--green)':'var(--yellow)'}}/>
          🗺️ Shafyorlar Xaritasi
          <span style={{fontSize:11,fontWeight:400,color:'var(--text2)',marginLeft:4}}>
            {connected ? '· Socket.IO ulangan' : '· Ulanmoqda...'}
          </span>
        </div>
        <div className="live-map-controls">
          <span style={{fontSize:11,color:'var(--text2)'}}>
            {locList.length} ta shafyor online
          </span>
          <a href={yandexUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            <MdMap size={13}/> Yandex Maps'da ochish
          </a>
        </div>
      </div>

      {/* Map — OpenStreetMap (iframe works without CSP issues) */}
      <div className="live-map-frame">
        {locList.length === 0 ? (
          <div className="map-placeholder">
            <div className="map-placeholder-ico">🗺️</div>
            <div style={{fontWeight:600,fontSize:14}}>Shafyorlar xaritasi</div>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:6,textAlign:'center',maxWidth:300}}>
              Shafyor botda "🚖 Ishni boshlash" tugmasini bosib WebApp orqali joylashuvini yuborganda bu yerda ko'rinadi
            </div>
            <a href="https://yandex.com/maps/?" target="_blank" rel="noopener noreferrer"
              style={{marginTop:12,padding:'8px 16px',background:'var(--accent)',color:'#fff',borderRadius:'var(--r)',textDecoration:'none',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
              🗺️ Yandex Maps'ni ochish
            </a>
          </div>
        ) : (
          <>
            {/* OpenStreetMap iframe — works without CSP issues */}
            <iframe
              src={osmUrl}
              title="Live Drivers Map"
              allowFullScreen
              loading="lazy"
              style={{width:'100%',height:'100%',border:'none',display:'block'}}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
            {/* Fallback link if iframe blocked */}
            <div style={{
              position:'absolute',bottom:8,right:8,
              background:'rgba(0,0,0,.7)',borderRadius:'var(--r)',
              padding:'4px 10px',fontSize:11,
            }}>
              <a href={yandexUrl} target="_blank" rel="noopener noreferrer"
                style={{color:'#fff',textDecoration:'none',fontWeight:600}}>
                🗺️ Yandex'da ochish
              </a>
            </div>
          </>
        )}
      </div>

      {/* Driver chips */}
      <div className="map-pins-bar">
        <span style={{fontSize:11,color:'var(--text2)',marginRight:4}}>Online shafyorlar:</span>

        {locList.length === 0 ? (
          <span style={{fontSize:11,color:'var(--text3)'}}>
            Hech kim tracking'ni boshlamagan
          </span>
        ) : (
          locList.map((loc, i) => {
            const color  = DRIVER_COLORS[i % DRIVER_COLORS.length]
            const driver = drivers.find(d => d.tgChatId === String(loc.telegramId))
            const name   = driver?.name || `Shafyor ${loc.telegramId}`
            const age    = Math.round((Date.now() - new Date(loc.updatedAt).getTime()) / 1000)
            return (
              <div key={loc.telegramId}
                className="map-pin-chip live"
                style={{borderColor:focused===loc.telegramId?color:undefined,color:focused===loc.telegramId?color:undefined}}
                onClick={() => setFocused(prev => prev===loc.telegramId?null:loc.telegramId)}
                title={`${name}: ${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`}
              >
                <div className="pin-dot" style={{background:color}}/>
                {name.split(' ')[0]}
                {loc.speed ? ` · ${Math.round(loc.speed*3.6)}km/h` : ''}
                <span style={{fontSize:9,color:'var(--text3)',marginLeft:2}}>{age}s</span>
              </div>
            )
          })
        )}

        <span style={{marginLeft:'auto',fontSize:10,color:connected?'var(--green)':'var(--yellow)'}}>
          {connected ? '🟢 Live' : '🟡 Polling'}
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN TRANSPORT PAGE
══════════════════════════════════════════ */
export default function Transport() {
  const [drivers,         setDrivers]         = useState([])
  const [driverLocations, setDriverLocations] = useState({})  // { telegramId: locationData }
  const [mobileTab,       setMobileTab]       = useState('delivery')

  useEffect(() => {
    loadDrivers()
  }, [])

  async function loadDrivers() {
    try {
      const res = await api.getDrivers()
      setDrivers(norm(res))
    } catch { setDrivers([]) }
  }

  /* Update driver status in local state */
  function onDriverChange(driverName, newStatus) {
    setDrivers(prev => prev.map(d =>
      d.name === driverName ? { ...d, status: newStatus } : d
    ))
  }


  return (
    <ErrorBoundary>
      <div className="transport-wrap">
        <div className="ph">
          <div>
            <div className="ph-title">🚛 Transport — Olib Kelish & Olib Ketish</div>
            <div className="ph-sub">Shafyorlar, topshiriqlar va live xarita</div>
          </div>
          <div className="ph-actions">
            <button className="btn btn-ghost btn-sm" onClick={loadDrivers}><MdRefresh size={15}/> Yangilash</button>
          </div>
        </div>

        {/* Mobile tab */}
        <div className="tp-tabs">
          <button className={`tp-tab ${mobileTab==='delivery'?'active':''}`} onClick={()=>setMobileTab('delivery')}>🚚 Olib Ketish</button>
          <button className={`tp-tab ${mobileTab==='pickup'?'active':''}`} onClick={()=>setMobileTab('pickup')}>📮 Olib Kelish</button>
          <button className={`tp-tab ${mobileTab==='map'?'active':''}`} onClick={()=>setMobileTab('map')}>🗺️ Xarita</button>
        </div>

        {/* Dual panels */}
        <div className="tp-grid">
          <div className={mobileTab!=='delivery' ? 'tp-panel' : 'tp-panel active'}>
            <TransportPanel
              title="Olib Ketish"
              icon="🚚"
              color="#3fb950"
              type="delivery"
              drivers={drivers}
              onDriverChange={onDriverChange}
              apiFns={{
                getAll:  api.getDelivery,
                create:  api.createDelivery,
                update:  api.updateDelivery,
                remove:  api.deleteDelivery,
              }}
            />
          </div>
          <div className={mobileTab!=='pickup' ? 'tp-panel' : 'tp-panel active'}>
            <TransportPanel
              title="Olib Kelish"
              icon="📮"
              color="#f0883e"
              type="pickup"
              drivers={drivers}
              onDriverChange={onDriverChange}
              apiFns={{
                getAll:  api.getPickup,
                create:  api.createPickup,
                update:  api.updatePickup,
                remove:  api.deletePickup,
              }}
            />
          </div>
        </div>

        {/* Live Map */}
        <div className={mobileTab !== 'map' && mobileTab !== 'delivery' && mobileTab !== 'pickup' ? '' : ''}>
          {/* On desktop always show map; on mobile only when map tab active */}
          <div style={mobileTab !== 'map' ? { display: 'block' } : {}}>
            <LiveMapSection
              drivers={drivers}
              driverLocations={driverLocations}
              setDriverLocations={setDriverLocations}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
