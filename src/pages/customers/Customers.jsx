import { useState } from 'react'
import { MdAdd,MdEdit,MdDelete,MdFileDownload,MdPerson,MdPhone,MdDiscount,MdVisibility } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Customers.css'

const EMPTY = { name:'', phone:'', address:'', discount:0, status:'active' }

export default function Customers() {
  const crud = useCRUD(
    { getAll:api.getCustomers, create:api.createCustomer, update:api.updateCustomer, remove:api.deleteCustomer },
    ['name','phone','address']
  )
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [delId,    setDelId]    = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function save() {
    if (!form.name || !form.phone) { toast('Ism va telefon majburiy!','err'); return }
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  const COLS = [
    { k:'name', l:'Mijoz', r:(v,r) => (
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <div className="cust-avatar">{v?.[0]?.toUpperCase()}</div>
        <div>
          <div style={{fontWeight:600}}>{v}</div>
          <div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:3}}>
            <MdPhone size={11}/>{r.phone}
          </div>
        </div>
      </div>
    )},
    { k:'address',    l:'Manzil' },
    { k:'orders',     l:'Buyurtmalar', r:v=><span className="mono" style={{color:'var(--accent)'}}>{v||0} ta</span> },
    { k:'totalSpent', l:'Jami xarid',  r:v=><span className="mono" style={{fontWeight:700}}>{fmt.currency(v)}</span> },
    { k:'discount',   l:'Chegirma',    r:v=>v>0
      ? <span className="badge b-green"><MdDiscount size={11}/> {v}%</span>
      : <span style={{color:'var(--text3)'}}>—</span>
    },
    { k:'status', l:'Holat', r:v=><Sbadge s={v}/> },
    { k:'_a', l:'', r:(_,row) => (
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setViewItem(row)} title="Ko'rish">
          <MdVisibility size={15}/>
        </button>
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
      <div className="customers-wrap">
        <PH title="👤 Mijozlar" sub={`${crud.total} ta mijoz`}
          actions={<>
            <ExportBtn data={crud.filtered} name="mijozlar"/>
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setModal('create')}}>
              <MdAdd size={16}/> Yangi mijoz
            </button>
          </>}
        />
        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Ism, telefon, manzil..."
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.status||''} onChange={e=>crud.setFilter('status',e.target.value)}>
            <option value="">Barcha holat</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </select>
        </div>
        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading} onRow={setViewItem}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>

        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={modal==='create'?'Yangi mijoz':'Mijoz tahrirlash'}
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
          <div className="fg"><label className="flabel">Manzil</label>
            <input className="finput" value={form.address} onChange={set('address')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Chegirma (%)</label>
              <input className="finput" type="number" min="0" max="100" value={form.discount}
                onChange={e=>setForm(p=>({...p,discount:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Holat</label>
              <select className="fselect" value={form.status} onChange={set('status')}>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select></div>
          </div>
        </Modal>

        <Modal open={!!viewItem} onClose={()=>setViewItem(null)} title="👤 Mijoz ma'lumotlari"
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setViewItem(null)}>Yopish</button>
            <button className="btn btn-outline" onClick={()=>{setForm({...viewItem});setViewItem(null);setModal('edit')}}>
              <MdEdit size={15}/> Tahrirlash
            </button>
          </>}
        >
          {viewItem && [
            ['Ism',       viewItem.name],
            ['Telefon',   viewItem.phone],
            ['Manzil',    viewItem.address],
            ['Buyurtmalar', viewItem.orders+' ta'],
            ['Jami xarid', fmt.currency(viewItem.totalSpent)],
            ['Chegirma',  viewItem.discount+'%'],
          ].map(([k,v]) => (
            <div key={k} className="detail-row">
              <span className="detail-key">{k}</span>
              <span className="detail-val">{v||'—'}</span>
            </div>
          ))}
          {viewItem && <div className="detail-row">
            <span className="detail-key">Holat</span>
            <Sbadge s={viewItem.status}/>
          </div>}
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}}
          title="Mijozni o'chirish" msg="O'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
