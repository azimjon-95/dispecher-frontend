import { useState } from 'react'
import { useLang } from '../../i18n/index.jsx'
import { MdAdd, MdEdit, MdDelete, MdFileDownload, MdDirectionsCar, MdPhone, MdLink, MdContentCopy } from 'react-icons/md'
import { api } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Drivers.css'

const EMPTY = { name:'', phone:'', car:'', plate:'', status:'faol' }

export default function Drivers() {
  const { t } = useLang()
  const crud = useCRUD(
    { getAll:api.getDrivers, create:api.createDriver, update:api.updateDriver, remove:api.deleteDriver },
    ['name','phone','plate']
  )
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [delId,     setDelId]     = useState(null)
  const [linkModal, setLinkModal] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function save() {
    if (!form.name || !form.phone) { toast('Ism va telefon majburiy!','err'); return }
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  function showBotLink(row) {
  const { t } = useLang()
    const phone = row.phone.replace('+','')
    const link  = `https://t.me/DispecherBot?start=driver_${phone}`
    setLinkModal({ name:row.name, link, registered:!!row.tgChatId })
  }

  const faol = crud.data.filter(d=>d.status==='faol').length
  const band = crud.data.filter(d=>d.status==='band').length
  const dam  = crud.data.filter(d=>d.status==='dam').length
  const tgOk = crud.data.filter(d=>d.tgChatId).length

  const COLS = [
    { k:'name',   l:'Shafyor', r:(v,r) => (
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
    { k:'car',      l:'Mashina' },
    { k:'plate',    l:'Raqam',      r:v=><span className="plate-badge">{v}</span> },
    { k:'status',   l:'Holat',      r:v=><Sbadge s={v}/> },
    { k:'trips',    l:'Sayohatlar', r:v=><span className="mono" style={{color:'var(--accent)'}}>{v} ta</span> },
    { k:'tgChatId', l:'TG Bot',     r:(v,row)=> v
      ? <span style={{color:'var(--green)',fontSize:11}}>✅ Ulangan</span>
      : <button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'#229ED9',borderColor:'#229ED9'}}
          onClick={e=>{e.stopPropagation();showBotLink(row)}}>
          <MdLink size={13}/> Havola
        </button>
    },
    { k:'_a', l:'', r:(_,row) => (
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setModal('edit')}}>
          <MdEdit size={15}/>
        </button>
        <button className="btn btn-ghost btn-sm" style={{fontSize:11,color:'var(--purple)'}}
          onClick={async e=>{e.stopPropagation();try{const r=await api.generatePinDrv(row._id);toast(`📌 ${r.name} PIN: ${r.pin}`,'ok')}catch(e2){toast(e2.message,'err')}}}>
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
      <div className="drivers-wrap">
        <PH title="🚗 Shafyorlar" sub={`${crud.data.length} ta shafyor`}
          actions={<>
            <ExportBtn data={crud.filtered} name="shafyorlar"/>
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setModal('create')}}>
              <MdAdd size={16}/> Yangi shafyor
            </button>
          </>}
        />

        {/* Stats */}
        <div className="kpi-grid" style={{marginBottom:16}}>
          {[
            {lbl:t.active||'Faol',      val:faol,  c:'var(--green)',  bg:'var(--greenbg)'},
            {lbl:'Band',      val:band,  c:'var(--orange)', bg:'var(--orangebg)'},
            {lbl:'Dam',       val:dam,   c:'var(--text2)',  bg:'var(--bg4)'},
            {lbl:'TG ulangan',val:tgOk, c:'#229ED9',       bg:'rgba(34,158,217,.12)'},
          ].map(s=>(
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
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.status||''} onChange={e=>crud.setFilter('status',e.target.value)}>
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

        {/* Create/Edit Modal */}
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={modal==='create'?'Yangi shafyor':'Shafyor tahrirlash'}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={save}>{t.save}</button>
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
              <input className="finput" placeholder="Chevrolet Cobalt" value={form.car} onChange={set('car')}/></div>
            <div className="fg"><label className="flabel">Davlat raqami</label>
              <input className="finput" placeholder="01 A 123 BC" value={form.plate} onChange={set('plate')}/></div>
          </div>
          <div className="fg"><label className="flabel">Holat</label>
            <select className="fselect" value={form.status} onChange={set('status')}>
              <option value="faol">Faol</option>
              <option value="band">Band</option>
              <option value="dam">Dam olmoqda</option>
            </select>
          </div>
        </Modal>

        {/* TG Link Modal */}
        <Modal open={!!linkModal} onClose={()=>setLinkModal(null)} title="🤖 Telegram Bot Havolasi" size="sm"
          footer={<button className="btn btn-ghost" onClick={()=>setLinkModal(null)}>{t.close}</button>}
        >
          {linkModal && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{fontSize:14,color:'var(--text2)'}}>
                <strong style={{color:'var(--text)'}}>{linkModal.name}</strong> uchun bot havolasi:
              </div>
              {linkModal.registered
                ? <div style={{padding:'10px 14px',background:'var(--greenbg)',border:'1px solid rgba(63,185,80,.2)',borderRadius:'var(--r)',color:'var(--green)',fontWeight:600}}>
                    ✅ Shafyor allaqachon botga ulangan
                  </div>
                : <>
                    <div style={{padding:'12px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',fontFamily:'monospace',fontSize:11,wordBreak:'break-all',userSelect:'all'}}>
                      {linkModal.link}
                    </div>
                    <div style={{fontSize:12,color:'var(--text2)'}}>
                      Bu havolani shafyorga yuboring. U Telegram'da bosib, botga ulanadi.
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <a href={linkModal.link} target="_blank" rel="noopener noreferrer"
                        style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 14px',background:'#229ED9',color:'#fff',borderRadius:'var(--r)',fontWeight:700,textDecoration:'none'}}>
                        🤖 Botga o'tish
                      </a>
                      <button className="btn btn-ghost" onClick={()=>{navigator.clipboard?.writeText(linkModal.link);toast('Nusxa olindi ✅','ok')}}>
                        <MdContentCopy size={16}/>
                      </button>
                    </div>
                  </>
              }
            </div>
          )}
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}}
          title="Shafyorni o'chirish" msg="Bu shafyorni o'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
