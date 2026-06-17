import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLang } from '../../i18n/index.jsx'
import {
  MdArrowBack, MdAdd, MdEdit, MdDelete, MdPersonAdd,
  MdDirectionsCar, MdCheck, MdPhone, MdLocationOn,
  MdRefresh, MdAttachMoney
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Confirm, Sbadge, toast, Loader } from '../../components/ui/UI.jsx'
import './OrderDetail.css'

/* ── Stage config ── */
const STAGES = [
  { key:'qabul',      label:'Qabul',    icon:'📥', color:'#3B82F6' },
  { key:'yuvish',     label:'Yuvish',   icon:'🫧', color:'#58a6ff' },
  { key:'quritish',   label:'Quritish', icon:'💨', color:'#f97316' },
  { key:'bezak',      label:'Bezak',    icon:'✨', color:'#a78bfa' },
  { key:'yetkazish',  label:'Yetkazish',icon:'🚚', color:'#f0883e' },
  { key:'tugallandi', label:'Tayyor',   icon:'✅', color:'#22c55e' },
]
const NEXT = {
  qabul:'yuvish', yuvish:'quritish', quritish:'bezak',
  bezak:'yetkazish', yetkazish:'tugallandi', tugallandi:'tugallandi'
}
const ITEM_TYPES = [
  { key:'gilam',  label:'Gilam',  unit:'sqm',  icon:'🟫', price:15000 },
  { key:'kurpa',  label:"Ko'rpa", unit:'dona', icon:'🛏️', price:25000 },
  { key:'adyol',  label:'Adyol',  unit:'dona', icon:'🧸', price:20000 },
  { key:'yostiq', label:'Yostiq', unit:'dona', icon:'💤', price:8000  },
  { key:'parda',  label:'Parda',  unit:'dona', icon:'🪟', price:12000 },
  { key:'kiyim',  label:'Kiyim',  unit:'dona', icon:'👕', price:8000  },
  { key:'boshqa', label:'Boshqa', unit:'dona', icon:'📦', price:10000 },
]
const EMPTY = { itemType:'gilam', name:'Gilam', unit:'sqm', width:'', length:'', qty:1, pricePerUnit:15000 }

function norm(r) {
  const v = r?.value ?? r
  if (Array.isArray(v)) return v
  if (Array.isArray(v?.data)) return v.data
  return []
}

/* ── Stage badge ── */
function StagePill({ stage }) {
  const { t } = useLang()
  const s = STAGES.find(x=>x.key===stage) || { label:stage, icon:'?', color:'#64748b' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
      background:`${s.color}18`, color:s.color, border:`1px solid ${s.color}35`,
    }}>
      {s.icon} {s.label}
    </span>
  )
}

/* ── Stage progress bar ── */
function StageBar({ items }) {
  const { t } = useLang()
  const stageCounts = useMemo(() => {
    const m = {}
    STAGES.forEach(s => { m[s.key] = 0 })
    items.forEach(i => { if (m[i.stage] !== undefined) m[i.stage]++ })
    return m
  }, [items])

  const dominantIdx = useMemo(() => {
    for (let i = STAGES.length-1; i >= 0; i--) {
      if (items.some(x => x.stage === STAGES[i].key)) return i
    }
    return 0
  }, [items])

  return (
    <div style={{ display:'flex', gap:4, marginBottom:16 }}>
      {STAGES.map((s, idx) => {
        const cnt   = stageCounts[s.key]
        const done  = idx < dominantIdx
        const cur   = idx === dominantIdx
        return (
          <div key={s.key} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          }}>
            <div style={{
              width:'100%', height:4, borderRadius:99,
              background: done ? s.color : cur ? s.color : 'var(--bg4)',
              opacity: done ? 0.6 : cur ? 1 : 0.3,
              transition:'all .3s',
            }}/>
            <div style={{
              fontSize:9, fontWeight:cur||done?700:400,
              color: cur ? s.color : done ? s.color : 'var(--text3)',
              display:'flex', alignItems:'center', gap:2,
              opacity: cur||done ? 1 : 0.4,
            }}>
              {s.icon} {cnt > 0 && <span style={{ background:s.color, color:'#fff', borderRadius:99, padding:'0 4px', fontSize:8 }}>{cnt}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Item card ── */
function ItemCard({ item, workers, onAdvance, onAssign, onEdit, onDelete }) {
  const { t } = useLang()
  const stage   = STAGES.find(s => s.key === item.stage) || STAGES[0]
  const assign  = item.assignments?.find(a => a.stage === item.stage && !a.doneAt)
  const typeInfo= ITEM_TYPES.find(t => t.key === item.itemType)
  const needW   = ['yuvish','quritish','bezak'].includes(item.stage)
  const canAdv  = item.stage !== 'tugallandi'

  return (
    <div className="od-item-card" style={{ '--stage-c': stage.color, opacity: item._pending ? 0.7 : 1 }}>
      {/* Left accent */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:stage.color, borderRadius:'4px 0 0 4px' }}/>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>{typeInfo?.icon || '📦'}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{item.name}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>
            {item.unit==='sqm'
              ? `${item.width||0}m × ${item.length||0}m = ${item.sqm||0} kv.m · ${fmt.currency(item.pricePerUnit)}/kv.m`
              : `${item.qty||1} dona · ${fmt.currency(item.pricePerUnit)}/dona`
            }
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'var(--green)', fontFamily:'monospace' }}>
            {fmt.currency(item.totalPrice)}
          </div>
          <StagePill stage={item.stage}/>
        </div>
      </div>

      {/* Assigned worker */}
      {assign && (
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'5px 8px', borderRadius:'var(--r)',
          background:'rgba(163,113,247,.08)', border:'1px solid rgba(163,113,247,.15)',
          fontSize:11, marginBottom:6,
        }}>
          <span>👷</span>
          <span style={{ fontWeight:600, color:'#a78bfa' }}>{assign.workerName}</span>
          <span style={{ color:'var(--text3)' }}>— {stage.label} bosqichida</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {/* Assign worker button */}
        {needW && (
          <button className="btn btn-ghost btn-sm"
            style={{ fontSize:11, color:'#a78bfa', borderColor:'rgba(163,113,247,.25)' }}
            onClick={() => onAssign(item)}>
            <MdPersonAdd size={12}/>
            {assign ? `${assign.workerName} ✓` : 'Ishchi biriktir'}
          </button>
        )}

        {/* Advance button */}
        {canAdv && (assign || item.stage==='qabul') && (
          <button className="btn btn-ghost btn-sm"
            style={{ fontSize:11, color:'var(--green)', borderColor:'rgba(34,197,94,.25)' }}
            onClick={() => onAdvance(item)}>
            <MdCheck size={12}/>
            {stage.label} tugallandi
          </button>
        )}

        <div style={{ flex:1 }}/>

        {/* Edit / Delete */}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(item)}>
          <MdEdit size={13}/>
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--red)' }}
          onClick={() => onDelete(item._id)}>
          <MdDelete size={13}/>
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function OrderDetail({ order: initialOrder, onBack }) {
  const { t } = useLang()
  const [order,   setOrder]   = useState(initialOrder)
  const [items,   setItems]   = useState([])
  const [workers, setWorkers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [prices,  setPrices]  = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState(EMPTY)
  const [adding,  setAdding]  = useState(false)

  /* Modals */
  const [assignModal, setAssignModal]   = useState(null)  // item
  const [driverModal, setDriverModal]   = useState(false)
  const [advModal,    setAdvModal]      = useState(null)  // item
  const [delId,       setDelId]         = useState(null)
  const [editModal,   setEditModal]     = useState(null)  // item
  const [editForm,    setEditForm]      = useState({})
  const [selWorker,   setSelWorker]     = useState(null)
  const [selDriver,   setSelDriver]     = useState(null)

  /* Load all data */
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [itsR, wsR, drR, prR] = await Promise.allSettled([
        api.getOrderItems(order._id),
        api.getEmployees(),
        api.getDrivers(),
        api.getPrices(),
      ])
      const its = norm(itsR.status==='fulfilled' ? itsR : { value:[] })
      setItems(its)
      setWorkers(norm(wsR.status==='fulfilled' ? wsR : { value:[] }).filter(w=>w.status==='active'&&w.role==='Ishchi'))
      setDrivers(norm(drR.status==='fulfilled' ? drR : { value:[] }).filter(d=>d.status!=='dam'))
      setPrices(norm(prR.status==='fulfilled' ? prR : { value:[] }))
    } catch(e) { toast(e.message,'err') }
    finally { setLoading(false) }
  }, [order._id])

  useEffect(() => { loadAll() }, [loadAll])

  /* ── Item type change ── */
  function onTypeChange(e) {
    const type = e.target.value
    const t    = ITEM_TYPES.find(x => x.key === type)
    const pr   = prices.find(p => p.itemType === type)
    setNewItem(p => ({
      ...p, itemType:type, name:t?.label||'',
      unit:t?.unit||'dona', pricePerUnit:pr?.price||t?.price||0,
    }))
  }

  /* ── Preview price ── */
  const previewPrice = useMemo(() => {
    if (newItem.unit==='sqm')
      return Math.round(parseFloat(newItem.width||0)*parseFloat(newItem.length||0)*(parseFloat(newItem.pricePerUnit)||0))
    return Math.round((parseInt(newItem.qty)||1)*(parseFloat(newItem.pricePerUnit)||0))
  }, [newItem])

  /* ── Add item ── */
  async function addItem() {
    if (adding) return
    if (!newItem.pricePerUnit) { toast('Narxni kiriting!','err'); return }
    if (newItem.unit==='sqm' && (!newItem.width||!newItem.length)) {
      toast('Eni va uzunligini kiriting!','err'); return
    }
    const payload = {
      orderId:      order._id,
      orderNumber:  order.number,
      ...newItem,
      width:        parseFloat(newItem.width)||null,
      length:       parseFloat(newItem.length)||null,
      qty:          parseInt(newItem.qty)||1,
      pricePerUnit: parseFloat(newItem.pricePerUnit)||0,
    }
    const sqm   = payload.unit==='sqm' ? Math.round(parseFloat(payload.width||0)*parseFloat(payload.length||0)*100)/100 : 0
    const price = payload.unit==='sqm' ? Math.round(sqm*payload.pricePerUnit) : Math.round((payload.qty||1)*payload.pricePerUnit)

    const tempId = '_tmp_' + Date.now()
    setItems(p => [...p, { _id:tempId, ...payload, sqm, totalPrice:price, stage:'qabul', assignments:[], _pending:true }])
    setNewItem(EMPTY)
    setAdding(true)
    try {
      const res   = await api.createOrderItem(payload)
      const saved = res?.data || res
      if (saved?._id) {
        setItems(p => p.map(i => i._id===tempId ? saved : i))
        setOrder(o => ({ ...o, total:(o.total||0)+price, itemCount:(o.itemCount||0)+1 }))
        toast(`"${saved.name}" qo'shildi ✅`, 'ok')
      } else { toast(`"${payload.name}" offline saqlandi`, 'inf') }
    } catch(e) {
      setItems(p => p.filter(i => i._id!==tempId))
      toast(e.message, 'err')
    }
    setAdding(false)
  }

  /* ── Assign worker ── */
  async function confirmAssign() {
    if (!selWorker) return
    const w = workers.find(x => x._id===selWorker)
    try {
      const res = await api.assignWorker(assignModal._id, selWorker, assignModal.stage)
      const data = res?.data || res
      if (data?.item) setItems(p => p.map(i => i._id===assignModal._id ? data.item : i))
      toast(`${w?.name} biriktirildi ✅`, 'ok')
    } catch(e) { toast(e.message,'err') }
    setAssignModal(null); setSelWorker(null)
  }

  /* ── Advance stage ── */
  async function doAdvance(item) {
    try {
      const res  = await api.advanceStage(item._id)
      const data = res?.data || res
      setItems(p => p.map(i => i._id===item._id ? (data.item||{...i,stage:data.nextStage||i.stage}) : i))
      const nextLabel = STAGES.find(s=>s.key===data.nextStage)?.label || ''
      toast(`"${item.name}" → ${nextLabel} ✅`, 'ok')
      if (data.earned>0) toast(`💰 Ishchi +${fmt.currency(data.earned)} oldi`, 'ok')
      if (data.nextStage==='yetkazish') toast('🚚 Yetkazish topshirig\'i yaratildi!','ok')
      if (data.orderStatus) setOrder(o=>({...o, status:data.orderStatus}))
    } catch(e) { toast(e.message,'err') }
    setAdvModal(null)
  }

  /* ── Assign driver ── */
  async function confirmDriver() {
    if (!selDriver) return
    const dr = drivers.find(d => d._id===selDriver)
    try {
      await api.updateOrder(order._id, { driver:dr.name })
      setOrder(o => ({ ...o, driver:dr.name }))
      toast(`${dr.name} biriktirildi ✅`, 'ok')
    } catch(e) { toast(e.message,'err') }
    setDriverModal(false); setSelDriver(null)
  }

  /* ── Delete item ── */
  async function doDelete() {
    const del = items.find(i => i._id===delId)
    try {
      await api.deleteOrderItem(delId, order._id)
      setItems(p => p.filter(i => i._id!==delId))
      if (del) setOrder(o => ({ ...o,
        total:    Math.max(0,(o.total||0)-(del.totalPrice||0)),
        itemCount:Math.max(0,(o.itemCount||0)-1),
      }))
      toast("O'chirildi", 'inf')
    } catch(e) { toast(e.message,'err') }
    setDelId(null)
  }

  /* ── Edit save ── */
  async function saveEdit() {
    try {
      const res  = await api.updateOrderItem(editModal, editForm)
      const saved = res?.data || res
      setItems(p => p.map(i => i._id===editModal ? (saved||{...i,...editForm}) : i))
      toast('Yangilandi ✅','ok')
    } catch(e) { toast(e.message,'err') }
    setEditModal(null)
  }

  /* Totals */
  const totalPrice = items.reduce((s,i)=>s+(i.totalPrice||0),0)

  /* Item summary string */
  const itemSummary = useMemo(() => {
    const counts = {}
    items.forEach(i => {
      const n = i.name || i.itemType || 'Mahsulot'
      counts[n] = (counts[n]||0)+1
    })
    return Object.entries(counts).map(([n,c])=>`${c} ta ${n}`).join(', ')
  }, [items])

  const inputStyle = {
    display:'flex', flex:1, flexDirection:'column', gap:4
  }

  return (
    <div className="od-wrap">
      {/* ── Back ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <MdArrowBack size={15}/> Orqaga
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={loadAll} title="Yangilash">
          <MdRefresh size={15}/>
        </button>
      </div>

      {/* ── Order header card ── */}
      <div className="card od-header-card">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <span style={{ fontSize:22, fontWeight:900, color:'var(--accent)', fontFamily:'monospace' }}>
                {order.number}
              </span>
              <StagePill stage={order.status?.replace('da','').replace('_qilindi','') || 'qabul'}/>
              {order.driver && (
                <span style={{ fontSize:11, color:'var(--orange)', display:'flex', alignItems:'center', gap:4 }}>
                  <MdDirectionsCar size={13}/> {order.driver}
                </span>
              )}
            </div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{order.customer}</div>
            {order.phone && (
              <a href={`https://t.me/+${(order.phone||'').replace(/\D/g,'')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12,
                  color:'#229ED9', background:'rgba(34,158,217,.1)',
                  padding:'3px 8px', borderRadius:99, textDecoration:'none', marginBottom:4 }}>
                <MdPhone size={11}/> {order.phone}
              </a>
            )}
            {order.address && (
              <div style={{ fontSize:11, color:'var(--text2)', display:'flex', alignItems:'center', gap:4 }}>
                <MdLocationOn size={12}/> {order.address}
              </div>
            )}
            {itemSummary && (
              <div style={{ fontSize:11, color:'var(--text2)', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                📋 {itemSummary}
              </div>
            )}
          </div>

          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>Jami narx</div>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--green)', fontFamily:'monospace' }}>
              {fmt.currency(totalPrice)}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
              <button className="btn btn-primary btn-sm"
                onClick={() => { setDriverModal(true); setSelDriver(null) }}>
                <MdDirectionsCar size={13}/>
                {order.driver ? 'Shafyor almashtir' : 'Shafyor biriktir'}
              </button>
            </div>
          </div>
        </div>

        {/* Stage progress */}
        {items.length > 0 && (
          <div style={{ marginTop:14 }}>
            <StageBar items={items}/>
          </div>
        )}
      </div>

      {/* ── Stage tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:14, overflowX:'auto', padding:'2px 0' }}>
        {STAGES.map(s => {
          const cnt = items.filter(i=>i.stage===s.key).length
          return (
            <div key={s.key} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:'var(--r)', flexShrink:0,
              background: cnt>0 ? `${s.color}14` : 'var(--bg2)',
              border: `1px solid ${cnt>0 ? s.color+'30' : 'var(--border)'}`,
              fontSize:12, fontWeight:cnt>0?700:400,
              color: cnt>0 ? s.color : 'var(--text3)',
            }}>
              {s.icon} {s.label}
              {cnt>0 && (
                <span style={{ background:s.color, color:'#fff', borderRadius:99,
                  width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:800 }}>{cnt}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Add item form ── */}
      <div className="card od-add-card">
        <div style={{ fontWeight:700, fontSize:13, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          <MdAdd size={16} style={{ color:'var(--accent)' }}/> Mahsulot qo'shish
        </div>

        <div className="od-add-grid">
          {/* Type */}
          <div style={inputStyle}>
            <label className="flabel">Turi</label>
            <select className="fselect" value={newItem.itemType} onChange={onTypeChange}>
              {ITEM_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          {/* Size or qty */}
          {newItem.unit==='sqm' ? (
            <>
              <div style={inputStyle}>
                <label className="flabel">Eni (m)</label>
                <input className="finput" type="number" step="0.1" min="0" placeholder="2.5"
                  value={newItem.width}
                  onChange={e => setNewItem(p=>({...p,width:e.target.value}))}/>
              </div>
              <div style={inputStyle}>
                <label className="flabel">Uzunligi (m)</label>
                <input className="finput" type="number" step="0.1" min="0" placeholder="3.0"
                  value={newItem.length}
                  onChange={e => setNewItem(p=>({...p,length:e.target.value}))}/>
              </div>
            </>
          ) : (
            <div style={inputStyle}>
              <label className="flabel">Soni</label>
              <input className="finput" type="number" min="1" value={newItem.qty}
                onChange={e => setNewItem(p=>({...p,qty:e.target.value}))}/>
            </div>
          )}

          {/* Price */}
          <div style={inputStyle}>
            <label className="flabel">Narx / {newItem.unit==='sqm'?'kv.m':'dona'}</label>
            <input className="finput" type="number" min="0" value={newItem.pricePerUnit}
              onChange={e => setNewItem(p=>({...p,pricePerUnit:e.target.value}))}/>
          </div>

          {/* Total + button */}
          <div style={{ display:'flex', flexDirection:'column', gap:4, justifyContent:'flex-end' }}>
            <label className="flabel">Jami</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontWeight:800, fontSize:15, fontFamily:'monospace', color:'var(--green)', minWidth:80 }}>
                {fmt.currency(previewPrice)}
              </span>
              <button className="btn btn-primary" onClick={addItem} disabled={adding}
                style={{ whiteSpace:'nowrap', opacity:adding?0.7:1 }}>
                {adding ? '⏳' : <><MdAdd size={14}/> Qo'shish</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Items list ── */}
      <div className="card" style={{ padding:0 }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 16px', borderBottom:'1px solid var(--border)',
        }}>
          <div style={{ fontWeight:700, fontSize:13 }}>
            📦 {t.items||'Mahsulotlar'} — {items.length} ta
            {totalPrice > 0 && (
              <span style={{ marginLeft:8, fontFamily:'monospace', color:'var(--green)', fontSize:14 }}>
                {fmt.currency(totalPrice)}
              </span>
            )}
          </div>
          {itemSummary && (
            <div style={{ fontSize:11, color:'var(--text2)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {itemSummary}
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding:32, display:'flex', justifyContent:'center' }}>
            <Loader size="md" text="{t.items||'Mahsulotlar'} yuklanmoqda..."/>
          </div>
        ) : items.length===0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            <div>Mahsulot qo'shilmagan. Yuqoridan qo'shing.</div>
          </div>
        ) : (
          <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', gap:8 }}>
            {items.map(item => (
              <ItemCard key={item._id} item={item} workers={workers}
                onAdvance={i => setAdvModal(i)}
                onAssign={i => { setAssignModal(i); setSelWorker(item.assignments?.find(a=>a.stage===i.stage&&!a.doneAt)?.workerId||null) }}
                onEdit={i => { setEditForm({...i}); setEditModal(i._id) }}
                onDelete={id => setDelId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}

      {/* Assign worker */}
      <Modal open={!!assignModal} onClose={()=>{setAssignModal(null);setSelWorker(null)}}
        title={`👷 Ishchi biriktirish — ${assignModal?.name||''}`} size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>{setAssignModal(null);setSelWorker(null)}}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={confirmAssign} disabled={!selWorker}>✅ {t.confirm||'Biriktirish'}</button>
        </>}>
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>
          Bosqich: <StagePill stage={assignModal?.stage||'qabul'}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto' }}>
          {workers.length===0
            ? <div style={{ textAlign:'center', padding:20, color:'var(--text3)' }}>Faol ishchi topilmadi</div>
            : workers.map(w => (
              <div key={w._id}
                className={`assign-driver-item ${selWorker===w._id?'sel':''}`}
                onClick={()=>setSelWorker(w._id)}>
                <div className="assign-driver-avatar" style={{background:'var(--purplebg)',borderColor:'var(--purple)',color:'var(--purple)'}}>{w.name?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{w.name}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{w.section} · Balans: {fmt.currency(w.balance)}</div>
                </div>
                <Sbadge s={w.status}/>
              </div>
            ))
          }
        </div>
      </Modal>

      {/* Assign driver */}
      <Modal open={driverModal} onClose={()=>{setDriverModal(false);setSelDriver(null)}}
        title="🚗 Shafyor biriktirish" size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>{setDriverModal(false);setSelDriver(null)}}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={confirmDriver} disabled={!selDriver}>✅ {t.confirm||'Biriktirish'}</button>
        </>}>
        {order.driver && (
          <div style={{padding:'7px 10px',background:'var(--orangebg)',borderRadius:'var(--r)',marginBottom:10,fontSize:12,color:'var(--orange)',fontWeight:600}}>
            ⚠️ Hozirgi: {order.driver}
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto'}}>
          {drivers.map(d=>(
            <div key={d._id} className={`assign-driver-item ${selDriver===d._id?'sel':''}`} onClick={()=>setSelDriver(d._id)}>
              <div className="assign-driver-avatar">{d.name?.[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>{d.car} · {d.plate}</div>
              </div>
              <Sbadge s={d.status}/>
            </div>
          ))}
        </div>
      </Modal>

      {/* Advance confirm */}
      <Modal open={!!advModal} onClose={()=>setAdvModal(null)}
        title={`✅ Bosqichni tugatish`} size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setAdvModal(null)}>{t.cancel}</button>
          <button className="btn btn-success" onClick={()=>doAdvance(advModal)}>✅ Tugallandi</button>
        </>}>
        {advModal && (
          <div style={{padding:'12px 14px',background:'var(--bg3)',borderRadius:'var(--r)'}}>
            <div style={{fontWeight:700,marginBottom:8}}>{advModal.name}</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <StagePill stage={advModal.stage}/>
              <span style={{color:'var(--text3)'}}>→</span>
              <StagePill stage={NEXT[advModal.stage]||'yuvish'}/>
            </div>
            {['yuvish','quritish','bezak'].includes(advModal.stage) && (
              <div style={{marginTop:8,fontSize:11,color:'var(--green)',fontWeight:600}}>
                💰 Ishchi balansiga qo'shiladi
              </div>
            )}
            {advModal.stage==='bezak' && (
              <div style={{marginTop:4,fontSize:11,color:'var(--orange)',fontWeight:600}}>
                🚚 Yetkazish topshirig'i avtomatik yaratiladi!
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit item */}
      <Modal open={!!editModal} onClose={()=>setEditModal(null)}
        title="✏️ Mahsulot tahrirlash" size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setEditModal(null)}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={saveEdit}>{t.save}</button>
        </>}>
        <div className="fgrid2">
          {editForm.unit==='sqm' ? <>
            <div className="fg"><label className="flabel">Eni (m)</label>
              <input className="finput" type="number" step="0.1" value={editForm.width||''}
                onChange={e=>setEditForm(p=>({...p,width:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Uzunligi (m)</label>
              <input className="finput" type="number" step="0.1" value={editForm.length||''}
                onChange={e=>setEditForm(p=>({...p,length:+e.target.value}))}/></div>
          </> : (
            <div className="fg"><label className="flabel">Soni</label>
              <input className="finput" type="number" value={editForm.qty||1}
                onChange={e=>setEditForm(p=>({...p,qty:+e.target.value}))}/></div>
          )}
          <div className="fg"><label className="flabel">Narx</label>
            <input className="finput" type="number" value={editForm.pricePerUnit||''}
              onChange={e=>setEditForm(p=>({...p,pricePerUnit:+e.target.value}))}/></div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Confirm open={!!delId} onClose={()=>setDelId(null)} onOk={doDelete}
        title="Mahsulotni o'chirish" msg="Bu mahsulotni o'chirishni xohlaysizmi?" danger/>
    </div>
  )
}
