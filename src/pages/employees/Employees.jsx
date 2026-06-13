import { useState, useRef, useEffect } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdRefresh,
  MdPhone, MdCall, MdFileDownload
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import Drivers from '../drivers/Drivers.jsx'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Employees.css'

/* TG SVG */
function TgLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:13,height:13,flexShrink:0}}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/>
    </svg>
  )
}

/* Phone popover component */
function PhonePopover({ phone, name }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  if (!phone) return null
  const clean = phone.replace(/\D/g,'')
  return (
    <div ref={ref} style={{position:'relative',display:'inline-flex',alignItems:'center'}}>
      <button
        onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}
        style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 6px',borderRadius:4,background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontSize:11,color:'var(--text2)',fontFamily:'inherit',fontWeight:600}}
        title="Telefon qilish"
      >
        <MdPhone size={11}/> {phone}
      </button>
      {open && (
        <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:'100%',left:0,marginTop:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',boxShadow:'0 8px 24px rgba(0,0,0,.35)',minWidth:200,zIndex:9999,overflow:'hidden',animation:'slideUp 120ms both'}}>
          <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)',fontSize:12,fontWeight:700}}>{name}</div>
          <a href={`tel:${phone}`} onClick={()=>setOpen(false)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',textDecoration:'none',color:'var(--text)',borderBottom:'1px solid var(--border)'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{width:28,height:28,borderRadius:8,background:'var(--greenbg)',border:'1px solid rgba(63,185,80,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MdCall size={14} style={{color:'var(--green)'}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>Telefon qo'ng'irog'i</div>
              <div style={{fontSize:10,color:'var(--text2)'}}>Oddiy chaqiruv</div>
            </div>
          </a>
          <a href={`https://t.me/+${clean}`} target="_blank" rel="noopener noreferrer" onClick={()=>setOpen(false)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',textDecoration:'none',color:'var(--text)'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{width:28,height:28,borderRadius:8,background:'rgba(34,158,217,.15)',border:'1px solid rgba(34,158,217,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <TgLogo/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>Telegram orqali</div>
              <div style={{fontSize:10,color:'var(--text2)'}}>TG da chaqiruv yoki xabar</div>
            </div>
          </a>
        </div>
      )}
    </div>
  )
}

const ROLES    = ['Dispecher','Shafyor','Ishchi','Buxgalter','Menejer','Xavfsizlik hodimi','Farrosh','Elektrik','Texnik']
const SECTIONS = ['yuvish','quritish','bezak','hammasi']
const SALARY_TYPES = ['Oylik','Kunlik','Ish bayi']
const EMPTY = { name:'', phone:'', role:'Ishchi', section:'hammasi', pin:'', status:'active', salary:'', salaryType:'Oylik', dailyRate:'', perItemRate:'' }

/* Calculate monthly earnings based on salary type */
function calcExpected(emp) {
  if (!emp) return 0
  if (emp.salaryType === 'Oylik')    return emp.salary || 0
  if (emp.salaryType === 'Kunlik')   return (emp.dailyRate || 0) * 26  // 26 ish kuni
  if (emp.salaryType === 'Ish bayi') return emp.balance || 0
  return emp.salary || 0
}

export default function Employees() {
  const [tab, setTab] = useState('employees') // 'employees' | 'drivers'

  if (tab === 'drivers') return (
    <div>
      <div style={{display:'flex',gap:6,padding:'0 0 16px',borderBottom:'1px solid var(--border)',marginBottom:16}}>
        {[
          {key:'employees', label:'👷 Xodimlar'},
          {key:'drivers',   label:'🚗 Shafyorlar'},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`btn btn-sm ${tab===t.key?'btn-primary':'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <Drivers/>
    </div>
  )

  const crud = useCRUD(
    { getAll:api.getEmployees, create:api.createEmployee, update:api.updateEmployee, remove:api.deleteEmployee },
    ['name','phone']
  )
  const [modal, setModal] = useState(null)
  const [form,  setForm]  = useState(EMPTY)
  const [delId, setDelId] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  function resetPin() {
    const pin = String(Math.floor(1000 + Math.random() * 9000))
    setForm(p => ({ ...p, pin }))
    toast(`Yangi PIN: ${pin}`, 'inf')
  }

  async function save() {
    if (!form.name || !form.phone) { toast('Ism va telefon majburiy!','err'); return }
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  const COLS = [
    { k:'name', l:'Xodim', r:(v,r) => (
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <div className="emp-avatar">{v?.[0]?.toUpperCase()}</div>
        <div>
          <div style={{fontWeight:600}}>{v}</div>
          <PhonePopover phone={r.phone} name={v}/>
        </div>
      </div>
    )},
    { k:'role',       l:'Rol',         r:v=><span className="badge b-blue">{v}</span> },
    { k:'section',    l:"Bo'lim",      r:v=><span style={{fontSize:11,color:'var(--text2)',textTransform:'capitalize'}}>{v||'—'}</span> },
    { k:'salaryType', l:'Maosh turi',  r:v=>{
      const color = v==='Oylik'?'var(--accent)':v==='Kunlik'?'var(--yellow)':'var(--green)'
      return <span className="badge" style={{background:color+'22',color}}>{v||'Oylik'}</span>
    }},
    { k:'salary',     l:'Bazaviy',     r:(v,r)=>{
      if (r.salaryType==='Kunlik') return <span className="mono" style={{fontSize:11}}>{fmt.currency(r.dailyRate||0)}/kun</span>
      if (r.salaryType==='Ish bayi') return <span className="mono" style={{color:'var(--text3)',fontSize:11}}>Hajmdan</span>
      return <span className="mono">{fmt.currency(v)}</span>
    }},
    { k:'balance',    l:"To'plangan",  r:v=>(
      <span className="mono" style={{color:v>0?'var(--green)':'var(--text3)',fontWeight:700}}>{fmt.currency(v||0)}</span>
    )},
    { k:'tgChatId',   l:'TG Bot',      r:(v,row)=> v
      ? <span style={{color:'var(--green)',fontSize:11}}>✅ Ulangan</span>
      : row.role==='Ishchi'
        ? <button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'#229ED9',borderColor:'#229ED9'}}
            onClick={e=>{e.stopPropagation();const p=row.phone.replace('+','');window.open(`https://t.me/DispecherBot?start=worker_${p}`,'_blank')}}>
            🔗 Havola
          </button>
        : <span style={{color:'var(--text3)',fontSize:11}}>—</span>
    },
    { k:'status',     l:'Holat',       r:v=><Sbadge s={v}/> },
    { k:'_a', l:'', r:(_,row) => (
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row,salaryType:row.salaryType||'Oylik'});setModal('edit')}}>
          <MdEdit size={15}/>
        </button>
        <button className="btn btn-ghost btn-sm" style={{fontSize:11,color:'var(--purple)'}}
          onClick={async e=>{e.stopPropagation();try{const r=await api.generatePinEmp(row._id);toast(`📌 ${r.name} PIN: ${r.pin}`,'ok')}catch(e2){toast(e2.message,'err')}}}>
          🔑 PIN
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}>
          <MdDelete size={15}/>
        </button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[
          {key:'employees', label:'👷 Xodimlar'},
          {key:'drivers',   label:'🚗 Shafyorlar'},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`btn btn-sm ${tab===t.key?'btn-primary':'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="employees-wrap">
        <PH title="👥 Xodimlar" sub={`${crud.total} ta xodim`}
          actions={<>
            <ExportBtn data={crud.filtered} name="xodimlar"/>
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setModal('create')}}>
              <MdAdd size={16}/> Yangi xodim
            </button>
          </>}
        />

        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Ism yoki telefon..."
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.role||''} onChange={e=>crud.setFilter('role',e.target.value)}>
            <option value="">Barcha rol</option>
            {ROLES.map(r=><option key={r}>{r}</option>)}
          </select>
          <select className="fselect" value={crud.filters.status||''} onChange={e=>crud.setFilter('status',e.target.value)}>
            <option value="">Barcha holat</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </select>
          <select className="fselect" value={crud.filters.section||''} onChange={e=>crud.setFilter('section',e.target.value)}>
            <option value="">Barcha bo'lim</option>
            {SECTIONS.map(s=><option key={s}>{s}</option>)}
          </select>
          <select className="fselect" value={crud.filters.salaryType||''} onChange={e=>crud.setFilter('salaryType',e.target.value)}>
            <option value="">Barcha maosh</option>
            {SALARY_TYPES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>

        {/* Create / Edit Modal */}
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={modal==='create'?'Yangi xodim':'Xodim tahrirlash'}
          size="lg"
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>Bekor</button>
            <button className="btn btn-primary" onClick={save}>Saqlash</button>
          </>}
        >
          <div className="fgrid2">
            <div className="fg"><label className="flabel">To'liq ism *</label>
              <input className="finput" value={form.name} onChange={set('name')}/></div>
            <div className="fg"><label className="flabel">Telefon *</label>
              <input className="finput" placeholder="+998 90 000 00 00" value={form.phone} onChange={set('phone')}/></div>
          </div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Rol</label>
              <select className="fselect" value={form.role} onChange={set('role')}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select></div>
            <div className="fg"><label className="flabel">Bo'lim</label>
              <select className="fselect" value={form.section||'hammasi'} onChange={set('section')}>
                {SECTIONS.map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>

          {/* Salary type */}
          <div style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:'var(--r)',border:'1px solid var(--border)',marginBottom:4}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',marginBottom:8}}>💰 MAOSH TURI</div>
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              {SALARY_TYPES.map(t => (
                <button key={t} type="button"
                  className={`btn btn-sm ${form.salaryType===t?'btn-primary':'btn-ghost'}`}
                  onClick={()=>setForm(p=>({...p,salaryType:t}))}
                >{t}</button>
              ))}
            </div>
            {form.salaryType==='Oylik' && (
              <div className="fg"><label className="flabel">Oylik maosh (so'm)</label>
                <input className="finput" type="number" value={form.salary||''} onChange={e=>setForm(p=>({...p,salary:+e.target.value}))}/></div>
            )}
            {form.salaryType==='Kunlik' && (
              <div className="fgrid2">
                <div className="fg"><label className="flabel">Kunlik stavka (so'm)</label>
                  <input className="finput" type="number" value={form.dailyRate||''} onChange={e=>setForm(p=>({...p,dailyRate:+e.target.value}))}/></div>
                <div className="fg"><label className="flabel">Taxminiy oylik (26 kun)</label>
                  <div className="finput" style={{background:'var(--bg4)',color:'var(--green)',fontWeight:700,fontFamily:'monospace'}}>
                    {fmt.currency((form.dailyRate||0)*26)}
                  </div>
                </div>
              </div>
            )}
            {form.salaryType==='Ish bayi' && (
              <div className="fg"><label className="flabel">1 buyum narxi (so'm) — asosiy stavka</label>
                <input className="finput" type="number" value={form.perItemRate||''} onChange={e=>setForm(p=>({...p,perItemRate:+e.target.value}))}/></div>
            )}
          </div>

          <div className="fgrid2">
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select></div>
            <div className="fg"><label className="flabel">PIN kod</label>
              <div style={{display:'flex',gap:6}}>
                <input className="finput" maxLength={4} value={form.pin||''} onChange={set('pin')} placeholder="4 raqam"/>
                <button className="btn btn-ghost btn-sm" type="button" onClick={resetPin}>
                  <MdRefresh size={14}/>
                </button>
              </div>
            </div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}}
          title="Xodimni o'chirish" msg="Bu xodimni o'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
