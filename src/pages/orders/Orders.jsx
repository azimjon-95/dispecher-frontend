import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdViewKanban, MdTableRows,
  MdPhone, MdLocationOn, MdDirectionsCar, MdArrowForward,
  MdShoppingBag, MdRefresh, MdPersonAdd
} from 'react-icons/md'
import { api, fmt, norm } from '../../services/api.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import OrderDetail from '../orderdetail/OrderDetail.jsx'
import { SmsPopover } from '../../components/ui/SmsPopover.jsx'
import './Orders.css'
import { useLang } from '../../i18n/index.jsx'
import { useRealtime } from '../../services/realtime.js'
import { store, bootstrap } from '../../store/appStore.js'

const isMob = () => window.innerWidth <= 768

/* ── Constants ── */
const COLUMNS = (t={}) => [
  { key:'yangi',         label:t.yangi||'Yangi',        icon:'📞', color:'var(--accent)',  desc:"Qo'ng'iroq qildi, navbat kutmoqda" },
  { key:'qabul_qilindi', label:t.qabul||'Qabul qilindi',icon:'📦', color:'var(--yellow)', desc:'Shafyor olib keldi, qabul qilindi' },
  { key:'yuvishda',      label:t.yuvishda||'Yuvishda',  icon:'🫧', color:'#58a6ff',       desc:'Yuvish jarayonida' },
  { key:'qurishda',      label:t.qurishda||'Quritishda',icon:'💨', color:'var(--orange)', desc:'Quritish jarayonida' },
  { key:'bezakda',       label:t.bezakda||'Bezakda',    icon:'✨', color:'var(--purple)', desc:'Bezak jarayonida' },
  { key:'yetkazishda',   label:t.yetkazishda||'Yetkazishda',icon:'🚚',color:'#f0883e',   desc:'Shafyor yetkazmoqda' },
]
const ALL_STATUSES = (t={}) => [
  ...COLUMNS(t).map(c=>({key:c.key,label:c.label})),
  { key:'tugallandi', label:t.tugallandi||'Tugallandi' },
  { key:'bekor',      label:t.bekor||'Bekor' },
]
const NEXT_STATUS = {
  yangi:'qabul_qilindi', qabul_qilindi:'yuvishda',
  yuvishda:'qurishda',   qurishda:'bezakda',
  bezakda:'yetkazishda', yetkazishda:'tugallandi', tugallandi:null,
}
const NEXT_LABEL = (t={}) => ({
  yangi:       '→ '+(t.qabul||'Qabul'),
  qabul_qilindi:'→ '+(t.yuvishda||'Yuvish')+'ga',
  yuvishda:    '→ '+(t.qurishda||'Quritish')+'ga',
  qurishda:    '→ '+(t.bezakda||'Bezak')+'ka',
  bezakda:     '→ '+(t.yetkazishda||'Yetkazish')+'ga',
  yetkazishda: '✅ '+(t.tugallandi||'Tugallandi'),
  tugallandi:  null,
})

/* Helpers */
const BOT_USERNAME      = import.meta.env.VITE_BOT_USERNAME          || 'tartibcrmbot'
const CUSTOMER_BOT_NAME = import.meta.env.VITE_CUSTOMER_BOT_USERNAME  || 'tartibcrm_customer_bot'

// Xarita tugmasi logikasi:
// lat/lon BOR  → Yandex Maps (aniq manzil)
// lat/lon YO'Q → Mijoz boti deep link (joylashuv so'rash)
function getMapAction(order) {
  if (order.lat && order.lon) {
    return {
      type: 'map',
      url: `https://yandex.com/maps/?ll=${order.lon},${order.lat}&z=16&pt=${order.lon},${order.lat},pm2rdm`
    }
  }
  const custId   = order.customerId || order.customer_id || ''
  const deepLink = `https://t.me/${CUSTOMER_BOT_NAME}?start=cust_loc_${order._id}_${custId}`
  return { type: 'bot', url: deepLink }
}
function TgIcon(){
  return <svg style={{width:11,height:11,flexShrink:0}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/></svg>
}

/* ── Persistent form state (survives refresh) ── */
const FORM_KEY = 'orders_form_draft'
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(FORM_KEY)) || {} } catch { return {} }
}
function saveDraft(data) {
  try { localStorage.setItem(FORM_KEY, JSON.stringify(data)) } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(FORM_KEY) } catch {}
}

const EMPTY = { customer:'', phone:'', address:'', description:'', status:'yangi', driver:'' }

/* ══════════════════════════════════════════
   KANBAN CARD
══════════════════════════════════════════ */
function KanbanCard({ order, col, drivers, employees, onDetail, onAdvance, onAssign, onAssignWorker, onEdit, onDelete }) {
  const { t } = useLang()
  const colCfg  = COLUMNS(t).find(c=>c.key===col)
  const accent  = colCfg?.color || 'var(--accent)'
  const canAdv  = !!NEXT_STATUS[order.status]
  const needWorker = ['qabul_qilindi','yuvishda','qurishda','bezakda'].includes(order.status)

  return (
    <div className="kb-card" style={{'--kb-accent':accent}} onClick={() => onDetail(order)}>
      <div className="kb-card-num">{order.number}</div>
      <div className="kb-card-customer">{order.customer}</div>
      {order.phone && (
        <div className="kb-card-phone" style={{display:'flex',alignItems:'center',gap:3,flexWrap:'wrap',position:'relative',zIndex:10}}>
          <MdPhone size={10}/>
          {order.phone}
          {(order.status==='yangi'||order.status==='yetkazishda') && (
            <SmsPopover phone={order.phone} customerName={order.customer}
              orderNum={order.number} messageType={order.status==='yangi'?'pickup':'delivery'}/>
          )}
        </div>
      )}
      {/* Item summary: "2 ta Gilam, 1 ta Ko'rpa" */}
      {order.itemSummary ? (
        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
          <span>📋</span>
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{order.itemSummary}</span>
        </div>
      ) : order.description ? (
        <div className="kb-card-desc">{order.description}</div>
      ) : null}
      <div className="kb-card-footer">
        <span className="kb-card-price">{fmt.currency(order.total)}</span>
        {order.itemCount>0 && <span className="kb-card-items">{order.itemCount} ta</span>}
      </div>

      {/* Actions */}
      <div className="kb-card-actions" onClick={e=>e.stopPropagation()}>
        <button className="kb-action-btn kba-detail" onClick={e=>{e.stopPropagation();onDetail(order)}}>
          <MdShoppingBag size={10}/> Ichiga
        </button>

        {/* Shafyor — yangi va yetkazishda */}
        {(order.status==='yangi'||order.status==='yetkazishda') && (
          <button className="kb-action-btn kba-assign" onClick={e=>{e.stopPropagation();onAssign(order)}}>
            <MdDirectionsCar size={10}/> {order.driver?'Shafyor ✓':'Shafyor'}
          </button>
        )}

        {/* Ishchi biriktirish — qabul_qilindi va yuvish bosqichlari */}
        {needWorker && (
          <button className="kb-action-btn kba-assign"
            style={{background:'var(--purplebg)',color:'var(--purple)',borderColor:'rgba(163,113,247,.2)'}}
            onClick={e=>{e.stopPropagation();onAssignWorker(order)}}>
            <MdPersonAdd size={10}/> Ishchi
          </button>
        )}

        {/* Keyingi bosqich */}
        {canAdv && (
          <button className="kb-action-btn kba-advance" onClick={e=>{e.stopPropagation();onAdvance(order)}}>
            <MdArrowForward size={10}/> {NEXT_LABEL(t)[order.status]}
          </button>
        )}

        {/* Xarita — lat/lon bor → Yandex Maps, yo'q → bot orqali manzil so'rash */}
        {(() => {
          const action    = getMapAction(order)
          const hasCoords = order.lat && order.lon
          return (
            <a href={action.url} target="_blank" rel="noopener noreferrer"
              className={`kb-action-btn ${hasCoords ? 'kba-map' : 'kba-bot'}`}
              onClick={e => e.stopPropagation()}
              title={hasCoords
                ? `Yandex Maps: ${order.lat?.toFixed(4)}, ${order.lon?.toFixed(4)}`
                : 'Botga o\'tib manzilini yuboring'}
            >
              {hasCoords
                ? <><MdLocationOn size={10}/> Xarita</>
                : <><MdLocationOn size={10}/> 📍 Manzil so'rash</>
              }
            </a>
          )
        })()}
      </div>

      {order.driver && (
        <div style={{marginTop:4,fontSize:10,color:'var(--text2)',display:'flex',alignItems:'center',gap:3}}>
          <MdDirectionsCar size={10}/> {order.driver}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   KANBAN COLUMN
══════════════════════════════════════════ */
function KanbanColumn({ col, orders, drivers, employees, onColClick, onDetail, onAdvance, onAssign, onAssignWorker, onEdit, onDelete }) {
  const { t } = useLang()
  const total = orders.reduce((s,o)=>s+(o.total||0),0)
  return (
    <div className="kb-col" data-status={col.key}>
      <div className="kb-col-hd" onClick={()=>onColClick(col)} style={{cursor:'pointer'}}>
        <span className="kb-col-ico">{col.icon}</span>
        <span className="kb-col-name" style={{color:col.color}}>{col.label}</span>
        <span className="kb-col-count" style={{background:orders.length?col.color+'22':undefined,color:orders.length?col.color:undefined}}>
          {orders.length}
        </span>
      </div>
      <div className="kb-summary">
        <span>{col.desc}</span>
        {orders.length>0 && <span className="kb-summary-val">{fmt.currency(total)}</span>}
      </div>
      <div className="kb-cards">
        {orders.length===0
          ? <div className="kb-empty"><div className="kb-empty-ico">📭</div>Bo'sh</div>
          : orders.map(o=>(
              <KanbanCard key={o._id} order={o} col={col.key}
                drivers={drivers} employees={employees}
                onDetail={onDetail} onAdvance={onAdvance}
                onAssign={onAssign} onAssignWorker={onAssignWorker}
                onEdit={onEdit} onDelete={onDelete}/>
            ))
        }
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════
   MOBILE ORDERS — Tab filter + vertical list
══════════════════════════════════════════ */
function MobileCard({ order, onDetail, onAdvance, onAssign }) {
  const { t } = useLang()
  const col   = COLUMNS(t).find(x=>x.key===order.status)
  const color = col?.color || 'var(--accent)'
  const canAdv = !!NEXT_STATUS[order.status]

  return (
    <div onClick={()=>onDetail(order)} style={{
      background:'var(--bg2)',
      border:'1px solid var(--border)',
      borderRadius:14,
      padding:'12px 14px',
      display:'flex', gap:12,
      alignItems:'flex-start',
      position:'relative',
      overflow:'hidden',
      WebkitTapHighlightColor:'transparent',
      cursor:'pointer',
    }}
      onTouchStart={e=>e.currentTarget.style.opacity='.7'}
      onTouchEnd={e=>e.currentTarget.style.opacity='1'}
    >
      {/* Left accent */}
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:color,borderRadius:'14px 0 0 14px'}}/>

      {/* Content */}
      <div style={{flex:1,paddingLeft:4}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
          <span style={{fontFamily:'monospace',fontWeight:800,fontSize:13,color}}>{order.number}</span>
          <span style={{fontSize:11,fontWeight:700,color:'var(--green)',fontFamily:'monospace'}}>
            {fmt.currency(order.total)}
          </span>
        </div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{order.customer}</div>
        {order.phone && (
          <div style={{fontSize:12,color:'var(--text2)',display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
            <MdPhone size={11}/>{order.phone}
          </div>
        )}
        {order.itemSummary && (
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
            📋 {order.itemSummary}
          </div>
        )}

        {/* Action buttons */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
          {/* Shafyor */}
          {(order.status==='yangi'||order.status==='yetkazishda') && (
            <button onClick={()=>onAssign(order)} style={{
              padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
              background:'rgba(210,153,34,.12)',color:'var(--yellow)',
              border:'1px solid rgba(210,153,34,.2)',cursor:'pointer',
              display:'flex',alignItems:'center',gap:4,
            }}>
              <MdDirectionsCar size={12}/>{order.driver||'Shafyor'}
            </button>
          )}
          {/* Keyingi bosqich */}
          {canAdv && (
            <button onClick={()=>onAdvance(order)} style={{
              padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
              background:`${color}18`,color,
              border:`1px solid ${color}40`,cursor:'pointer',
              display:'flex',alignItems:'center',gap:4,
            }}>
              <MdArrowForward size={12}/>{NEXT_LABEL(t)[order.status]}
            </button>
          )}
          {/* Batafsil */}
          <button onClick={()=>onDetail(order)} style={{
            padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
            background:'rgba(59,130,246,.12)',color:'#3B82F6',
            border:'1px solid rgba(59,130,246,.2)',cursor:'pointer',
          }}>
            📦 Ichiga
          </button>
        </div>
      </div>
    </div>
  )
}

function MobileOrders({ orders, loading, onDetail, onAdvance, onAssign, onAssignWorker, openCreate }) {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState('yangi')
  const [search,    setSearch]    = useState('')

  const filtered = useMemo(() => {
    const list = orders.filter(o => o.status === activeTab)
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(o =>
      o.customer?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.number?.toLowerCase().includes(q)
    )
  }, [orders, activeTab, search])

  const grouped = useMemo(() => {
    const m = {}
    COLUMNS(t).forEach(c => { m[c.key] = 0 })
    orders.forEach(o => { if (m[o.status] !== undefined) m[o.status]++ })
    return m
  }, [orders])

  return (
    <div style={{paddingBottom:90}}>

      {/* ── Tab bar (horizontal scroll) ── */}
      <div style={{
        display:'flex', gap:6, overflowX:'auto',
        padding:'10px 16px 6px',
        scrollbarWidth:'none', msOverflowStyle:'none',
        position:'sticky', top:52, zIndex:50,
        background:'var(--bg)',
        borderBottom:'1px solid var(--border)',
      }}>
        {COLUMNS(t).map(col => {
          const cnt    = grouped[col.key] || 0
          const isAct  = activeTab === col.key
          return (
            <button key={col.key} onClick={()=>setActiveTab(col.key)} style={{
              flexShrink:0,
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:99,
              background: isAct ? col.color+'20' : 'var(--bg2)',
              border:`1px solid ${isAct ? col.color+'60' : 'var(--border)'}`,
              color: isAct ? col.color : 'var(--text3)',
              fontSize:12, fontWeight:700,
              cursor:'pointer',
              WebkitTapHighlightColor:'transparent',
              transition:'all .15s',
            }}>
              <span>{col.icon}</span>
              <span>{col.label}</span>
              {cnt > 0 && (
                <span style={{
                  background: isAct ? col.color : 'var(--bg3)',
                  color: isAct ? 'white' : 'var(--text3)',
                  borderRadius:99, fontSize:10, fontWeight:800,
                  padding:'1px 5px', minWidth:18, textAlign:'center',
                }}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search ── */}
      <div style={{padding:'10px 16px 6px'}}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:12, padding:'8px 12px',
        }}>
          <span style={{fontSize:15, flexShrink:0}}>🔍</span>
          <input placeholder="Mijoz, telefon, raqam..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{flex:1,background:'none',border:'none',outline:'none',
              color:'var(--text)',fontSize:14,fontFamily:'inherit'}}/>
          {search && (
            <button onClick={()=>setSearch('')} style={{background:'none',border:'none',
              color:'var(--text3)',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
          )}
        </div>
      </div>

      {/* ── Stage header ── */}
      {(() => {
        const col = COLUMNS(t).find(c=>c.key===activeTab)
        return (
          <div style={{padding:'4px 16px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:16}}>{col?.icon}</span>
              <span style={{fontSize:14,fontWeight:700,color:col?.color}}>{col?.label}</span>
            </div>
            <span style={{fontSize:12,color:'var(--text3)'}}>{filtered.length} ta</span>
          </div>
        )
      })()}

      {/* ── Cards list ── */}
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        {loading ? (
          [...Array(3)].map((_,i)=>(
            <div key={i} style={{height:100,borderRadius:14,background:'var(--bg2)',
              animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*100+'ms'}}/>
          ))
        ) : filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>{search ? 'Topilmadi' : "Bu bosqichda buyurtma yo'q"}</div>
          </div>
        ) : (
          filtered.map(o => (
            <MobileCard key={o._id} order={o}
              onDetail={onDetail}
              onAdvance={onAdvance}
              onAssign={o=>onAssign(o)}
            />
          ))
        )}
      </div>

      {/* ── FAB: Yangi buyurtma ── */}
      <button onClick={openCreate} style={{
        position:'fixed', bottom:74, right:20,
        width:54, height:54, borderRadius:'50%',
        background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',
        color:'white', border:'none', cursor:'pointer',
        fontSize:26, fontWeight:700,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 20px rgba(59,130,246,.5)',
        zIndex:200,
        transition:'transform .15s',
      }}
        onTouchStart={e=>e.currentTarget.style.transform='scale(.9)'}
        onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
      >
        <MdAdd size={28}/>
      </button>

      <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN ORDERS PAGE
══════════════════════════════════════════ */
export default function Orders() {
  const { t } = useLang()
  const [orders,      setOrders]      = useState([])
  const [drivers,     setDrivers]     = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('kanban')
  const [colView,     setColView]     = useState(null)
  const [detail,      setDetail]      = useState(null)
  const [mobile,      setMobile]      = useState(isMob())

  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  /* Modals */
  const [formModal,       setFormModal]       = useState(null)
  const [form,            setForm]            = useState(() => ({ ...EMPTY, ...loadDraft() }))
  const [assignModal,     setAssignModal]     = useState(null)
  const [assignWorkerMod, setAssignWorkerMod] = useState(null)
  const [selDriver,       setSelDriver]       = useState(null)
  const [selWorker,       setSelWorker]       = useState(null)
  const [delId,           setDelId]           = useState(null)
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [custFound,       setCustFound]       = useState(null)   // topilgan mijoz
  const [geoLoading,      setGeoLoading]      = useState(false)

  /* Table filter */
  const [search,  setSearch]  = useState('')
  const [statusF, setStatusF] = useState('')
  const [page,    setPage]    = useState(1)
  const PAGE_SIZE = 15

  useEffect(() => { loadAll() }, [])

  useRealtime(['refresh:orders', 'refresh:all', 'data:updated:orders'], () => {
    const s = store.getState()
    if (s.orders?.length) { setOrders(s.orders); setLoading(false) }
    else loadAll()
  })

  /* Save form draft on change */
  useEffect(() => {
    if (formModal) saveDraft(form)
  }, [form, formModal])

  async function loadAll() {
    // 1. Store dan darhol
    const s = store.getState()
    if (s.orders?.length) {
      setOrders(s.orders)
      setDrivers(s.drivers || [])
      setEmployees((s.employees || []).filter(e=>e.role==='Ishchi'&&e.status==='active'))
      setLoading(false)
      return
    }
    // 2. Bootstrap (bitta so'rov)
    setLoading(true)
    try {
      await bootstrap()
      const fresh = store.getState()
      setOrders(fresh.orders || [])
      setDrivers(fresh.drivers || [])
      setEmployees((fresh.employees || []).filter(e=>e.role==='Ishchi'&&e.status==='active'))
    } catch(e) { toast(e.message,'err') }
    setLoading(false)
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Telefon kiritilganda mijozni DB dan topish
  async function onPhoneChange(e) {
    const phone = e.target.value
    setForm(p => ({ ...p, phone }))
    setCustFound(null)
    const digits = phone.replace(/\D/g,'')
    if (digits.length < 9) return
    try {
      const cust = await api.getCustomerByPhone(digits)
      if (cust) {
        setCustFound(cust)
        setForm(p => ({
          ...p,
          customer: p.customer || cust.name,
          address:  p.address  || cust.address || '',
          // Geo ham bor bo'lsa saqlaylik
          lat: cust.lat || null,
          lon: cust.lon || null,
        }))
        toast('Mijoz topildi: ' + cust.name + (cust.orders ? ' (' + cust.orders + ' ta buyurtma)' : ''), 'ok')
      }
    } catch {}
  }

  // Geo location olish (agar oldindan saqlanmagan bo'lsa)
  async function getGeoLocation() {
    if (!navigator.geolocation) { toast('GPS qo\'llab-quvvatlanmaydi','err'); return }
    // Agar mijoz topilgan va location saqlangan bo'lsa
    if (custFound?.locationSaved && custFound?.lat) {
      setForm(p=>({...p, lat:custFound.lat, lon:custFound.lon, address:custFound.address||p.address}))
      toast('Oldingi manzil yuklandi ✅','ok'); return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p=>({...p, lat:pos.coords.latitude, lon:pos.coords.longitude}))
        toast('GPS olindi ✅','ok')
        setGeoLoading(false)
      },
      err => { toast('GPS xato: '+err.message,'err'); setGeoLoading(false) },
      { timeout:10000, enableHighAccuracy:true }
    )
  }

  const grouped = useMemo(()=>{
    const g={}; COLUMNS(t).forEach(c=>{g[c.key]=[]})
    orders.forEach(o=>{if(g[o.status])g[o.status].push(o)})
    return g
  },[orders])

  /* Create/Edit */
  async function saveForm() {
    if (isSubmitting) return  // prevent double submit
    if (!form.customer||!form.phone){toast('Ism va telefon majburiy!','err');return}
    setIsSubmitting(true)
    try {
      if (formModal==='create') {
        const rec = await api.createOrder(form)
        const saved = rec?.data||rec
        if (saved) {
          setOrders(p => {
            const exists = p.some(o => o._id === saved._id)
            return exists ? p : [saved,...p]
          })
        }
        toast('Yangi buyurtma yaratildi ✅','ok')
        clearDraft()
        setFormModal(null)
      } else {
        await api.updateOrder(form._id, form)
        setOrders(p=>p.map(r=>r._id===form._id?{...r,...form}:r))
        toast('Yangilandi ✅','ok')
        setFormModal(null)
      }
    } catch(e){toast(e.message,'err')} finally { setIsSubmitting(false) }
  }

  function openCreate() {
    const draft = loadDraft()
    // Restore draft if exists (non-empty)
    setForm(Object.keys(draft).length > 0 ? {...EMPTY,...draft} : {...EMPTY})
    setFormModal('create')
  }

  function clearForm() {
    setForm({...EMPTY})
    clearDraft()
  }

  /* Advance status */
  async function advanceOrder(order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    try {
      await api.updateOrder(order._id,{status:next})
      setOrders(p=>p.map(r=>r._id===order._id?{...r,status:next}:r))
      toast(`${order.number} → ${COLUMNS(t).find(c=>c.key===next)?.label} ✅`,'ok')
    } catch(e){toast(e.message,'err')}
  }

  /* Assign driver — Order GA ham, Pickup TASK GA ham biriktiradi
     Telegram xabari backend pickup PUT da avtomatik ketadi */
  async function confirmAssignDriver() {
    if (!selDriver){toast('Shafyorni tanlang','err');return}
    const dr = drivers.find(d=>d._id===selDriver)
    if (!dr) return
    try {
      // 1. Order yangilanadi
      await api.updateOrder(assignModal._id, { driver: dr.name, driverId: dr._id })
      setOrders(p=>p.map(r=>r._id===assignModal._id ? {...r, driver:dr.name, driverId:dr._id} : r))

      // 2. Pickup task topiladi va yangilanadi (Telegram xabari shu yerda avtomatik ketadi)
      try {
        const res = await api.getPickup()
        const allPickup = Array.isArray(res) ? res : (res?.data || [])
        const ordTasks = allPickup.filter(t =>
          String(t.orderId) === String(assignModal._id) ||
          t.order === assignModal.number
        )
        for (const task of ordTasks) {
          await api.updatePickup(task._id, { driver: dr.name, driverId: dr._id })
        }
      } catch {}

      toast(`✅ ${dr.name} biriktirildi — bot xabari yuborildi`, 'ok')
      setAssignModal(null); setSelDriver(null)
    } catch(e){toast(e.message,'err')}
  }

  /* Assign worker to order */
  async function confirmAssignWorker() {
    if (!selWorker){toast('Ishchini tanlang','err');return}
    const emp = employees.find(e=>e._id===selWorker)
    try {
      await api.updateOrder(assignWorkerMod._id,{assignedWorker:emp.name})
      setOrders(p=>p.map(r=>r._id===assignWorkerMod._id?{...r,assignedWorker:emp.name}:r))
      toast(`${emp.name} ga biriktirildi ✅`,'ok')
      setAssignWorkerMod(null); setSelWorker(null)
    } catch(e){toast(e.message,'err')}
  }

  /* Delete */
  async function doDelete() {
    try {
      await api.deleteOrder(delId)
      setOrders(p=>p.filter(r=>r._id!==delId))
      setDelId(null); toast("O'chirildi",'inf')
    } catch(e){toast(e.message,'err')}
  }

  /* Table data */
  const tableOrders = useMemo(()=>{
    const src = colView ? (grouped[colView]||[]) : orders
    const q = search.toLowerCase()
    return src.filter(o=>
      (!statusF || o.status===statusF) &&
      (!q || o.customer?.toLowerCase().includes(q) || o.number?.includes(q) || o.phone?.includes(q))
    )
  },[grouped,colView,orders,search,statusF])

  const paginated = useMemo(
    ()=>tableOrders.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE),
    [tableOrders,page]
  )

  /* Table columns — same actions as kanban */
  const TABLE_COLS = [
    { k:'number', l:'Raqam', r:v=><span className="mono" style={{color:'var(--accent)',fontWeight:700}}>{v}</span> },
    { k:'customer', l:'Mijoz', r:(v,r)=>(
      <div>
        <div style={{fontWeight:600}}>{v}</div>
        <div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:3}}>
          {r.phone}
          {(r.status==='yangi'||r.status==='yetkazishda') && (
            <SmsPopover phone={r.phone} customerName={v} orderNum={r.number}
              messageType={r.status==='yangi'?'pickup':'delivery'}/>
          )}
        </div>
      </div>
    )},
    { k:'description', l:'Tavsif', r:v=><span style={{fontSize:11,color:'var(--text2)',maxWidth:160,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v||'—'}</span> },
    { k:'itemCount',   l:'Mahsulot', r:v=><span className="mono" style={{color:'var(--accent)'}}>{v||0} ta</span> },
    { k:'total',       l:'Jami',     r:v=><span className="mono" style={{fontWeight:700,color:'var(--green)'}}>{fmt.currency(v)}</span> },
    { k:'status', l:'Holat', r:v=>{const c=COLUMNS(t).find(x=>x.key===v); return <span className="badge" style={{background:c?.color+'22',color:c?.color,border:`1px solid ${c?.color+'44'}`}}>{c?.label||v}</span>} },
    { k:'driver', l:'Shafyor', r:v=>v?<span style={{fontSize:11}}><MdDirectionsCar size={11}/> {v}</span>:<span style={{color:'var(--text3)',fontSize:11}}>—</span> },
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        {/* Shafyor biriktirish (yangi/yetkazishda) */}
        {(row.status==='yangi'||row.status==='yetkazishda') && (
          <button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'var(--yellow)'}}
            onClick={()=>{setAssignModal(row);setSelDriver(null)}}>
            <MdDirectionsCar size={12}/>
          </button>
        )}
        {/* Ishchi biriktirish */}
        {['qabul_qilindi','yuvishda','qurishda','bezakda'].includes(row.status) && (
          <button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'var(--purple)'}}
            onClick={()=>{setAssignWorkerMod(row);setSelWorker(null)}}>
            <MdPersonAdd size={12}/>
          </button>
        )}
        {/* Keyingi bosqich */}
        {NEXT_STATUS[row.status] && (
          <button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'var(--green)'}}
            onClick={()=>advanceOrder(row)} title={NEXT_LABEL(t)[row.status]}>
            <MdArrowForward size={12}/>
          </button>
        )}
        <button className="btn btn-primary btn-sm" style={{fontSize:10}} onClick={()=>setDetail(row)}>📦</button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setFormModal('edit')}}><MdEdit size={13}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={13}/></button>
      </div>
    )},
  ]

  if (detail) return <ErrorBoundary><OrderDetail order={detail} onBack={()=>setDetail(null)}/></ErrorBoundary>

  // Mobile layout
  if (mobile) return (
    <ErrorBoundary>
      <MobileOrders
        orders={orders} loading={loading}
        onDetail={setDetail}
        onAdvance={advanceOrder}
        onAssign={o=>{setAssignModal(o);setSelDriver(null)}}
        onAssignWorker={o=>{setAssignWorkerMod(o);setSelWorker(null)}}
        openCreate={openCreate}
      />
      {/* Shared modals — same as desktop */}
      {/* Assign driver modal */}
      <Modal open={!!assignModal} onClose={()=>{setAssignModal(null);setSelDriver(null)}}
        title="🚗 Shafyor biriktirish" size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>{setAssignModal(null);setSelDriver(null)}}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={confirmAssignDriver} disabled={!selDriver}>✅ Biriktirish</button></>}>
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto'}}>
          {drivers.map(d=>(
            <div key={d._id} className={`assign-driver-item ${selDriver===d._id?'sel':''}`} onClick={()=>setSelDriver(d._id)}>
              <div className="assign-driver-avatar">{d.name?.[0]}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>{d.car} · {d.plate}</div></div>
              <Sbadge s={d.status}/>
            </div>
          ))}
        </div>
      </Modal>
      {/* Confirm delete */}
      <Confirm open={!!delId} onClose={()=>setDelId(null)} onOk={doDelete}
        title="Buyurtmani o'chirish" msg="O'chirishni xohlaysizmi?" danger/>
    </ErrorBoundary>
  )

  return (
    <ErrorBoundary>
      <div className="orders-wrap">
        <PH title="📦 Buyurtmalar" sub={`${orders.length} ta buyurtma`}
          actions={
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <div className="orders-view-toggle">
                <button className={`ovt-btn ${view==='kanban'?'active':''}`} onClick={()=>{setView('kanban');setColView(null)}}>
                  <MdViewKanban size={14}/> Kanban
                </button>
                <button className={`ovt-btn ${view==='table'?'active':''}`} onClick={()=>{setView('table');setColView(null)}}>
                  <MdTableRows size={14}/> Jadval
                </button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={loadAll}><MdRefresh size={15}/></button>
              <ExportBtn data={orders} name="buyurtmalar"/>
              <button className="btn btn-primary" onClick={openCreate}>
                <MdAdd size={16}/> Yangi buyurtma
              </button>
            </div>
          }
        />

        {/* KANBAN */}
        {view==='kanban' && (
          loading
            ? <Loader size="md" text="Yuklanmoqda..."/>
            : <div className="kanban-board">
                {COLUMNS(t).map(col=>(
                  <KanbanColumn key={col.key} col={col} orders={grouped[col.key]||[]}
                    drivers={drivers} employees={employees}
                    onColClick={c=>{setColView(c.key);setView('col');setSearch('');setPage(1)}}
                    onDetail={setDetail} onAdvance={advanceOrder}
                    onAssign={o=>{setAssignModal(o);setSelDriver(null)}}
                    onAssignWorker={o=>{setAssignWorkerMod(o);setSelWorker(null)}}
                    onEdit={o=>{setForm({...o});setFormModal('edit')}}
                    onDelete={id=>setDelId(id)}
                  />
                ))}
              </div>
        )}

        {/* TABLE — all */}
        {view==='table' && (
          <div>
            <div className="fbar">
              <input className="finput fsearch" placeholder="🔍 Mijoz, telefon, raqam..."
                value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
              <select className="fselect" value={statusF} onChange={e=>{setStatusF(e.target.value);setPage(1)}}>
                <option value="">{t.all||"Barcha"} holat</option>
                {ALL_STATUSES(t).map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="card" style={{padding:0}}>
              <Table cols={TABLE_COLS} rows={paginated} loading={loading} onRow={setDetail}/>
              <Paging page={page} total={tableOrders.length} size={PAGE_SIZE} onChange={setPage}/>
            </div>
          </div>
        )}

        {/* TABLE — column drill-down */}
        {view==='col' && colView && (()=>{
          const c = COLUMNS(t).find(x=>x.key===colView)
          return (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setView('kanban')}>← Kanban</button>
                <span style={{fontSize:20}}>{c?.icon}</span>
                <span style={{fontWeight:700,fontSize:16,color:c?.color}}>{c?.label}</span>
                <span className="badge" style={{background:c?.color+'22',color:c?.color}}>{(grouped[colView]||[]).length} ta</span>
              </div>
              <div className="fbar">
                <input className="finput fsearch" placeholder="🔍 Qidirish..."
                  value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
              </div>
              <div className="card" style={{padding:0}}>
                <Table cols={TABLE_COLS} rows={paginated} loading={loading} onRow={setDetail}/>
                <Paging page={page} total={tableOrders.length} size={PAGE_SIZE} onChange={setPage}/>
              </div>
            </div>
          )
        })()}

        {/* CREATE/EDIT MODAL */}
        <Modal open={formModal==='create'||formModal==='edit'} onClose={()=>setFormModal(null)}
          title={formModal==='create'?'➕ Yangi buyurtma':'✏️ Buyurtma tahrirlash'} size="lg"
          footer={<>
            <button className="btn btn-ghost" onClick={clearForm} title="Formani tozalash">Tozalash</button>
            <button className="btn btn-ghost" onClick={()=>setFormModal(null)}>{t.close}</button>
            <button className="btn btn-primary" onClick={saveForm} disabled={isSubmitting}
              style={{opacity:isSubmitting?0.6:1,cursor:isSubmitting?'not-allowed':'pointer'}}>
              {isSubmitting ? '⏳ Saqlanmoqda...' : formModal==='create'?'Yaratish':t.save||'Saqlash'}
            </button>
          </>}
        >
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Mijoz ismi *</label>
              <input className="finput" value={form.customer} onChange={set('customer')} autoFocus/></div>
            <div className="fg"><label className="flabel">Telefon *</label>
              <div style={{position:'relative'}}>
                <input className="finput" placeholder="+998 90 000 00 00"
                  value={form.phone} onChange={onPhoneChange}
                  style={{paddingRight: custFound ? 80 : 12}}/>
                {custFound && (
                  <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                    fontSize:10,fontWeight:700,color:'var(--green)',
                    background:'var(--greenbg)',padding:'2px 6px',borderRadius:4}}>
                    ✅ {custFound.orders||0} ta buyurtma
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="fg">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <label className="flabel" style={{margin:0}}>Manzil</label>
              <button type="button" onClick={getGeoLocation} disabled={geoLoading} style={{
                fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:6,cursor:'pointer',
                background:form.lat?'var(--greenbg)':'var(--bg3)',
                color:form.lat?'var(--green)':'var(--text2)',
                border:'1px solid '+(form.lat?'var(--green)':'var(--border)'),
                display:'flex',alignItems:'center',gap:4,
              }}>
                {geoLoading?'⏳':(form.lat?'📍 GPS saqlangan':'📍 GPS olish')}
              </button>
            </div>
            <input className="finput" value={form.address} onChange={set('address')}
              placeholder={form.lat?'GPS koordinatalari saqlandi':'Manzilni kiriting...'}/>
          </div>
          <div className="fg"><label className="flabel">📋 Tavsif — nimalar bor</label>
            <textarea className="ftextarea" rows={3}
              placeholder="3 ta gilam, 2 ta ko'rpa, yostiqlar bor..."
              value={form.description} onChange={set('description')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                {ALL_STATUSES(t).map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select></div>
            <div className="fg"><label className="flabel">Shafyor</label>
              <select className="fselect" value={form.driver||''} onChange={set('driver')}>
                <option value="">— Tanlang —</option>
                {drivers.map(d=><option key={d._id} value={d.name}>{d.name} ({d.car||''})</option>)}
              </select></div>
          </div>
          {formModal==='create' && (
            <div style={{fontSize:11,color:'var(--text2)',padding:'6px 10px',background:'var(--bg3)',borderRadius:'var(--r)',marginTop:4}}>
              💡 Mijoz bot orqali lokatsiyasini yuborganda GPS koordinatalari avtomatik qo'shiladi
            </div>
          )}
        </Modal>

        {/* ASSIGN DRIVER MODAL */}
        <Modal open={!!assignModal} onClose={()=>{setAssignModal(null);setSelDriver(null)}}
          title={`🚗 Shafyor biriktirish — ${assignModal?.number||''}`} size="sm"
          footer={<>
            <button className="btn btn-ghost" onClick={()=>{setAssignModal(null);setSelDriver(null)}}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={confirmAssignDriver} disabled={!selDriver}>✅ Biriktirish</button>
          </>}
        >
          <div style={{marginBottom:10,padding:'8px 10px',background:'var(--bg3)',borderRadius:'var(--r)',fontSize:12}}>
            <div style={{fontWeight:700}}>{assignModal?.customer}</div>
            <div style={{color:'var(--text2)',marginTop:2}}>{assignModal?.address}</div>
          </div>
          <div className="assign-driver-list">
            {drivers.length===0
              ? <div style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Faol shafyor yo'q</div>
              : drivers.map(dr=>(
                  <div key={dr._id} className={`assign-driver-item ${selDriver===dr._id?'sel':''}`}
                    onClick={()=>setSelDriver(dr._id)}>
                    <div className="assign-driver-avatar">{dr.name?.[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{dr.name}</div>
                      <div style={{fontSize:11,color:'var(--text2)'}}>{dr.car} · {dr.plate}</div>
                    </div>
                    <Sbadge s={dr.status}/>
                  </div>
                ))
            }
          </div>
        </Modal>

        {/* ASSIGN WORKER MODAL */}
        <Modal open={!!assignWorkerMod} onClose={()=>{setAssignWorkerMod(null);setSelWorker(null)}}
          title={`👷 Ishchi biriktirish — ${assignWorkerMod?.number||''}`} size="sm"
          footer={<>
            <button className="btn btn-ghost" onClick={()=>{setAssignWorkerMod(null);setSelWorker(null)}}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={confirmAssignWorker} disabled={!selWorker}>✅ Biriktirish</button>
          </>}
        >
          <div style={{marginBottom:10,padding:'8px 10px',background:'var(--bg3)',borderRadius:'var(--r)',fontSize:12}}>
            <div style={{fontWeight:700}}>{assignWorkerMod?.customer}</div>
            <div style={{color:'var(--text2)',marginTop:2}}>
              Bosqich: <strong style={{color:'var(--yellow)'}}>
                {COLUMNS(t).find(c=>c.key===assignWorkerMod?.status)?.label || assignWorkerMod?.status}
              </strong>
            </div>
          </div>
          <div className="assign-driver-list">
            {employees.length===0
              ? <div style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Faol ishchi yo'q</div>
              : employees.map(emp=>(
                  <div key={emp._id} className={`assign-driver-item ${selWorker===emp._id?'sel':''}`}
                    onClick={()=>setSelWorker(emp._id)}>
                    <div className="assign-driver-avatar" style={{background:'var(--purplebg)',borderColor:'var(--purple)',color:'var(--purple)'}}>
                      {emp.name?.[0]}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{emp.name}</div>
                      <div style={{fontSize:11,color:'var(--text2)'}}>Bo'lim: {emp.section}</div>
                    </div>
                    <span style={{fontSize:11,color:'var(--green)',fontFamily:'monospace'}}>{fmt.currency(emp.balance)}</span>
                  </div>
                ))
            }
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)} onOk={doDelete}
          title="Buyurtmani o'chirish" msg="Bu buyurtmani o'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
