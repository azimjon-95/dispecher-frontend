import { useState, useEffect, useMemo } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdCheckCircle, MdLocationOn,
  MdPerson, MdPhone, MdRefresh, MdPersonAdd
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'

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

export default function HomeService() {
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
          footer={<><button className="btn btn-ghost" onClick={()=>setFormModal(null)}>Bekor</button><button className="btn btn-primary" onClick={save}>Saqlash</button></>}>
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
          footer={<><button className="btn btn-ghost" onClick={()=>{setDoneModal(null);setSelWorkers([])}}>Bekor</button><button className="btn btn-success" onClick={complete}>✅ Yakunlash</button></>}>
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
