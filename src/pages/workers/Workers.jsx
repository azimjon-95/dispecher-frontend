import { useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdConstruction, MdPerson } from 'react-icons/md'
import { api } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Workers.css'

const WORKER_LIST = ['Zulfiya Holova','Feruza Nazarova','Komil Tursunov','Dilshod Karimov']
const STATUSES    = ['yangi','jarayonda','tayyor']
const EMPTY       = { order:'', item:'', worker:'', qty:1, sqm:0, status:'yangi' }

export default function Workers() {
  const crud = useCRUD(
    { getAll:api.getWorkers, create:api.createWorker, update:api.updateWorker, remove:api.deleteWorker },
    ['order','item','worker']
  )
  const [modal, setModal] = useState(null)
  const [form,  setForm]  = useState(EMPTY)
  const [delId, setDelId] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function save() {
    if (!form.order || !form.item || !form.worker) { toast('Barcha maydonlarni to\'ldiring!','err'); return }
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  const COLS = [
    { k:'order',  l:'Buyurtma', r:v=><span className="mono" style={{color:'var(--accent)',fontWeight:700}}>{v}</span> },
    { k:'item',   l:'Buyum' },
    { k:'worker', l:'Ishchi', r:v=>(
      <div style={{display:'flex',alignItems:'center',gap:7}}>
        <div className="worker-avatar">{v?.[0]}</div>
        {v}
      </div>
    )},
    { k:'qty',    l:'Soni',  r:v=><span className="mono">{v} ta</span> },
    { k:'sqm',    l:'Kv.m',  r:v=><span className="mono">{v} m²</span> },
    { k:'status', l:'Holat', r:v=><Sbadge s={v}/> },
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setModal('edit')}}>
          <MdEdit size={15}/>
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}>
          <MdDelete size={15}/>
        </button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      <div className="workers-wrap">
        <PH title="👷 Sex Topshiriqlari" sub={`${crud.total} ta topshiriq`}
          actions={
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setModal('create')}}>
              <MdAdd size={16}/> Yangi topshiriq
            </button>
          }
        />

        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Buyurtma, buyum..."
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
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
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>Bekor</button>
            <button className="btn btn-primary" onClick={save}>Saqlash</button>
          </>}
        >
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Buyurtma raqami *</label>
              <input className="finput" placeholder="#1042" value={form.order} onChange={set('order')}/></div>
            <div className="fg"><label className="flabel">Buyum *</label>
              <input className="finput" placeholder="Ko'ylak ×3" value={form.item} onChange={set('item')}/></div>
          </div>
          <div className="fg"><label className="flabel">Ishchi *</label>
            <select className="fselect" value={form.worker} onChange={set('worker')}>
              <option value="">Tanlang...</option>
              {WORKER_LIST.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="fgrid3">
            <div className="fg"><label className="flabel">Soni</label>
              <input className="finput" type="number" min="1" value={form.qty}
                onChange={e=>setForm(p=>({...p,qty:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Kv.m</label>
              <input className="finput" type="number" step="0.1" value={form.sqm}
                onChange={e=>setForm(p=>({...p,sqm:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}}
          title="Topshiriqni bekor qilish" msg="Bekor qilmoqchimisiz?" danger/>
      </div>
    </ErrorBoundary>
  )
}
