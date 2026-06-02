import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdViewKanban, MdTableRows,
  MdPhone, MdLocationOn, MdDirectionsCar, MdArrowForward,
  MdShoppingBag, MdRefresh, MdPersonAdd
} from 'react-icons/md'
import { api, fmt, norm } from '../../services/api.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import OrderDetail from '../orderdetail/OrderDetail.jsx'
import { SmsPopover } from '../../components/ui/SmsPopover.jsx'
import './Orders.css'

/* ── Constants ── */
const COLUMNS = [
  { key:'yangi',         label:'Yangi',        icon:'📞', color:'var(--accent)',  desc:"Qo'ng'iroq qildi, navbat kutmoqda" },
  { key:'qabul_qilindi', label:'Qabul qilindi', icon:'📦', color:'var(--yellow)', desc:'Shafyor olib keldi, qabul qilindi' },
  { key:'yuvishda',      label:'Yuvishda',       icon:'🫧', color:'#58a6ff',       desc:'Yuvish jarayonida' },
  { key:'qurishda',      label:'Quritishda',     icon:'💨', color:'var(--orange)', desc:'Quritish jarayonida' },
  { key:'bezakda',       label:'Bezakda',        icon:'✨', color:'var(--purple)', desc:'Bezak jarayonida' },
  { key:'yetkazishda',   label:'Yetkazishda',    icon:'🚚', color:'#f0883e',       desc:'Shafyor yetkazmoqda' },
  { key:'tugallandi',    label:'Tugallandi',     icon:'✅', color:'var(--green)',  desc:'Yakunlandi' },
]
const ALL_STATUSES = [
  ...COLUMNS.map(c=>({key:c.key,label:c.label})),
  { key:'bekor', label:'Bekor' },
]
const NEXT_STATUS = {
  yangi:'qabul_qilindi', qabul_qilindi:'yuvishda',
  yuvishda:'qurishda',   qurishda:'bezakda',
  bezakda:'yetkazishda', yetkazishda:'tugallandi',
}
const NEXT_LABEL = {
  yangi:'→ Qabul',    qabul_qilindi:'→ Yuvishga',
  yuvishda:'→ Quritishga', qurishda:'→ Bezakka',
  bezakda:'→ Yetkazishga', yetkazishda:'✅ Tugallandi',
}

/* Helpers */
function mapLink(lat,lon,addr){
  if(lat&&lon) return `https://yandex.com/maps/?ll=${lon},${lat}&z=16&pt=${lon},${lat},pm2rdm`
  return `https://yandex.com/maps/?text=${encodeURIComponent(addr||'')}`
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
  const colCfg  = COLUMNS.find(c=>c.key===col)
  const accent  = colCfg?.color || 'var(--accent)'
  const canAdv  = !!NEXT_STATUS[order.status]
  const hasMap  = (order.lat&&order.lon) || order.address
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
      {order.description && (
        <div className="kb-card-desc">{order.description}</div>
      )}
      <div className="kb-card-footer">
        <span className="kb-card-price">{fmt.currency(order.total)}</span>
        {order.itemCount>0 && <span className="kb-card-items">{order.itemCount} mahsulot</span>}
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
            <MdArrowForward size={10}/> {NEXT_LABEL[order.status]}
          </button>
        )}

        {/* Xarita */}
        {hasMap && (
          <a href={mapLink(order.lat,order.lon,order.address)} target="_blank" rel="noopener noreferrer"
            className="kb-action-btn kba-map" onClick={e=>e.stopPropagation()}>
            <MdLocationOn size={10}/> Xarita
          </a>
        )}
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
   MAIN ORDERS PAGE
══════════════════════════════════════════ */
export default function Orders() {
  const [orders,      setOrders]      = useState([])
  const [drivers,     setDrivers]     = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('kanban')
  const [colView,     setColView]     = useState(null)
  const [detail,      setDetail]      = useState(null)

  /* Modals */
  const [formModal,       setFormModal]       = useState(null)
  const [form,            setForm]            = useState(() => ({ ...EMPTY, ...loadDraft() }))
  const [assignModal,     setAssignModal]     = useState(null)
  const [assignWorkerMod, setAssignWorkerMod] = useState(null)
  const [selDriver,       setSelDriver]       = useState(null)
  const [selWorker,       setSelWorker]       = useState(null)
  const [delId,           setDelId]           = useState(null)
  const [isSubmitting,    setIsSubmitting]    = useState(false)

  /* Table filter */
  const [search,  setSearch]  = useState('')
  const [statusF, setStatusF] = useState('')
  const [page,    setPage]    = useState(1)
  const PAGE_SIZE = 15

  useEffect(() => { loadAll() }, [])

  /* Save form draft on change */
  useEffect(() => {
    if (formModal) saveDraft(form)
  }, [form, formModal])

  async function loadAll() {
    setLoading(true)
    try {
      const [ords, drvs, emps] = await Promise.all([
        api.getOrders().then(norm),
        api.getDrivers().then(norm).catch(()=>[]),
        api.getEmployees().then(norm).catch(()=>[]),
      ])
      setOrders(ords)
      setDrivers(drvs)
      setEmployees(emps.filter(e=>e.role==='Ishchi'&&e.status==='active'))
    } catch(e) { toast(e.message,'err') }
    setLoading(false)
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const grouped = useMemo(()=>{
    const g={}; COLUMNS.forEach(c=>{g[c.key]=[]})
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
            // Prevent duplicate in local state
            const exists = p.some(o => o._id === saved._id || (saved._pending && o.phone===saved.phone && o.customer===saved.customer))
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
      toast(`${order.number} → ${COLUMNS.find(c=>c.key===next)?.label} ✅`,'ok')
    } catch(e){toast(e.message,'err')}
  }

  /* Assign driver */
  async function confirmAssignDriver() {
    if (!selDriver){toast('Shafyorni tanlang','err');return}
    const dr = drivers.find(d=>d._id===selDriver)
    try {
      // STATUS O'ZGARMAYDI — faqat shafyor biriktiriladi
      // "Yangi" dan "Qabul qilindi" ga o'tish faqat shafyor botda "Topshirdim" desa o'tadi
      await api.updateOrder(assignModal._id, { driver: dr.name })
      setOrders(p=>p.map(r=>r._id===assignModal._id ? {...r, driver:dr.name} : r))
      toast(`${dr.name} biriktirildi ✅ — Shafyor olib kelganda Qabul qilindiga o'tadi`, 'ok')
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
    { k:'status', l:'Holat', r:v=>{const c=COLUMNS.find(x=>x.key===v); return <span className="badge" style={{background:c?.color+'22',color:c?.color,border:`1px solid ${c?.color+'44'}`}}>{c?.label||v}</span>} },
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
            onClick={()=>advanceOrder(row)} title={NEXT_LABEL[row.status]}>
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
            ? <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>⏳ Yuklanmoqda...</div>
            : <div className="kanban-board">
                {COLUMNS.map(col=>(
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
                <option value="">Barcha holat</option>
                {ALL_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
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
          const c = COLUMNS.find(x=>x.key===colView)
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
            <button className="btn btn-ghost" onClick={()=>setFormModal(null)}>Yopish</button>
            <button className="btn btn-primary" onClick={saveForm} disabled={isSubmitting}
              style={{opacity:isSubmitting?0.6:1,cursor:isSubmitting?'not-allowed':'pointer'}}>
              {isSubmitting ? '⏳ Saqlanmoqda...' : formModal==='create'?'Yaratish':'Saqlash'}
            </button>
          </>}
        >
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Mijoz ismi *</label>
              <input className="finput" value={form.customer} onChange={set('customer')} autoFocus/></div>
            <div className="fg"><label className="flabel">Telefon *</label>
              <input className="finput" placeholder="+998 90 000 00 00" value={form.phone} onChange={set('phone')}/></div>
          </div>
          <div className="fg"><label className="flabel">Manzil</label>
            <input className="finput" value={form.address} onChange={set('address')}/></div>
          <div className="fg"><label className="flabel">📋 Tavsif — nimalar bor</label>
            <textarea className="ftextarea" rows={3}
              placeholder="3 ta gilam, 2 ta ko'rpa, yostiqlar bor..."
              value={form.description} onChange={set('description')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                {ALL_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
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
            <button className="btn btn-ghost" onClick={()=>{setAssignModal(null);setSelDriver(null)}}>Bekor</button>
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
            <button className="btn btn-ghost" onClick={()=>{setAssignWorkerMod(null);setSelWorker(null)}}>Bekor</button>
            <button className="btn btn-primary" onClick={confirmAssignWorker} disabled={!selWorker}>✅ Biriktirish</button>
          </>}
        >
          <div style={{marginBottom:10,padding:'8px 10px',background:'var(--bg3)',borderRadius:'var(--r)',fontSize:12}}>
            <div style={{fontWeight:700}}>{assignWorkerMod?.customer}</div>
            <div style={{color:'var(--text2)',marginTop:2}}>
              Bosqich: <strong style={{color:'var(--yellow)'}}>
                {COLUMNS.find(c=>c.key===assignWorkerMod?.status)?.label || assignWorkerMod?.status}
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
