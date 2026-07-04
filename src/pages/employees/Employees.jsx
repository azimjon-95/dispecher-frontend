import { useState, useRef, useEffect } from 'react'
import { MdAdd, MdEdit, MdDelete, MdPhone, MdCall, MdContentCopy } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import Drivers from '../drivers/Drivers.jsx'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Employees.css'
import { useLang } from '../../i18n/index.jsx'

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'tartibcrmbot'
const ROLES        = ['Dispecher','Shafyor','Ishchi','Buxgalter','Menejer','Xavfsizlik hodimi','Farrosh','Elektrik','Texnik']
const SECTIONS     = ['yuvish','quritish','bezak','hammasi']
const SALARY_TYPES = ['Oylik','Kunlik','Ish bayi']
const EMPTY        = { name:'', phone:'', role:'Ishchi', section:'hammasi', status:'active', salary:'', salaryType:'Oylik', dailyRate:'', perItemRate:'' }

/* ── Telegram SVG icon ── */
function TgLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:13,height:13,flexShrink:0}}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/>
    </svg>
  )
}

/* ── Telefon popover ── */
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
      <button onClick={e=>{e.stopPropagation();setOpen(v=>!v)}}
        style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 6px',borderRadius:4,background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontSize:11,color:'var(--text2)',fontFamily:'inherit',fontWeight:600}}>
        <MdPhone size={11}/> {phone}
      </button>
      {open && (
        <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:'100%',left:0,marginTop:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',boxShadow:'0 8px 24px rgba(0,0,0,.35)',minWidth:200,zIndex:9999,overflow:'hidden'}}>
          <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)',fontSize:12,fontWeight:700}}>{name}</div>
          <a href={`tel:${phone}`} onClick={()=>setOpen(false)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',textDecoration:'none',color:'var(--text)',borderBottom:'1px solid var(--border)'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{width:28,height:28,borderRadius:8,background:'var(--greenbg)',border:'1px solid rgba(63,185,80,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MdCall size={14} style={{color:'var(--green)'}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>Telefon qo'ng'irog'i</div>
              <div style={{fontSize:10,color:'var(--text2)'}}>Oddiy chaqiruv</div>
            </div>
          </a>
          <a href={`https://t.me/+${clean}`} target="_blank" rel="noopener noreferrer" onClick={()=>setOpen(false)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',textDecoration:'none',color:'var(--text)'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{width:28,height:28,borderRadius:8,background:'rgba(34,158,217,.15)',border:'1px solid rgba(34,158,217,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <TgLogo/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>Telegram orqali</div>
              <div style={{fontSize:10,color:'var(--text2)'}}>TG da xabar yoki chaqiruv</div>
            </div>
          </a>
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */
export default function Employees() {
  const { t } = useLang()
  const [tab, setTab] = useState('employees')

  const crud = useCRUD(
    { getAll:api.getEmployees, create:api.createEmployee, update:api.updateEmployee, remove:api.deleteEmployee },
    ['name','phone'], 10, 'employees'
  )

  const [modal,    setModal]    = useState(null)        // 'create' | 'edit'
  const [form,     setForm]     = useState(EMPTY)
  const [delId,    setDelId]    = useState(null)
  const [pinModal, setPinModal] = useState(null)        // { name, pin, botUrl }
  const [pinLoad,  setPinLoad]  = useState(null)        // id yuklanayotgan

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  /* ── Saqlash ── */
  async function save() {
    if (!form.name || !form.phone) { toast('Ism va telefon majburiy!','err'); return }
    if (modal === 'create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  /* ── PIN generatsiya — server dan ── */
  async function generatePin(row, e) {
    e?.stopPropagation()
    setPinLoad(row._id)
    try {
      const r = await api.generatePinEmp(row._id)
      setPinModal({ name: r.name, pin: r.pin, botUrl: `https://t.me/${BOT_USERNAME}` })
      crud.reload()
    } catch (err) {
      toast(err.message || 'PIN yaratishda xato', 'err')
    } finally {
      setPinLoad(null)
    }
  }

  /* ── PIN nusxa olish ── */
  function copyPin(pin) {
    navigator.clipboard?.writeText(pin).catch(() => {})
    toast('📋 PIN nusxa olindi!', 'ok')
  }

  /* ── Jadval ustunlari ── */
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
    { k:'role',       l:'Rol',        r:v=><span className="badge b-blue">{v}</span> },
    { k:'section',    l:"Bo'lim",     r:v=><span style={{fontSize:11,color:'var(--text2)',textTransform:'capitalize'}}>{v||'—'}</span> },
    { k:'salaryType', l:'Maosh turi', r:v=>{
      const c = v==='Oylik'?'var(--accent)':v==='Kunlik'?'var(--yellow)':'var(--green)'
      return <span className="badge" style={{background:c+'22',color:c}}>{v||'Oylik'}</span>
    }},
    { k:'balance', l:"To'plangan", r:v=>(
      <span className="mono" style={{color:v>0?'var(--green)':'var(--text3)',fontWeight:700}}>{fmt.currency(v||0)}</span>
    )},
    { k:'pin', l:'PIN', r:v => v
      ? <span style={{fontFamily:'monospace',fontWeight:800,fontSize:13,color:'var(--purple)',letterSpacing:2,background:'rgba(139,92,246,.1)',padding:'2px 8px',borderRadius:6}}>{v}</span>
      : <span style={{color:'var(--text3)',fontSize:11}}>—</span>
    },
    { k:'tgChatId', l:'TG Bot', r:v => v
      ? <span style={{color:'var(--green)',fontSize:11,fontWeight:700}}>✅ Ulangan</span>
      : <span style={{color:'var(--text3)',fontSize:11}}>— Ulanmagan</span>
    },
    { k:'status', l:'Holat', r:v=><Sbadge s={v}/> },
    { k:'_a', l:'', r:(_,row) => (
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm"
          onClick={() => { setForm({...row, salaryType:row.salaryType||'Oylik'}); setModal('edit') }}>
          <MdEdit size={15}/>
        </button>

        {/* PIN tugmasi */}
        <button className="btn btn-ghost btn-sm"
          style={{
            fontSize:11, fontWeight:700, minWidth:60,
            color:           row.pin ? 'var(--purple)' : 'var(--amber)',
            borderColor:     row.pin ? 'rgba(139,92,246,.3)' : 'rgba(245,158,11,.3)',
            background:      row.pin ? 'rgba(139,92,246,.08)' : 'rgba(245,158,11,.08)',
          }}
          disabled={pinLoad === row._id}
          onClick={e => generatePin(row, e)}
        >
          {pinLoad === row._id ? '...' : row.pin ? '🔄 PIN' : '🔑 PIN'}
        </button>

        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}}
          onClick={() => setDelId(row._id)}>
          <MdDelete size={15}/>
        </button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      {/* Tab tugmalari */}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[
          { key:'employees', label:'👷 Xodimlar' },
          { key:'drivers',   label:'🚗 Shafyorlar' },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`btn btn-sm ${tab===tb.key ? 'btn-primary' : 'btn-ghost'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Shafyorlar tab */}
      {tab === 'drivers' && <Drivers/>}

      {/* Xodimlar tab */}
      {tab === 'employees' && (
        <div className="employees-wrap">
          <PH title="👥 Xodimlar" sub={`${crud.total} ta xodim`}
            actions={<>
              <ExportBtn data={crud.filtered} name="xodimlar"/>
              <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('create') }}>
                <MdAdd size={16}/> Yangi xodim
              </button>
            </>}
          />

          {/* Filter bar */}
          <div className="fbar">
            <input className="finput fsearch" placeholder="🔍 Ism yoki telefon..."
              value={crud.search} onChange={e => crud.onSearch(e.target.value)}/>
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
          </div>

          {/* Jadval */}
          <div className="card" style={{padding:0}}>
            <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
            <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
          </div>

          {/* ── Yaratish / Tahrirlash Modali ── */}
          <Modal open={modal==='create'||modal==='edit'} onClose={() => setModal(null)}
            title={modal==='create' ? 'Yangi xodim' : 'Xodim tahrirlash'}
            size="lg"
            footer={<>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t.cancel||'Bekor'}</button>
              <button className="btn btn-primary" onClick={save}>{t.save||'Saqlash'}</button>
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
                <select className="fselect" value={form.role||'Ishchi'} onChange={set('role')}>
                  {ROLES.map(r=><option key={r}>{r}</option>)}
                </select></div>
              <div className="fg"><label className="flabel">Bo'lim</label>
                <select className="fselect" value={form.section||'hammasi'} onChange={set('section')}>
                  {SECTIONS.map(s=><option key={s}>{s}</option>)}
                </select></div>
            </div>

            {/* Maosh turi */}
            <div style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:'var(--r)',border:'1px solid var(--border)',marginBottom:4}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',marginBottom:8}}>💰 MAOSH TURI</div>
              <div style={{display:'flex',gap:6,marginBottom:10}}>
                {SALARY_TYPES.map(st => (
                  <button key={st} type="button"
                    className={`btn btn-sm ${form.salaryType===st?'btn-primary':'btn-ghost'}`}
                    onClick={() => setForm(p=>({...p,salaryType:st}))}>{st}
                  </button>
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
                <div className="fg"><label className="flabel">1 buyum narxi (so'm)</label>
                  <input className="finput" type="number" value={form.perItemRate||''} onChange={e=>setForm(p=>({...p,perItemRate:+e.target.value}))}/></div>
              )}
            </div>

            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status||'active'} onChange={set('status')}>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
            </div>

            {/* Yangi xodim yaratilganda PIN eslatmasi */}
            {modal === 'create' && (
              <div style={{marginTop:8,padding:'10px 14px',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.25)',borderRadius:'var(--r)',fontSize:12,color:'var(--amber)',lineHeight:1.6}}>
                💡 Xodim yaratilgandan keyin <b>🔑 PIN</b> tugmasini bosing —
                xodim shu PIN bilan <b>@{BOT_USERNAME}</b> botiga kiradi.
              </div>
            )}
          </Modal>

          {/* ── PIN Modal ── */}
          <Modal open={!!pinModal} onClose={() => setPinModal(null)}
            title="🔑 Telegram Bot PIN" size="sm"
            footer={<button className="btn btn-ghost" onClick={() => setPinModal(null)}>{t.close||'Yopish'}</button>}
          >
            {pinModal && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div style={{fontSize:14,color:'var(--text2)'}}>
                  <b style={{color:'var(--text)'}}>{pinModal.name}</b> uchun yangi PIN yaratildi
                </div>

                {/* PIN ko'rsatish */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(139,92,246,.1)',border:'2px solid rgba(139,92,246,.3)',borderRadius:14,padding:'16px 20px'}}>
                  <div>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:700,letterSpacing:.5}}>PIN KOD</div>
                    <div style={{fontSize:40,fontWeight:900,fontFamily:'monospace',color:'var(--purple)',letterSpacing:8}}>
                      {pinModal.pin}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => copyPin(pinModal.pin)}>
                    <MdContentCopy size={15}/> Nusxa
                  </button>
                </div>

                {/* Ko'rsatmalar */}
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:2}}>📋 Xodimga aytish kerak:</div>
                  {[
                    `1. Telegram'da @${BOT_USERNAME} ni oching`,
                    `2. /start yuboring`,
                    `3. PIN: ${pinModal.pin} ni kiriting`,
                    `4. Tayyor — bot ishlaydi! 👷`,
                  ].map((s,i) => (
                    <div key={i} style={{fontSize:12,color:'var(--text)',lineHeight:1.5}}>{s}</div>
                  ))}
                </div>

                {/* Bot havolasi */}
                <a href={pinModal.botUrl} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{textAlign:'center',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  ✈️ Botni ochish — @{BOT_USERNAME}
                </a>

                <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',lineHeight:1.5}}>
                  ⚠️ Yangi PIN berilsa — eski Telegram ulanishi uziladi.
                </div>
              </div>
            )}
          </Modal>

          {/* Delete confirm */}
          <Confirm open={!!delId} onClose={() => setDelId(null)}
            onOk={async () => { await crud.remove(delId); setDelId(null) }}
            title="Xodimni o'chirish" msg="Bu xodimni o'chirishni xohlaysizmi?" danger/>
        </div>
      )}
    </ErrorBoundary>
  )
}
