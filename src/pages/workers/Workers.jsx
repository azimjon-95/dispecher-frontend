import { useState, useEffect, useMemo } from 'react'
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md'
import { api } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, toast, ErrorBoundary } from '../../components/ui/UI.jsx'
import './Workers.css'
import { useLang } from '../../i18n/index.jsx'

const WORKER_LIST = ['Zulfiya Holova','Feruza Nazarova','Komil Tursunov','Dilshod Karimov']
const STATUSES    = ['yangi','jarayonda','tayyor']
const EMPTY       = { order:'', item:'', worker:'', qty:1, sqm:0, status:'yangi' }
const isMob       = () => window.innerWidth <= 768

const STATUS_COLOR = { yangi:'#3B82F6', jarayonda:'#f59e0b', tayyor:'#22c55e' }

export default function Workers() {
  const { t } = useLang()
  const crud = useCRUD(
    { getAll:api.getWorkers, create:api.createWorker, update:api.updateWorker, remove:api.deleteWorker },
    ['order','item','worker']
  )
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(EMPTY)
  const [delId,  setDelId]  = useState(null)
  const [mobile, setMobile] = useState(isMob())
  const [srch,   setSrch]   = useState('')
  const [wFilter,setWFilter]= useState('')
  const [sFilter,setSFilter]= useState('')

  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function save() {
  const { t } = useLang()
    if (!form.order||!form.item||!form.worker){toast("Barcha maydonlarni to'ldiring!",'err');return}
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  const filtered = useMemo(()=>{
    let r = crud.data
    if (wFilter) r = r.filter(x=>x.worker===wFilter)
    if (sFilter) r = r.filter(x=>x.status===sFilter)
    if (srch)    r = r.filter(x=>(x.order||'').includes(srch)||(x.item||'').toLowerCase().includes(srch.toLowerCase()))
    return r
  },[crud.data,wFilter,sFilter,srch])

  const COLS = [
    { k:'order',  l:'Buyurtma', r:v=><span className="mono" style={{color:'var(--accent)',fontWeight:700}}>{v}</span> },
    { k:'item',   l:'Buyum' },
    { k:'worker', l:'Ishchi', r:v=>(<div style={{display:'flex',alignItems:'center',gap:7}}><div className="worker-avatar">{v?.[0]}</div>{v}</div>) },
    { k:'qty',    l:'Soni',  r:v=><span className="mono">{v} ta</span> },
    { k:'sqm',    l:'Kv.m',  r:v=><span className="mono">{v} m²</span> },
    { k:'status', l:'Holat', r:v=><Sbadge s={v}/> },
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setModal('edit')}}><MdEdit size={15}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={15}/></button>
      </div>
    )},
  ]

  /* ── MOBILE ── */
  if (mobile) return (
    <ErrorBoundary>
      <div style={{paddingBottom:90}}>
        {/* Hero */}
        <div style={{background:'linear-gradient(160deg,#0d0d1a 0%,#0d1117 100%)',padding:'14px 16px 18px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:150,height:150,borderRadius:'50%',background:'rgba(249,115,22,.08)',filter:'blur(30px)',pointerEvents:'none'}}/>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
            👷 Sex Topshiriqlari
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {STATUSES.map(s=>{
              const cnt = crud.data.filter(x=>x.status===s).length
              const c   = STATUS_COLOR[s]
              return (
                <button key={s} onClick={()=>setSFilter(sFilter===s?'':s)} style={{
                  background:sFilter===s?`${c}20`:'rgba(255,255,255,.05)',
                  border:`1px solid ${sFilter===s?c+'50':'rgba(255,255,255,.08)'}`,
                  borderRadius:12,padding:'10px',cursor:'pointer',WebkitTapHighlightColor:'transparent',
                }}>
                  <div style={{fontWeight:900,color:c,fontFamily:'monospace',fontSize:20}}>{cnt}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginTop:2,textTransform:'capitalize'}}>{s}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search */}
        <div style={{padding:'10px 16px 6px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'8px 12px'}}>
            <span style={{fontSize:15,flexShrink:0}}>🔍</span>
            <input placeholder="Buyurtma raqam yoki buyum..." value={srch} onChange={e=>setSrch(e.target.value)}
              style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--text)',fontSize:14,fontFamily:'inherit'}}/>
            {srch&&<button onClick={()=>setSrch('')} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:16}}>✕</button>}
          </div>
        </div>

        {/* Worker filter pills */}
        <div style={{display:'flex',gap:6,padding:'4px 16px 10px',overflowX:'auto',scrollbarWidth:'none'}}>
          <button onClick={()=>setWFilter('')} style={{
            flexShrink:0,padding:'5px 12px',borderRadius:99,
            background:!wFilter?'rgba(249,115,22,.15)':'var(--bg2)',
            border:`1px solid ${!wFilter?'rgba(249,115,22,.4)':'var(--border)'}`,
            color:!wFilter?'#f97316':'var(--text3)',fontSize:11,fontWeight:700,cursor:'pointer',
          }}>Hammasi</button>
          {WORKER_LIST.map(w=>(
            <button key={w} onClick={()=>setWFilter(wFilter===w?'':w)} style={{
              flexShrink:0,padding:'5px 12px',borderRadius:99,
              background:wFilter===w?'rgba(249,115,22,.15)':'var(--bg2)',
              border:`1px solid ${wFilter===w?'rgba(249,115,22,.4)':'var(--border)'}`,
              color:wFilter===w?'#f97316':'var(--text3)',fontSize:11,fontWeight:700,cursor:'pointer',
              WebkitTapHighlightColor:'transparent',
            }}>{w.split(' ')[0]}</button>
          ))}
        </div>

        {/* Count */}
        <div style={{padding:'0 16px 8px',fontSize:12,color:'var(--text3)'}}>{filtered.length} ta topshiriq</div>

        {/* Cards */}
        <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:8}}>
          {crud.loading ? (
            [...Array(3)].map((_,i)=>(
              <div key={i} style={{height:90,borderRadius:14,background:'var(--bg2)',animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*80+'ms'}}/>
            ))
          ) : filtered.length===0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
              <div style={{fontSize:36,marginBottom:8}}>🔧</div>
              <div>Topshiriq topilmadi</div>
            </div>
          ) : filtered.map(row=>{
            const sc = STATUS_COLOR[row.status]||'var(--text3)'
            return (
              <div key={row._id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:sc,borderRadius:'14px 0 0 14px'}}/>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                      <span style={{fontFamily:'monospace',fontWeight:800,fontSize:13,color:'var(--accent)'}}>{row.order}</span>
                      <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:`${sc}18`,color:sc,fontWeight:700}}>{row.status}</span>
                    </div>
                    <div style={{fontWeight:700,fontSize:14}}>{row.item}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...row});setModal('edit')}} style={{width:32,height:32,borderRadius:9,cursor:'pointer',background:'rgba(59,130,246,.1)',color:'#3B82F6',border:'1px solid rgba(59,130,246,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><MdEdit size={14}/></button>
                    <button onClick={()=>setDelId(row._id)} style={{width:32,height:32,borderRadius:9,cursor:'pointer',background:'rgba(248,81,73,.1)',color:'#f85149',border:'1px solid rgba(248,81,73,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><MdDelete size={14}/></button>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:28,height:28,borderRadius:8,background:'rgba(249,115,22,.12)',border:'1px solid rgba(249,115,22,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#f97316',fontSize:12,flexShrink:0}}>{row.worker?.[0]}</div>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>{row.worker}</div>
                  <div style={{marginLeft:'auto',display:'flex',gap:10,fontSize:11,color:'var(--text3)'}}>
                    {row.qty>0&&<span>{row.qty} ta</span>}
                    {row.sqm>0&&<span>{row.sqm} m²</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAB */}
        <button onClick={()=>{setForm(EMPTY);setModal('create')}} style={{
          position:'fixed',bottom:74,right:20,width:54,height:54,borderRadius:'50%',
          background:'linear-gradient(135deg,#f97316,#c2410c)',color:'white',
          border:'none',cursor:'pointer',fontSize:26,display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 4px 20px rgba(249,115,22,.45)',zIndex:200,WebkitTapHighlightColor:'transparent',
        }}><MdAdd size={28}/></button>

        {/* Modal */}
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={modal==='create'?'+ Yangi topshiriq':'✏️ Tahrirlash'}
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button><button className="btn btn-primary" onClick={save}>{t.save}</button></>}>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Buyurtma raqami *</label><input className="finput" placeholder="#1042" value={form.order} onChange={set('order')}/></div>
            <div className="fg"><label className="flabel">Buyum *</label><input className="finput" placeholder="Ko'ylak ×3" value={form.item} onChange={set('item')}/></div>
          </div>
          <div className="fg"><label className="flabel">Ishchi *</label>
            <select className="fselect" value={form.worker} onChange={set('worker')}>
              <option value="">Tanlang...</option>
              {WORKER_LIST.map(w=><option key={w} value={w}>{w}</option>)}
            </select></div>
          <div className="fgrid3">
            <div className="fg"><label className="flabel">Soni</label><input className="finput" type="number" min="1" value={form.qty} onChange={e=>setForm(p=>({...p,qty:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Kv.m</label><input className="finput" type="number" step="0.1" value={form.sqm} onChange={e=>setForm(p=>({...p,sqm:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)} onOk={async()=>{await crud.remove(delId);setDelId(null)}} title="O'chirish" msg="Bekor qilmoqchimisiz?" danger/>
        <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      </div>
    </ErrorBoundary>
  )

  /* ── DESKTOP ── */
  return (
    <ErrorBoundary>
      <div className="workers-wrap">
        <PH title="👷 Sex Topshiriqlari" sub={`${crud.total} ta topshiriq`}
          actions={<button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setModal('create')}}><MdAdd size={16}/> Yangi topshiriq</button>}
        />
        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Buyurtma, buyum..." value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.worker||''} onChange={e=>crud.setFilter('worker',e.target.value)}>
            <option value="">Barcha ishchilar</option>
            {WORKER_LIST.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
          <select className="fselect" value={crud.filters.status||''} onChange={e=>crud.setFilter('status',e.target.value)}>
            <option value="">Barcha holat</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={modal==='create'?'Yangi topshiriq':'Topshiriq tahrirlash'}
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button><button className="btn btn-primary" onClick={save}>{t.save}</button></>}>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Buyurtma raqami *</label><input className="finput" placeholder="#1042" value={form.order} onChange={set('order')}/></div>
            <div className="fg"><label className="flabel">Buyum *</label><input className="finput" placeholder="Ko'ylak ×3" value={form.item} onChange={set('item')}/></div>
          </div>
          <div className="fg"><label className="flabel">Ishchi *</label>
            <select className="fselect" value={form.worker} onChange={set('worker')}>
              <option value="">Tanlang...</option>
              {WORKER_LIST.map(w=><option key={w} value={w}>{w}</option>)}
            </select></div>
          <div className="fgrid3">
            <div className="fg"><label className="flabel">Soni</label><input className="finput" type="number" min="1" value={form.qty} onChange={e=>setForm(p=>({...p,qty:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Kv.m</label><input className="finput" type="number" step="0.1" value={form.sqm} onChange={e=>setForm(p=>({...p,sqm:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
        </Modal>
        <Confirm open={!!delId} onClose={()=>setDelId(null)} onOk={async()=>{await crud.remove(delId);setDelId(null)}} title="O'chirish" msg="Bekor qilmoqchimisiz?" danger/>
      </div>
    </ErrorBoundary>
  )
}
