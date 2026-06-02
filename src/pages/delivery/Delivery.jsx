import { useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdFileDownload, MdVisibility, MdLink, MdRefresh, MdCheckCircle, MdHourglassEmpty } from 'react-icons/md'
import { api } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH } from '../../components/ui/UI.jsx'
import './Delivery.css'

const DRIVERS  = ['Bobur Aliyev', 'Sardor Mirzayev', 'Anvar Qosimov']
const STATUSES = ['yangi', 'jarayonda', 'yetkazildi', 'bekor']
const EMPTY    = { order: '', customer: '', address: '', driver: '', status: 'yangi', time: '', date: new Date().toISOString().slice(0, 10) }

export default function Delivery() {
  const crud = useCRUD(
    { getAll: api.getDelivery, create: api.createDelivery, update: api.updateDelivery, remove: api.deleteDelivery },
    ['order', 'customer', 'address']
  )
  const [modal, setModal] = useState(null)
  const [form,  setForm]  = useState(EMPTY)
  const [delId, setDelId] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function save() {
    if (!form.order || !form.address) return
    if (modal === 'create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  const COLS = [
    { k: 'order',    l: 'Buyurtma', r: v => <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{v}</span> },
    { k: 'customer', l: 'Mijoz' },
    { k: 'address',  l: 'Manzil' },
    { k: 'driver',   l: 'Shafyor',  r: v => v && v !== '—' ? <span>🚗 {v}</span> : <span style={{ color: 'var(--text3)' }}>Biriktirilmagan</span> },
    { k: 'status',   l: 'Holat',    r: v => <Sbadge s={v} /> },
    { k: 'time',     l: 'Vaqt',     r: v => <span className="mono" style={{ fontSize: 11, color: 'var(--text2)' }}>{v || '—'}</span> },
    { k: 'date',     l: 'Sana',     r: v => <span style={{ fontSize: 11, color: 'var(--text2)' }}>{v}</span> },
    { k: '_a', l: '', r: (_, row) => (
      <div className="row-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setForm({ ...row }); setModal('edit') }}><MdEdit size={14}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelId(row._id)}><MdDelete size={14}/></button>
      </div>
    )},
  ]

  return (
    <div className="delivery-wrap">
      <PH
        title="🚚 Olib Ketish"
        sub={`${crud.total} ta topshiriq`}
        actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('create') }}>➕ Yangi</button>}
      />
      <div className="fbar">
        <input className="finput fsearch" placeholder="🔍 Buyurtma yoki mijoz..." value={crud.search} onChange={e => crud.onSearch(e.target.value)} />
        <select className="fselect" value={crud.filters.status || ''} onChange={e => crud.setFilter('status', e.target.value)}>
          <option value="">Barcha holat</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <Table cols={COLS} rows={crud.paginated} loading={crud.loading} />
        <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage} />
      </div>

      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Yangi topshiriq' : '✏️ Tahrirlash'}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Bekor</button>
            <button className="btn btn-primary" onClick={save}>Saqlash</button>
          </>
        }
      >
        <div className="fgrid2">
          <div className="fg"><label className="flabel">Buyurtma raqami *</label><input className="finput" placeholder="#1042" value={form.order} onChange={set('order')} /></div>
          <div className="fg"><label className="flabel">Mijoz</label><input className="finput" value={form.customer} onChange={set('customer')} /></div>
        </div>
        <div className="fg"><label className="flabel">Manzil *</label><input className="finput" value={form.address} onChange={set('address')} /></div>
        <div className="fgrid2">
          <div className="fg">
            <label className="flabel">Shafyor</label>
            <select className="fselect" value={form.driver} onChange={set('driver')}>
              <option value="">Tanlang...</option>
              {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="flabel">Holat</label>
            <select className="fselect" value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="fgrid2">
          <div className="fg"><label className="flabel">Vaqt</label><input className="finput" type="time" value={form.time} onChange={set('time')} /></div>
          <div className="fg"><label className="flabel">Sana</label><input className="finput" type="date" value={form.date} onChange={set('date')} /></div>
        </div>
      </Modal>

      <Confirm open={!!delId} onClose={() => setDelId(null)}
        onOk={async () => { await crud.remove(delId); setDelId(null) }}
        title="Topshiriqni bekor qilish" msg="Bekor qilmoqchimisiz?" danger />
    </div>
  )
}
