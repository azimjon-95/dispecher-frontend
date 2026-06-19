import { useState, useEffect, useMemo } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdCheckCircle, MdLocationOn,
  MdPerson, MdPhone, MdRefresh, MdPersonAdd
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import { useLang } from '../../i18n/index.jsx'
const isMob = () => window.innerWidth <= 768

const STATUSES = ['rejalashtirilgan','jarayonda','bajarildi','bekor']
const STATUS_COLORS = {
  rejalashtirilgan: 'var(--accent)',
  jarayonda:        'var(--yellow)',
  bajarildi:        'var(--green)',
  bekor:            'var(--red)',
}
const EMPTY = { customer:'', phone:'', address:'', lat:'', lon:'', scheduledDate:'', scheduledTime:'', description:'', totalAmount:'', workerPercent:10, status:'rejalashtirilgan' }

function norm(r) {
  if (Array.isArray(r)) return r
  if (Array.isArray(r?.data)) return r.data
  return []
}


/* ══════════════════════════════════════════
   MOBILE HOME SERVICE — iOS style
══════════════════════════════════════════ */
function MobServiceCard({ sv, onEdit, onDone, onDelete }) {
  const color = STATUS_COLORS[sv.status] || 'var(--text3)'
  const isDone = sv.status === 'bajarildi'
  const isPlan = sv.status === 'rejalashtirilgan'

  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:16, overflow:'hidden', position:'relative',
    }}>
      <div style={{height:3, background:`linear-gradient(90deg,${color},${color}66)`}}/>
      <div style={{padding:'12px 14px'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{sv.customer}</div>
            {sv.phone && (
              <a href={`tel:${sv.phone}`} style={{
                display:'inline-flex',alignItems:'center',gap:4,
                fontSize:12,color:'#229ED9',textDecoration:'none',
              }}>
                <MdPhone size={11}/>{sv.phone}
              </a>
            )}
          </div>
          <span style={{
            fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99,
            background:color+'18',color,border:`1px solid ${color}30`,flexShrink:0,
          }}>{sv.status}</span>
        </div>

        {/* Address */}
        {sv.address && (
          <div style={{
            display:'flex',alignItems:'flex-start',gap:6,
            padding:'7px 10px',borderRadius:10,
            background:'var(--bg3)',marginBottom:8,
            fontSize:12,color:'var(--text2)',lineHeight:1.4,
          }}>
            <MdLocationOn size={13} style={{color:'#f97316',flexShrink:0,marginTop:1}}/>
            <span>{sv.address}</span>
          </div>
        )}

        {/* Date + Amount row */}
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          {sv.scheduledDate && (
            <div style={{
              flex:1,padding:'7px 10px',borderRadius:10,
              background:'var(--bg3)',fontSize:11,color:'var(--text2)',
              display:'flex',alignItems:'center',gap:5,
            }}>
              📅 {sv.scheduledDate} {sv.scheduledTime && `· ${sv.scheduledTime}`}
            </div>
          )}
          {sv.totalAmount > 0 && (
            <div style={{
              padding:'7px 12px',borderRadius:10,
              background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',
              fontSize:13,fontWeight:800,color:'#22c55e',fontFamily:'monospace',
            }}>
              {fmt.currency(sv.totalAmount)}
            </div>
          )}
        </div>

        {/* Ishchilar */}
        {sv.workers?.length > 0 && (
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
            {sv.workers.map((w,i)=>(
              <span key={i} style={{
                fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,
                background:'rgba(139,92,246,.12)',color:'#8b5cf6',
                border:'1px solid rgba(139,92,246,.2)',
              }}>👷 {w.workerName}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{display:'flex',gap:6}}>
          {isPlan && (
            <button onClick={()=>onDone(sv)} style={{
              flex:1,padding:'8px',borderRadius:10,cursor:'pointer',
              background:'rgba(34,197,94,.12)',color:'#22c55e',
              border:'1px solid rgba(34,197,94,.25)',
              fontSize:12,fontWeight:700,
              display:'flex',alignItems:'center',justifyContent:'center',gap:5,
              WebkitTapHighlightColor:'transparent',
            }}>
              <MdCheckCircle size={14}/> Yakunlash
            </button>
          )}
          <button onClick={()=>onEdit(sv)} style={{
            width:36,height:36,borderRadius:10,cursor:'pointer',
            background:'rgba(59,130,246,.1)',color:'#3B82F6',
            border:'1px solid rgba(59,130,246,.2)',
            display:'flex',alignItems:'center',justifyContent:'center',
            WebkitTapHighlightColor:'transparent',
          }}><MdEdit size={15}/></button>
          <button onClick={()=>onDelete(sv._id)} style={{
            width:36,height:36,borderRadius:10,cursor:'pointer',
            background:'rgba(248,81,73,.1)',color:'#f85149',
            border:'1px solid rgba(248,81,73,.2)',
            display:'flex',alignItems:'center',justifyContent:'center',
            WebkitTapHighlightColor:'transparent',
          }}><MdDelete size={15}/></button>
        </div>
      </div>
    </div>
  )
}

function MobHomeService({ services, loading, workers, onAdd, onEdit, onDone, onDelete, search, setSearch, statusF, setStatusF }) {
  const { t } = useLang()
  const total   = services.length
  const planned = services.filter(s=>s.status==='rejalashtirilgan').length
  const done    = services.filter(s=>s.status==='bajarildi').length
  const income  = services.filter(s=>s.status==='bajarildi').reduce((s,x)=>s+(x.totalAmount||0),0)

  const filtered = useMemo(()=>{
    let r = services
    if (statusF) r = r.filter(s=>s.status===statusF)
    if (search)  r = r.filter(s=>(s.customer||'').toLowerCase().includes(search.toLowerCase())||(s.phone||'').includes(search)||(s.address||'').toLowerCase().includes(search.toLowerCase()))
    return r
  },[services,statusF,search])

  return (
    <div style={{paddingBottom:90}}>
      {/* Hero */}
      <div style={{
        background:'linear-gradient(160deg,#1a0d1a 0%,#0d1117 100%)',
        padding:'14px 16px 18px',position:'relative',overflow:'hidden',
      }}>
        <div style={{position:'absolute',top:-40,right:-40,width:150,height:150,
          borderRadius:'50%',background:'rgba(139,92,246,.12)',filter:'blur(30px)',pointerEvents:'none'}}/>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,
          textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Uyga xizmat</div>
        <div style={{fontSize:28,fontWeight:900,color:'#8b5cf6',fontFamily:'monospace',marginBottom:10}}>
          {total} ta
        </div>
        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {[
            {lbl:'Rejalash',val:planned,c:'#3B82F6',emoji:'📅'},
            {lbl:'Bajarildi',val:done,c:'#22c55e',emoji:'✅'},
            {lbl:'Daromad',val:fmt.currency(income),c:'#22c55e',emoji:'💰',small:true},
          ].map(s=>(
            <div key={s.lbl} style={{
              background:'rgba(255,255,255,.05)',
              border:'1px solid rgba(255,255,255,.08)',
              borderRadius:12,padding:'10px 10px',
            }}>
              <div style={{fontSize:14,marginBottom:3}}>{s.emoji}</div>
              <div style={{
                fontWeight:900,color:s.c,fontFamily:'monospace',
                fontSize:s.small?12:18,lineHeight:1,marginBottom:2,
              }}>{s.val}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{
        display:'flex',gap:6,overflowX:'auto',
        padding:'10px 16px 6px',scrollbarWidth:'none',
      }}>
        {[{key:'',label:t.all||'Barchasi',emoji:'📋'},...STATUSES.map(s=>({key:s,label:s,emoji:s==='rejalashtirilgan'?'📅':s==='jarayonda'?'🔄':s==='bajarildi'?'✅':'❌'}))].map(t=>{
          const isAct = statusF === t.key
          const c = t.key ? STATUS_COLORS[t.key]||'var(--text3)' : 'var(--text2)'
          return (
            <button key={t.key} onClick={()=>setStatusF(t.key)} style={{
              flexShrink:0,display:'flex',alignItems:'center',gap:5,
              padding:'7px 12px',borderRadius:99,cursor:'pointer',
              background:isAct?`${c}20`:'var(--bg2)',
              border:`1px solid ${isAct?c+'60':'var(--border)'}`,
              color:isAct?c:'var(--text3)',
              fontSize:12,fontWeight:700,
              WebkitTapHighlightColor:'transparent',transition:'all .15s',
            }}>
              <span>{t.emoji}</span><span>{t.label}</span>
            </button>
          )
        })}
        <style>{`::-webkit-scrollbar{display:none}`}</style>
      </div>

      {/* Search */}
      <div style={{padding:'4px 16px 10px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,
          background:'var(--bg2)',border:'1px solid var(--border)',
          borderRadius:12,padding:'8px 12px'}}>
          <span style={{fontSize:15,flexShrink:0}}>🔍</span>
          <input placeholder="Mijoz, manzil..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{flex:1,background:'none',border:'none',outline:'none',
              color:'var(--text)',fontSize:14,fontFamily:'inherit'}}/>
          {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',
            color:'var(--text3)',cursor:'pointer',fontSize:16}}>✕</button>}
        </div>
      </div>

      {/* Count */}
      <div style={{padding:'0 16px 8px',fontSize:12,color:'var(--text3)'}}>
        {filtered.length} ta xizmat
      </div>

      {/* Cards */}
      <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:8}}>
        {loading ? (
          [...Array(3)].map((_,i)=>(
            <div key={i} style={{height:120,borderRadius:14,background:'var(--bg2)',
              animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*80+'ms'}}/>
          ))
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
            <div style={{fontSize:36,marginBottom:8}}>🏠</div>
            <div style={{fontSize:13}}>Xizmat topilmadi</div>
          </div>
        ) : filtered.map(sv=>(
          <MobServiceCard key={sv._id} sv={sv}
            onEdit={onEdit} onDone={onDone} onDelete={onDelete}/>
        ))}
      </div>

      {/* FAB */}
      <button onClick={onAdd} style={{
        position:'fixed',bottom:74,right:20,
        width:54,height:54,borderRadius:'50%',
        background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',
        color:'white',border:'none',cursor:'pointer',
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:'0 4px 20px rgba(139,92,246,.5)',zIndex:200,
        WebkitTapHighlightColor:'transparent',transition:'transform .12s',
      }}
        onTouchStart={e=>e.currentTarget.style.transform='scale(.9)'}
        onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
      ><MdAdd size={26}/></button>

      <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  )
}

export default function HomeService() {
  const { t } = useLang()
  const [services,   setServices]   = useState([])
  const [workers,    setWorkers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [formModal,  setFormModal]  = useState(null)
  const [form,       setForm]       = useState(EMPTY)
  const [doneModal,  setDoneModal]  = useState(null)
  const [doneForm,   setDoneForm]   = useState({ totalAmount:'', paidAmount:'', description:'' })
  const [selWorkers, setSelWorkers] = useState([])
  const [delId,      setDelId]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [statusF,    setStatusF]    = useState('')
  const [page,       setPage]       = useState(1)
  const PAGE = 15
  const [mobile, setMobile] = useState(isMob())
  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [svR, wsR] = await Promise.allSettled([api.getHomeServices(), api.getEmployees()])
      setServices(norm(svR.value))
      setWorkers(norm(wsR.value).filter(w=>w.status==='active'&&w.role==='Ishchi'))
    } catch(e) { toast(e.message,'err') }
    setLoading(false)
  }

  function set(k) { return e => setForm(p=>({...p,[k]:e.target.value})) }

  async function save() {
    if (!form.customer||!form.phone||!form.address){toast("Ism, tel va manzil kerak!",'err');return}
    try {
      if (formModal==='create') {
        const rec = await api.createHomeService(form)
        setServices(p=>[rec?.data||rec,...p])
        toast('Xizmat yaratildi ✅','ok')
      } else {
        await api.updateHomeService(form._id, form)
        setServices(p=>p.map(s=>s._id===form._id?{...s,...form}:s))
        toast('Yangilandi ✅','ok')
      }
      setFormModal(null)
    } catch(e){toast(e.message,'err')}
  }

  async function complete() {
  const { t } = useLang()
    if (!doneForm.totalAmount){toast("Jami summani kiriting!",'err');return}
    try {
      const workerList = selWorkers.map(id=>{
        const w = workers.find(x=>x._id===id)
        return { workerId:id, workerName:w?.name||'', percent: doneModal.workerPercent||10 }
      })
      await api.completeHomeService(doneModal._id, { ...doneForm, totalAmount:+doneForm.totalAmount, paidAmount:+(doneForm.paidAmount||doneForm.totalAmount), workers:workerList })
      setServices(p=>p.map(s=>s._id===doneModal._id?{...s,status:'bajarildi',totalAmount:+doneForm.totalAmount}:s))
      toast('Xizmat yakunlandi ✅ — Ishchilar balansi yangilandi!','ok')
      setDoneModal(null); setSelWorkers([])
    } catch(e){toast(e.message,'err')}
  }

  const filtered = useMemo(()=>{
    const q = search.toLowerCase()
    return services.filter(s=>
      (!statusF||s.status===statusF)&&
      (!q||s.customer?.toLowerCase().includes(q)||s.number?.includes(q)||s.address?.toLowerCase().includes(q))
    )
  },[services,search,statusF])

  const paginated = useMemo(()=>filtered.slice((page-1)*PAGE,page*PAGE),[filtered,page])

  const COLS = [
    { k:'number',        l:'Raqam',       r:v=><span className="mono" style={{color:'var(--purple)',fontWeight:700}}>{v}</span> },
    { k:'customer',      l:'Mijoz',       r:(v,r)=>(
      <div>
        <div style={{fontWeight:600}}>{v}</div>
        <div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:4}}>
          <MdPhone size={10}/>{r.phone}
        </div>
      </div>
    )},
    { k:'address',       l:'Manzil',      r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v}</span> },
    { k:'scheduledDate', l:"Sana/Vaqt",   r:(v,r)=><span style={{fontSize:11,fontFamily:'monospace'}}>{v} {r.scheduledTime}</span> },
    { k:'totalAmount',   l:'Summa',        r:v=>v?<span className="mono" style={{fontWeight:700,color:'var(--green)'}}>{fmt.currency(v)}</span>:<span style={{color:'var(--text3)',fontSize:11}}>—</span> },
    { k:'workerPercent', l:"Ishchi %",    r:v=><span className="badge b-blue">{v}%</span> },
    { k:'status',        l:'Holat',       r:v=>{
      const c=STATUS_COLORS[v]||'var(--text3)'
      return <span className="badge" style={{background:c+'22',color:c,border:`1px solid ${c}44`,fontSize:11}}>{v}</span>
    }},
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        {row.status==='rejalashtirilgan'&&(
          <button className="btn btn-ghost btn-sm" style={{fontSize:11,color:'var(--green)'}}
            onClick={()=>{setDoneModal(row);setDoneForm({totalAmount:row.totalAmount||'',paidAmount:'',description:''});setSelWorkers(row.workers?.map(w=>w.workerId)||[])}}>
            <MdCheckCircle size={13}/> Yakunlash
          </button>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setFormModal('edit')}}><MdEdit size={13}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={13}/></button>
      </div>
    )},
  ]

  // Mobile render
  if (mobile) return (
    <ErrorBoundary>
      <MobHomeService
        services={services} loading={loading} workers={workers}
        onAdd={()=>{setForm(EMPTY);setFormModal('create')}}
        onEdit={sv=>{setForm({...sv});setFormModal('edit')}}
        onDone={sv=>{setDoneModal(sv);setDoneForm({totalAmount:sv.totalAmount||'',paidAmount:'',description:''});setSelWorkers(sv.workers?.map(w=>w.workerId)||[])}}
        onDelete={id=>setDelId(id)}
        search={search} setSearch={setSearch}
        statusF={statusF} setStatusF={setStatusF}
      />
      {/* Shared Modals */}
      <Modal open={formModal==='create'||formModal==='edit'} onClose={()=>setFormModal(null)}
        title={formModal==='create'?'🏠 Yangi uy xizmati':'✏️ Tahrirlash'} size="lg"
        footer={<><button className="btn btn-ghost" onClick={()=>setFormModal(null)}>{t.cancel}</button><button className="btn btn-primary" onClick={save}>{t.save}</button></>}>
        <div className="fg"><label className="flabel">Mijoz ismi *</label><input className="finput" value={form.customer} onChange={set('customer')} autoFocus/></div>
        <div className="fg"><label className="flabel">Telefon *</label><input className="finput" placeholder="+998 90 000 00 00" value={form.phone} onChange={set('phone')}/></div>
        <div className="fg"><label className="flabel">Manzil *</label><input className="finput" value={form.address} onChange={set('address')}/></div>
        <div className="fgrid2">
          <div className="fg"><label className="flabel">Sana</label><input className="finput" type="date" value={form.scheduledDate} onChange={set('scheduledDate')}/></div>
          <div className="fg"><label className="flabel">Vaqt</label><input className="finput" type="time" value={form.scheduledTime} onChange={set('scheduledTime')}/></div>
        </div>
        <div className="fgrid2">
          <div className="fg"><label className="flabel">Summa</label><input className="finput" type="number" value={form.totalAmount} onChange={set('totalAmount')}/></div>
          <div className="fg"><label className="flabel">Ishchi %</label><input className="finput" type="number" min="0" max="100" value={form.workerPercent} onChange={set('workerPercent')}/></div>
        </div>
        <div className="fg"><label className="flabel">Tavsif</label><textarea className="ftextarea" rows={2} value={form.description} onChange={set('description')}/></div>
      </Modal>
      <Modal open={!!doneModal} onClose={()=>{setDoneModal(null);setSelWorkers([])}}
        title="✅ Xizmatni yakunlash" size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>setDoneModal(null)}>{t.cancel}</button><button className="btn btn-success" onClick={complete}>Yakunlash</button></>}>
        <div className="fg"><label className="flabel">Jami summa</label><input className="finput" type="number" value={doneForm.totalAmount} onChange={e=>setDoneForm(p=>({...p,totalAmount:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">To'langan</label><input className="finput" type="number" value={doneForm.paidAmount} onChange={e=>setDoneForm(p=>({...p,paidAmount:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">Izoh</label><textarea className="ftextarea" rows={2} value={doneForm.description} onChange={e=>setDoneForm(p=>({...p,description:e.target.value}))}/></div>
      </Modal>
      <Confirm open={!!delId} onClose={()=>setDelId(null)} onOk={async()=>{try{await api.deleteHomeService(delId);setServices(p=>p.filter(s=>s._id!==delId));toast("O'chirildi",'inf')}catch(e){toast(e.message,'err')}finally{setDelId(null)}}} title="O'chirish" msg="Bu xizmatni o'chirasizmi?" danger/>
    </ErrorBoundary>
  )

  return (
    <ErrorBoundary>
      <div>
        <PH title="🏠 Uyga Xizmat" sub={`${filtered.length} ta xizmat`}
          actions={<>
            <ExportBtn data={services} name="uy-xizmat"/>
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setFormModal('create')}}>
              <MdAdd size={15}/> Yangi xizmat
            </button>
          </>}
        />

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          {[
            { lbl:'Jami',          val:services.length,                                     c:'var(--accent)',  icon:'🏠' },
            { lbl:'Rejalashtirilgan', val:services.filter(s=>s.status==='rejalashtirilgan').length, c:'var(--accent)', icon:'📅' },
            { lbl:'Bajarildi',    val:services.filter(s=>s.status==='bajarildi').length,    c:'var(--green)',   icon:'✅' },
            { lbl:'Daromad',      val:fmt.currency(services.filter(s=>s.status==='bajarildi').reduce((s,x)=>s+(x.totalAmount||0),0)), c:'var(--green)', icon:'💰' },
          ].map(k=>(
            <div key={k.lbl} className="kpi-card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:18,marginBottom:4}}>{k.icon}</div>
              <div style={{fontWeight:800,fontSize:16,color:k.c}}>{k.val}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>{k.lbl}</div>
            </div>
          ))}
        </div>

        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Mijoz, manzil, raqam..."
            value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
          <select className="fselect" value={statusF} onChange={e=>{setStatusF(e.target.value);setPage(1)}}>
            <option value="">Barcha holat</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={paginated} loading={loading}/>
          <Paging page={page} total={filtered.length} size={PAGE} onChange={setPage}/>
        </div>

        {/* Create/Edit Modal */}
        <Modal open={formModal==='create'||formModal==='edit'} onClose={()=>setFormModal(null)}
          title={formModal==='create'?'🏠 Yangi uy xizmati':'✏️ Tahrirlash'} size="lg"
          footer={<><button className="btn btn-ghost" onClick={()=>setFormModal(null)}>{t.cancel}</button><button className="btn btn-primary" onClick={save}>{t.save}</button></>}>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Mijoz ismi *</label><input className="finput" value={form.customer} onChange={set('customer')} autoFocus/></div>
            <div className="fg"><label className="flabel">Telefon *</label><input className="finput" placeholder="+998 90 000 00 00" value={form.phone} onChange={set('phone')}/></div>
          </div>
          <div className="fg"><label className="flabel">Manzil *</label><input className="finput" placeholder="Ko'cha, uy raqami" value={form.address} onChange={set('address')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Sana</label><input className="finput" type="date" value={form.scheduledDate} onChange={set('scheduledDate')}/></div>
            <div className="fg"><label className="flabel">Vaqt</label><input className="finput" type="time" value={form.scheduledTime} onChange={set('scheduledTime')}/></div>
          </div>
          <div className="fg"><label className="flabel">📋 Tavsif — qanday xizmat</label>
            <textarea className="ftextarea" rows={2} placeholder="Divan, gilam, xolodilnik yuvish..." value={form.description} onChange={set('description')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Taxminiy summa</label><input className="finput" type="number" value={form.totalAmount} onChange={set('totalAmount')}/></div>
            <div className="fg">
              <label className="flabel">Ishchi ulushi (%)</label>
              <input className="finput" type="number" min="0" max="100" value={form.workerPercent} onChange={set('workerPercent')}/>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>Jami summadan nechi foizi ishchilarga taqsimlanadi</div>
            </div>
          </div>
          <div className="fg"><label className="flabel">Holat</label>
            <select className="fselect" value={form.status} onChange={set('status')}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </Modal>

        {/* Complete Modal */}
        <Modal open={!!doneModal} onClose={()=>{setDoneModal(null);setSelWorkers([])}}
          title={`✅ Xizmatni yakunlash — ${doneModal?.number||''}`} size="lg"
          footer={<><button className="btn btn-ghost" onClick={()=>{setDoneModal(null);setSelWorkers([])}}>{t.cancel}</button><button className="btn btn-success" onClick={complete}>✅ Yakunlash</button></>}>
          <div style={{padding:'8px 12px',background:'var(--bg3)',borderRadius:'var(--r)',marginBottom:12}}>
            <div style={{fontWeight:700}}>{doneModal?.customer}</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>{doneModal?.address} · {doneModal?.scheduledDate} {doneModal?.scheduledTime}</div>
          </div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Jami summa *</label><input className="finput" type="number" value={doneForm.totalAmount} onChange={e=>setDoneForm(p=>({...p,totalAmount:e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Naqd olindi</label><input className="finput" type="number" placeholder="Barcha bo'lsa bo'sh qoldiring" value={doneForm.paidAmount} onChange={e=>setDoneForm(p=>({...p,paidAmount:e.target.value}))}/></div>
          </div>
          <div className="fg"><label className="flabel">Bajariganlar tavsifi</label>
            <textarea className="ftextarea" rows={2} value={doneForm.description} onChange={e=>setDoneForm(p=>({...p,description:e.target.value}))}/></div>

          <div style={{marginTop:8}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>
              👷 Kimlar bordi? ({doneModal?.workerPercent||10}% taqsimlanadi)
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:180,overflowY:'auto'}}>
              {workers.map(w=>(
                <div key={w._id}
                  onClick={()=>setSelWorkers(p=>p.includes(w._id)?p.filter(x=>x!==w._id):[...p,w._id])}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:'var(--r)',background:selWorkers.includes(w._id)?'var(--accentbg)':'var(--bg3)',border:`1px solid ${selWorkers.includes(w._id)?'var(--accent)':'var(--border)'}`,cursor:'pointer',transition:'all var(--t)'}}>
                  <div style={{width:20,height:20,borderRadius:4,background:selWorkers.includes(w._id)?'var(--accent)':'var(--bg4)',border:`1px solid ${selWorkers.includes(w._id)?'var(--accent)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',flexShrink:0}}>
                    {selWorkers.includes(w._id)?'✓':''}
                  </div>
                  <span style={{fontWeight:600,fontSize:13,flex:1}}>{w.name}</span>
                  {selWorkers.includes(w._id) && doneForm.totalAmount && (
                    <span style={{fontSize:11,fontFamily:'monospace',color:'var(--green)',fontWeight:700}}>
                      +{fmt.currency(Math.round(+doneForm.totalAmount*(doneModal?.workerPercent||10)/100/selWorkers.length))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await api.deleteHomeService(delId);setServices(p=>p.filter(s=>s._id!==delId));setDelId(null);toast("O'chirildi",'inf')}}
          title="O'chirish" msg="Bu xizmatni o'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
