import { useState } from 'react'
import { useLang } from '../../i18n/index.jsx'
import { MdAdd, MdEdit, MdDelete, MdFileDownload, MdDirectionsCar, MdPhone, MdContentCopy, MdRefresh } from 'react-icons/md'
import { api } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Drivers.css'

const EMPTY = { name:'', phone:'', car:'', plate:'', status:'faol' }
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'tartibcrmbot'

export default function Drivers() {
  const { t } = useLang()
  const crud = useCRUD(
    { getAll:api.getDrivers, create:api.createDriver, update:api.updateDriver, remove:api.deleteDriver },
    ['name','phone','plate'], 10, 'drivers'
  )
  const [modal,    setModal]    = useState(null)   // 'create' | 'edit'
  const [form,     setForm]     = useState(EMPTY)
  const [delId,    setDelId]    = useState(null)
  const [pinModal, setPinModal] = useState(null)   // { name, pin, botUrl }
  const [pinLoad,  setPinLoad]  = useState(null)   // id of driver being pinned
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // ── Saqlash ──
  async function save() {
    if (!form.name || !form.phone) { toast('Ism va telefon majburiy!', 'err'); return }
    if (modal === 'create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  // ── PIN generatsiya — bosilganda chaqiriladi ──
  async function generatePin(row, e) {
    e?.stopPropagation()
    setPinLoad(row._id)
    try {
      const r = await api.generatePinDrv(row._id)
      setPinModal({
        name:   r.name,
        pin:    r.pin,
        botUrl: `https://t.me/${BOT_USERNAME}`,
      })
    } catch (err) {
      toast(err.message || 'PIN yaratishda xato', 'err')
    } finally {
      setPinLoad(null)
    }
  }

  // ── Nusxa olish ──
  function copyPin(pin) {
    navigator.clipboard?.writeText(pin).catch(() => {})
    toast('📋 PIN nusxa olindi!', 'ok')
  }

  const faol = crud.data.filter(d => d.status === 'faol').length
  const band = crud.data.filter(d => d.status === 'band').length
  const dam  = crud.data.filter(d => d.status === 'dam').length
  const tgOk = crud.data.filter(d => d.tgChatId).length

  const COLS = [
    { k:'name', l:'Shafyor', r:(v,r) => (
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <div className="driver-avatar"><MdDirectionsCar size={16}/></div>
        <div>
          <div style={{fontWeight:600}}>{v}</div>
          <div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:3}}>
            <MdPhone size={11}/>{r.phone}
          </div>
        </div>
      </div>
    )},
    { k:'car',    l:'Mashina' },
    { k:'plate',  l:'Raqam',  r:v => <span className="plate-badge">{v}</span> },
    { k:'status', l:'Holat',  r:v => <Sbadge s={v}/> },
    { k:'tgChatId', l:'TG Bot', r:(v,row) => v
      ? <span style={{color:'var(--green)',fontSize:11,fontWeight:700}}>✅ Ulangan</span>
      : <span style={{color:'var(--text3)',fontSize:11}}>— Ulanmagan</span>
    },
    { k:'pin', l:'PIN', r:(v,row) => v
      ? <span style={{
          fontFamily:'monospace', fontWeight:800, fontSize:13,
          color:'var(--purple)', letterSpacing:2,
          background:'rgba(139,92,246,.1)', padding:'2px 8px', borderRadius:6,
        }}>{v}</span>
      : <span style={{color:'var(--text3)',fontSize:11}}>—</span>
    },
    { k:'_a', l:'', r:(_,row) => (
      <div className="row-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm"
          onClick={() => { setForm({...row}); setModal('edit') }}>
          <MdEdit size={15}/>
        </button>

        {/* PIN tugmasi — asosiy action */}
        <button
          className="btn btn-ghost btn-sm"
          style={{
            fontSize:11, fontWeight:700,
            color: row.pin ? 'var(--purple)' : 'var(--amber)',
            borderColor: row.pin ? 'rgba(139,92,246,.3)' : 'rgba(245,158,11,.3)',
            background: row.pin ? 'rgba(139,92,246,.08)' : 'rgba(245,158,11,.08)',
            minWidth:60,
          }}
          disabled={pinLoad === row._id}
          onClick={e => generatePin(row, e)}
        >
          {pinLoad === row._id ? '...' : row.pin ? '🔄 PIN' : '🔑 PIN'}
        </button>

        <button className="btn btn-ghost btn-icon btn-sm"
          style={{color:'var(--red)'}}
          onClick={() => setDelId(row._id)}>
          <MdDelete size={15}/>
        </button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      <div className="drivers-wrap">
        <PH title="🚗 Shafyorlar" sub={`${crud.data.length} ta shafyor`}
          actions={<>
            <ExportBtn data={crud.filtered} name="shafyorlar"/>
            <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('create') }}>
              <MdAdd size={16}/> Yangi shafyor
            </button>
          </>}
        />

        {/* KPI */}
        <div className="kpi-grid" style={{marginBottom:16}}>
          {[
            { lbl:'Faol',      val:faol, c:'var(--green)',  bg:'var(--greenbg)' },
            { lbl:'Band',      val:band, c:'var(--orange)', bg:'var(--orangebg)' },
            { lbl:'Dam',       val:dam,  c:'var(--text2)',  bg:'var(--bg4)' },
            { lbl:'TG ulangan',val:tgOk, c:'#229ED9',      bg:'rgba(34,158,217,.12)' },
          ].map(s => (
            <div key={s.lbl} className="kpi-card">
              <div className="kpi-hd">
                <div className="kpi-icon" style={{background:s.bg}}>
                  <MdDirectionsCar size={18} style={{color:s.c}}/>
                </div>
              </div>
              <div className="kpi-val" style={{color:s.c,fontSize:22}}>{s.val}</div>
              <div className="kpi-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Ism, telefon, raqam..."
            value={crud.search} onChange={e => crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.status||''} onChange={e => crud.setFilter('status', e.target.value)}>
            <option value="">Barcha holat</option>
            <option value="faol">Faol</option>
            <option value="band">Band</option>
            <option value="dam">Dam</option>
          </select>
        </div>

        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>

        {/* ── Create/Edit Modal ── */}
        <Modal open={modal==='create'||modal==='edit'} onClose={() => setModal(null)}
          title={modal==='create' ? 'Yangi shafyor' : 'Shafyor tahrirlash'}
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
            <div className="fg"><label className="flabel">Mashina rusumi</label>
              <input className="finput" placeholder="Chevrolet Cobalt" value={form.car||''} onChange={set('car')}/></div>
            <div className="fg"><label className="flabel">Davlat raqami</label>
              <input className="finput" placeholder="01 A 123 BC" value={form.plate||''} onChange={set('plate')}/></div>
          </div>
          <div className="fg"><label className="flabel">Holat</label>
            <select className="fselect" value={form.status||'faol'} onChange={set('status')}>
              <option value="faol">Faol</option>
              <option value="band">Band</option>
              <option value="dam">Dam olmoqda</option>
            </select>
          </div>

          {/* Yangi shafyor yaratilganda PIN eslatmasi */}
          {modal === 'create' && (
            <div style={{
              marginTop:12, padding:'10px 14px',
              background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)',
              borderRadius:'var(--r)', fontSize:12, color:'var(--amber)', lineHeight:1.5,
            }}>
              💡 Shafyor yaratilgandan keyin <b>🔑 PIN</b> tugmasini bosib,
              unga 4 xonali PIN bering. Shafyor shu PIN bilan
              Telegram botga kiradi.
            </div>
          )}
        </Modal>

        {/* ── PIN Modal ── */}
        <Modal open={!!pinModal} onClose={() => setPinModal(null)}
          title="🔑 Telegram Bot PIN"
          footer={<button className="btn btn-ghost" onClick={() => setPinModal(null)}>{t.close||'Yopish'}</button>}
          size="sm"
        >
          {pinModal && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>

              {/* Shafyor ismi */}
              <div style={{fontSize:14,color:'var(--text2)'}}>
                <b style={{color:'var(--text)'}}>{pinModal.name}</b> uchun yangi PIN yaratildi
              </div>

              {/* PIN ko'rsatish */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'rgba(139,92,246,.1)', border:'2px solid rgba(139,92,246,.3)',
                borderRadius:14, padding:'16px 20px',
              }}>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:700,letterSpacing:.5}}>PIN KOD</div>
                  <div style={{
                    fontSize:40, fontWeight:900, fontFamily:'monospace',
                    color:'var(--purple)', letterSpacing:8,
                  }}>
                    {pinModal.pin}
                  </div>
                </div>
                <button className="btn btn-primary" style={{flexShrink:0}}
                  onClick={() => copyPin(pinModal.pin)}>
                  <MdContentCopy size={16}/> Nusxa
                </button>
              </div>

              {/* Ko'rsatmalar */}
              <div style={{
                background:'var(--bg2)', border:'1px solid var(--border)',
                borderRadius:12, padding:'12px 14px',
                display:'flex', flexDirection:'column', gap:8,
              }}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:2}}>
                  📋 Shafyorga qanday aytish kerak:
                </div>
                {[
                  `1. Telegram'da @${BOT_USERNAME} ni oching`,
                  `2. /start yuboring`,
                  `3. PIN: ${pinModal.pin} ni kiriting`,
                  `4. Tayyor — bot ishlaydi! 🚗`,
                ].map((s,i) => (
                  <div key={i} style={{fontSize:12,color:'var(--text)',lineHeight:1.5}}>{s}</div>
                ))}
              </div>

              {/* Bot havolasi */}
              <a href={pinModal.botUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary"
                style={{textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
                ✈️ Botni ochish — @{BOT_USERNAME}
              </a>

              {/* Eslatma */}
              <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',lineHeight:1.5}}>
                ⚠️ PIN bir martalik emas — shafyor har doim shu PIN bilan kiradi.<br/>
                Yangi PIN berilsa, eski ulanish uziladi.
              </div>
            </div>
          )}
        </Modal>

        {/* Delete confirm */}
        <Confirm open={!!delId} onClose={() => setDelId(null)}
          text="Shafyorni o'chirishni tasdiqlaysizmi?"
          onOk={async () => { await crud.remove(delId); setDelId(null) }}
        />
      </div>
    </ErrorBoundary>
  )
}
