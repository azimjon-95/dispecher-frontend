import { useState, useEffect, useMemo } from 'react'
import {
  MdArrowBack, MdAdd, MdEdit, MdDelete, MdPersonAdd,
  MdDirectionsCar, MdArrowForward, MdCheck, MdAttachMoney,
  MdPhone, MdLocationOn
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Confirm, Sbadge, toast } from '../../components/ui/UI.jsx'
import './OrderDetail.css'

/* ── Constants ── */
const ETAPLAR = [
  { key:'qabul',      label:'Qabul',     icon:'📥', color:'var(--accent)' },
  { key:'yuvish',     label:'Yuvish',    icon:'🫧', color:'#58a6ff' },
  { key:'quritish',   label:'Quritish',  icon:'💨', color:'var(--orange)' },
  { key:'bezak',      label:'Bezak',     icon:'✨', color:'var(--purple)' },
  { key:'yetkazish',  label:'Yetkazish', icon:'🚚', color:'#f0883e' },
  { key:'tugallandi', label:'Tayyor',    icon:'✅', color:'var(--green)' },
]
const ETAP_NEXT = { qabul:'yuvish', yuvish:'quritish', quritish:'bezak', bezak:'yetkazish', yetkazish:'tugallandi', tugallandi:'tugallandi' }

const ITEM_TYPES = [
  { key:'gilam',  label:'Gilam',   unit:'sqm',  icon:'🟫', defaultPrice:15000 },
  { key:'kurpa',  label:"Ko'rpa",  unit:'dona', icon:'🛏️', defaultPrice:25000 },
  { key:'adyol',  label:'Adyol',   unit:'dona', icon:'🧸', defaultPrice:20000 },
  { key:'yostiq', label:'Yostiq',  unit:'dona', icon:'💤', defaultPrice:8000  },
  { key:'parda',  label:'Parda',   unit:'dona', icon:'🪟', defaultPrice:12000 },
  { key:'kiyim',  label:'Kiyim',   unit:'dona', icon:'👕', defaultPrice:8000  },
  { key:'boshqa', label:'Boshqa',  unit:'dona', icon:'📦', defaultPrice:10000 },
]

const EMPTY_ITEM = { itemType:'gilam', name:'Gilam', unit:'sqm', width:'', length:'', qty:1, pricePerUnit:15000, description:'' }

function norm(r) {
  if (!r || r.status !== 'fulfilled') return []
  const v = r.value
  if (Array.isArray(v)) return v
  if (Array.isArray(v?.data)) return v.data
  return []
}

function StageBadge({ stage }) {
  const e = ETAPLAR.find(x=>x.key===stage) || { label:stage, icon:'?', color:'var(--text3)' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 8px', borderRadius:99,
      background: e.color+'22', color: e.color,
      border:`1px solid ${e.color}44`,
      fontSize:11, fontWeight:700,
    }}>
      {e.icon} {e.label}
    </span>
  )
}

function TgIcon() {
  return <svg style={{width:12,height:12,flexShrink:0}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/></svg>
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function OrderDetail({ order: initialOrder, onBack }) {
  const [order,    setOrder]    = useState(initialOrder)
  const [items,    setItems]    = useState([])
  const [workers,  setWorkers]  = useState([])
  const [drivers,  setDrivers]  = useState([])
  const [prices,   setPrices]   = useState([])
  const [loading,  setLoading]  = useState(true)

  /* Forms */
  const [newItem,    setNewItem]    = useState(EMPTY_ITEM)
  const [addingItem, setAddingItem] = useState(false)

  /* Modals */
  const [assignWorkerModal, setAssignWorkerModal] = useState(null)
  const [assignDriverModal, setAssignDriverModal] = useState(null)
  const [selWorker,  setSelWorker]  = useState(null)
  const [selDriver,  setSelDriver]  = useState(null)
  const [delItemId,  setDelItemId]  = useState(null)
  const [editModal,  setEditModal]  = useState(null)
  const [editForm,   setEditForm]   = useState({})
  const [advConfirm, setAdvConfirm] = useState(null)

  useEffect(() => { loadAll() }, [order._id])

  async function loadAll() {
    setLoading(true)
    try {
      const [itsR, wsR, drR, prR] = await Promise.allSettled([
        api.getOrderItems(order._id),
        api.getEmployees(),
        api.getDrivers(),
        api.getPrices(),
      ])
      setItems(norm(itsR))
      setWorkers(norm(wsR).filter(w=>w.status==='active'&&w.role==='Ishchi'))
      setDrivers(norm(drR).filter(d=>d.status!=='dam'))
      setPrices(norm(prR))
    } catch(e) { toast(e.message,'err') }
    finally { setLoading(false) }
  }

  /* ── Auto-fill price on type change ── */
  function handleTypeChange(e) {
    const type   = e.target.value
    const found  = ITEM_TYPES.find(t=>t.key===type)
    const priceRec = prices.find(p=>p.itemType===type)
    setNewItem(p => ({
      ...p,
      itemType:     type,
      name:         found?.label || '',
      unit:         found?.unit  || 'dona',
      pricePerUnit: priceRec?.price || found?.defaultPrice || '',
    }))
  }

  /* ── Preview price ── */
  const previewPrice = useMemo(() => {
    if (newItem.unit==='sqm') return Math.round(parseFloat(newItem.width||0)*parseFloat(newItem.length||0)*(parseFloat(newItem.pricePerUnit)||0))
    return Math.round((parseInt(newItem.qty)||1)*(parseFloat(newItem.pricePerUnit)||0))
  }, [newItem])

  /* ── Add item ── */
  async function addItem() {
    if (addingItem) return
    if (!newItem.name) { toast('Mahsulot nomini kiriting!','err'); return }
    if (!newItem.pricePerUnit) { toast('Narxni kiriting!','err'); return }
    if (newItem.unit==='sqm' && (!newItem.width||!newItem.length)) { toast("Eni va uzunligini kiriting!",'err'); return }

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
    const price = payload.unit==='sqm' ? Math.round(sqm*(payload.pricePerUnit||0)) : Math.round((payload.qty||1)*(payload.pricePerUnit||0))

    // Optimistic
    const tempId = '_tmp_'+Date.now()
    const temp   = { _id:tempId, ...payload, sqm, totalPrice:price, stage:'qabul', assignments:[], _pending:true }
    setItems(p=>[...p, temp])
    setNewItem(EMPTY_ITEM)
    setAddingItem(true)

    try {
      const rec   = await api.createOrderItem(payload)
      const saved = rec?.data || rec
      if (saved?._id) {
        setItems(p=>p.map(i=>i._id===tempId?saved:i))
        toast(`"${saved.name}" qo'shildi ✅`,'ok')
        // Update order total
        setOrder(o=>({...o, total:(o.total||0)+price, itemCount:(o.itemCount||0)+1}))
      } else {
        toast(`"${payload.name}" saqlandi (offline)`,'inf')
      }
    } catch(e) {
      setItems(p=>p.filter(i=>i._id!==tempId))
      setNewItem(payload)
      toast(e.message,'err')
    } finally { setAddingItem(false) }
  }

  /* ── Assign worker to item (stage O'ZGARMAYDI) ── */
  async function confirmAssignWorker() {
    if (!selWorker) { toast('Ishchini tanlang','err'); return }
    try {
      const res = await api.assignWorker(assignWorkerModal._id, selWorker, assignWorkerModal.stage)
      if (res) {
        const data = res?.data || res
        setItems(p=>p.map(i=>i._id===assignWorkerModal._id ? (data.item||i) : i))
        toast(`${data.worker?.name || 'Ishchi'} biriktirildi ✅`,'ok')
      }
    } catch(e) { toast(e.message,'err') }
    setAssignWorkerModal(null); setSelWorker(null)
  }

  /* ── Advance stage (done click) ── */
  async function doAdvance(item) {
    try {
      const res = await api.advanceStage(item._id)
      const data = res?.data || res
      setItems(p=>p.map(i=>i._id===item._id?(data.item||{...i,stage:data.nextStage||i.stage}):i))
      const label = ETAPLAR.find(e=>e.key===data.nextStage)?.label || data.nextStage
      toast(`"${item.name}" → ${label} ✅`,'ok')
      if (data.earned > 0) toast(`💰 Ishchi balansiga +${fmt.currency(data.earned)} yozildi`,'ok')
      // Bezak tugasa → avto yetkazish
      if (data.nextStage==='yetkazish') toast('🚚 Yetkazish topshirig\'i avtomatik yaratildi!','ok')
      if (data.orderStatus) setOrder(o=>({...o, status:data.orderStatus}))
    } catch(e) { toast(e.message,'err') }
    setAdvConfirm(null)
  }

  /* ── Assign driver to order (for yetkazish) ── */
  async function confirmAssignDriver() {
    if (!selDriver) { toast('Shafyorni tanlang','err'); return }
    const dr = drivers.find(d=>d._id===selDriver)
    try {
      await api.updateOrder(order._id, { driver: dr.name })
      setOrder(o=>({...o, driver:dr.name}))
      toast(`${dr.name} buyurtmaga biriktirildi ✅`,'ok')
    } catch(e) { toast(e.message,'err') }
    setAssignDriverModal(null); setSelDriver(null)
  }

  /* ── Delete item ── */
  async function doDelete() {
    try {
      await api.deleteOrderItem(delItemId, order._id)
      const del = items.find(i=>i._id===delItemId)
      setItems(p=>p.filter(i=>i._id!==delItemId))
      if (del) setOrder(o=>({...o, total:Math.max(0,(o.total||0)-(del.totalPrice||0)), itemCount:Math.max(0,(o.itemCount||0)-1)}))
      toast("O'chirildi",'inf')
    } catch(e) { toast(e.message,'err') }
    setDelItemId(null)
  }

  /* ── Computed ── */
  const totalPrice    = items.reduce((s,i)=>s+(i.totalPrice||0),0)
  const stageCounts   = useMemo(()=>{ const c={}; ETAPLAR.forEach(e=>{c[e.key]=0}); items.forEach(i=>{if(c[i.stage]!==undefined)c[i.stage]++}); return c },[items])
  const dominantStage = useMemo(()=>{
    const priority = ['yetkazish','bezak','quritish','yuvish','qabul','tugallandi']
    for (const s of priority) { if (items.some(i=>i.stage===s)) return s }
    return 'qabul'
  },[items])

  return (
    <div className="od-wrap">
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:14}}>
        <MdArrowBack size={15}/> Orqaga
      </button>

      {/* ── Order header ── */}
      <div className="od-header">
        <div className="od-header-left">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div className="od-order-num">{order.number}</div>
            <StageBadge stage={order.status?.replace('da','').replace('_qilindi','') || dominantStage}/>
          </div>
          <div className="od-customer">{order.customer}</div>
          {order.phone && (
            <div className="od-phone-row" style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
              <a href={`https://t.me/+${(order.phone||'').replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:99,background:'rgba(34,158,217,.15)',color:'#229ED9',textDecoration:'none',fontSize:12,fontWeight:600}}>
                <TgIcon/> {order.phone}
              </a>
            </div>
          )}
          {order.address && <div style={{fontSize:12,color:'var(--text2)',marginTop:4,display:'flex',alignItems:'center',gap:4}}><MdLocationOn size={13}/> {order.address}</div>}
          {order.description && <div style={{fontSize:12,color:'var(--text3)',marginTop:3,fontStyle:'italic'}}>📋 {order.description}</div>}
          {order.driver && (
            <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,color:'var(--orange)'}}>
              <MdDirectionsCar size={14}/> Shafyor: {order.driver}
              <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 6px'}} onClick={()=>{setAssignDriverModal(true);setSelDriver(null)}}>
                🔄 Almashtirish
              </button>
            </div>
          )}
        </div>
        <div className="od-header-right">
          <div className="od-total-box">
            <div className="od-total-label">Jami narx</div>
            <div className="od-total-val" style={{color:'var(--green)'}}>{fmt.currency(totalPrice)}</div>
          </div>
          <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
            {!order.driver && (
              <button className="btn btn-primary btn-sm" onClick={()=>{setAssignDriverModal(true);setSelDriver(null)}}>
                <MdDirectionsCar size={13}/> Shafyor biriktirish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Pipeline progress ── */}
      <div className="od-pipeline">
        {ETAPLAR.map(e=>{
          const count   = stageCounts[e.key]||0
          const allIdx  = ETAPLAR.findIndex(x=>x.key===e.key)
          const domIdx  = ETAPLAR.findIndex(x=>x.key===dominantStage)
          const isDone  = allIdx < domIdx
          const isCur   = e.key === dominantStage
          return (
            <div key={e.key} className={`od-stage ${isDone?'done':''} ${isCur?'current':''}`}
              style={{ '--stage-color': e.color }}>
              <span className="od-stage-icon">{e.icon}</span>
              <span className="od-stage-label">{e.label}</span>
              {count>0 && <span className="od-stage-count">{count}</span>}
            </div>
          )
        })}
      </div>

      {/* ── Add item form ── */}
      <div className="od-add-section">
        <div className="od-add-title"><MdAdd size={15}/> Mahsulot qo'shish</div>
        <div className="od-add-grid">
          <div className="fg">
            <label className="flabel">Turi</label>
            <select className="fselect" value={newItem.itemType} onChange={handleTypeChange}>
              {ITEM_TYPES.map(t=><option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </select>
          </div>

          {newItem.unit==='sqm' ? (<>
            <div className="fg"><label className="flabel">Eni (m)</label>
              <input className="finput" type="number" step="0.1" min="0" placeholder="2.5"
                value={newItem.width} onChange={e=>setNewItem(p=>({...p,width:e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Uzunligi (m)</label>
              <input className="finput" type="number" step="0.1" min="0" placeholder="3.0"
                value={newItem.length} onChange={e=>setNewItem(p=>({...p,length:e.target.value}))}/></div>
          </>) : (
            <div className="fg"><label className="flabel">Soni</label>
              <input className="finput" type="number" min="1" value={newItem.qty}
                onChange={e=>setNewItem(p=>({...p,qty:e.target.value}))}/></div>
          )}

          <div className="fg">
            <label className="flabel">Narx (1 {newItem.unit==='sqm'?'kv.m':'dona'})</label>
            <input className="finput" type="number" min="0" placeholder="15000"
              value={newItem.pricePerUnit} onChange={e=>setNewItem(p=>({...p,pricePerUnit:e.target.value}))}/>
          </div>

          <div className="fg">
            <label className="flabel">&nbsp;</label>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontFamily:'monospace',fontWeight:800,fontSize:14,color:'var(--green)'}}>
                = {fmt.currency(previewPrice)}
              </span>
              <button className="btn btn-primary" onClick={addItem} disabled={addingItem}
                style={{whiteSpace:'nowrap',opacity:addingItem?.7:1}}>
                {addingItem?'⏳':'➕ Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Items list ── */}
      <div className="od-items-section">
        <div className="od-items-title">
          📦 Mahsulotlar — {items.length} ta
          {totalPrice>0 && <span style={{marginLeft:8,fontFamily:'monospace',color:'var(--green)'}}>{fmt.currency(totalPrice)}</span>}
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:'var(--text3)'}}>⏳ Yuklanmoqda...</div>
        ) : items.length===0 ? (
          <div style={{padding:32,textAlign:'center',color:'var(--text3)'}}>
            <div style={{fontSize:28,marginBottom:8}}>📭</div>
            Mahsulot qo'shilmagan. Yuqoridan qo'shing.
          </div>
        ) : (
          <div className="od-items-list">
            {items.map(item=>{
              const etap  = ETAPLAR.find(e=>e.key===item.stage) || ETAPLAR[0]
              const assign = item.assignments?.find(a=>a.stage===item.stage&&!a.doneAt)
              const canAdv = item.stage!=='tugallandi'
              const needWorker = ['yuvish','quritish','bezak'].includes(item.stage)

              return (
                <div key={item._id} className="od-item-card" style={{opacity:item._pending?.7:1, '--item-color':etap.color}}>
                  {/* Item header */}
                  <div className="od-item-hd">
                    <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                      <span style={{fontSize:16}}>{ITEM_TYPES.find(t=>t.key===item.itemType)?.icon||'📦'}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{item.name}</div>
                        <div style={{fontSize:11,color:'var(--text2)'}}>
                          {item.unit==='sqm'
                            ? `${item.width||0} × ${item.length||0} = ${item.sqm||0} kv.m`
                            : `${item.qty||1} dona`
                          }
                          {' · '}{fmt.currency(item.pricePerUnit)}/{item.unit==='sqm'?'kv.m':'dona'}
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontFamily:'monospace',fontWeight:800,color:'var(--green)',fontSize:13}}>
                        {fmt.currency(item.totalPrice)}
                      </span>
                      <StageBadge stage={item.stage}/>
                      {item._pending && <span style={{fontSize:9,color:'var(--yellow)',fontWeight:700}}>⏳</span>}
                    </div>
                  </div>

                  {/* Assigned worker */}
                  {assign && (
                    <div style={{padding:'5px 10px',background:'var(--bg3)',borderRadius:'var(--r)',margin:'4px 0',fontSize:11,display:'flex',alignItems:'center',gap:6}}>
                      👷 <span style={{fontWeight:600}}>{assign.workerName}</span>
                      <span style={{color:'var(--text3)'}}>{etap.label} bosqichida ishlayapti</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="od-item-actions">
                    {/* Ishchi biriktirish */}
                    {needWorker && (
                      <button className="btn btn-ghost btn-sm"
                        style={{fontSize:11,color:'var(--purple)',borderColor:'rgba(163,113,247,.3)'}}
                        onClick={()=>{setAssignWorkerModal(item);setSelWorker(assign?.workerId||null)}}>
                        <MdPersonAdd size={12}/>
                        {assign ? `${assign.workerName} ✓` : 'Ishchi biriktirish'}
                      </button>
                    )}

                    {/* Bosqichni tugatdi → keyingiga */}
                    {canAdv && assign && (
                      <button className="btn btn-ghost btn-sm"
                        style={{fontSize:11,color:'var(--green)',borderColor:'rgba(63,185,80,.3)'}}
                        onClick={()=>setAdvConfirm(item)}>
                        <MdCheck size={12}/>
                        {etap.label} tugallandi → {ETAPLAR.find(e=>e.key===ETAP_NEXT[item.stage])?.label}
                      </button>
                    )}

                    {/* Agar assign yo'q va qabul bosqichida */}
                    {item.stage==='qabul' && !assign && (
                      <button className="btn btn-ghost btn-sm"
                        style={{fontSize:11,color:'var(--yellow)',borderColor:'rgba(210,153,34,.3)'}}
                        onClick={()=>setAdvConfirm(item)}>
                        <MdArrowForward size={12}/> Yuvishga o'tkazish
                      </button>
                    )}

                    <div style={{flex:1}}/>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setEditForm({...item});setEditModal(item._id)}}><MdEdit size={13}/></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelItemId(item._id)}><MdDelete size={13}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}

      {/* Assign worker */}
      <Modal open={!!assignWorkerModal} onClose={()=>{setAssignWorkerModal(null);setSelWorker(null)}}
        title={`👷 Ishchi biriktirish — ${assignWorkerModal?.name||''}`} size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>{setAssignWorkerModal(null);setSelWorker(null)}}>Bekor</button>
          <button className="btn btn-primary" onClick={confirmAssignWorker} disabled={!selWorker}>✅ Biriktirish</button>
        </>}
      >
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>
          Bosqich: <StageBadge stage={assignWorkerModal?.stage||'qabul'}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflowY:'auto'}}>
          {workers.length===0
            ? <div style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Faol ishchi topilmadi</div>
            : workers.map(w=>(
                <div key={w._id}
                  className={`assign-driver-item ${selWorker===w._id?'sel':''}`}
                  onClick={()=>setSelWorker(w._id)}
                >
                  <div className="assign-driver-avatar" style={{background:'var(--purplebg)',borderColor:'var(--purple)',color:'var(--purple)'}}>{w.name[0]}</div>
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
      <Modal open={!!assignDriverModal} onClose={()=>{setAssignDriverModal(null);setSelDriver(null)}}
        title="🚗 Shafyor biriktirish" size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>{setAssignDriverModal(null);setSelDriver(null)}}>Bekor</button>
          <button className="btn btn-primary" onClick={confirmAssignDriver} disabled={!selDriver}>✅ Biriktirish</button>
        </>}
      >
        {order.driver && (
          <div style={{padding:'7px 10px',background:'var(--orangebg)',borderRadius:'var(--r)',marginBottom:10,fontSize:12,color:'var(--orange)',fontWeight:600}}>
            ⚠️ Hozirgi shafyor: {order.driver}
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto'}}>
          {drivers.map(d=>(
            <div key={d._id}
              className={`assign-driver-item ${selDriver===d._id?'sel':''}`}
              onClick={()=>setSelDriver(d._id)}
            >
              <div className="assign-driver-avatar">{d.name[0]}</div>
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
      <Modal open={!!advConfirm} onClose={()=>setAdvConfirm(null)}
        title={`✅ Bosqichni tugatish — ${advConfirm?.name||''}`} size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setAdvConfirm(null)}>Bekor</button>
          <button className="btn btn-success" onClick={()=>doAdvance(advConfirm)}>✅ Tugallandi</button>
        </>}
      >
        <div style={{padding:'12px 14px',background:'var(--bg3)',borderRadius:'var(--r)',fontSize:13}}>
          <div style={{fontWeight:700,marginBottom:6}}>{advConfirm?.name}</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <StageBadge stage={advConfirm?.stage||'qabul'}/>
            <span style={{color:'var(--text3)'}}>→</span>
            <StageBadge stage={ETAP_NEXT[advConfirm?.stage||'qabul']||'yuvish'}/>
          </div>
          {['yuvish','quritish','bezak'].includes(advConfirm?.stage) && (
            <div style={{marginTop:8,fontSize:11,color:'var(--green)',fontWeight:600}}>
              💰 Ishchi balansiga qo'shiladi
            </div>
          )}
          {advConfirm?.stage==='bezak' && (
            <div style={{marginTop:4,fontSize:11,color:'#f0883e',fontWeight:600}}>
              🚚 Bezak tugasa yetkazib berish topshirig'i avtomatik yaratiladi!
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Confirm open={!!delItemId} onClose={()=>setDelItemId(null)} onOk={doDelete}
        title="Mahsulotni o'chirish" msg="Bu mahsulotni o'chirishni xohlaysizmi?" danger/>
    </div>
  )
}
