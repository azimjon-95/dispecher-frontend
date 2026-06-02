import { useState, useMemo } from 'react'
import { MdAdd,MdEdit,MdDelete,MdTrendingUp,MdTrendingDown,MdBalance,MdFileDownload,MdPerson,MdCreditCard } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Finance.css'

const CATS  = ['Buyurtma','Transport','Kimyoviy','Kommunal','Maosh','Boshqa']
const EMPTY = { type:'kirim', description:'', amount:'', category:'Buyurtma', date:new Date().toISOString().slice(0,10), by:'Admin' }

/* ── Mock orders with debt info ── */
const MOCK_ORDERS_WITH_DEBT = [
  { _id:'o1', number:'#1042', customer:'Alisher Karimov',  total:480000, paid:200000, debt:280000 },
  { _id:'o2', number:'#1043', customer:'Malika Tosheva',   total:95000,  paid:0,      debt:95000  },
  { _id:'o3', number:'#1047', customer:'Dilnoza Qodirova', total:180000, paid:90000,  debt:90000  },
]

export default function Finance() {
  const crud = useCRUD(
    { getAll:api.getFinance, create:api.createFinance, update:api.updateFinance, remove:api.deleteFinance },
    ['description','category']
  )
  const [modal,       setModal]       = useState(null)
  const [form,        setForm]        = useState(EMPTY)
  const [delId,       setDelId]       = useState(null)
  const [payModal,    setPayModal]    = useState(false)
  const [payForm,     setPayForm]     = useState({ orderId:'', orderNum:'', amount:'', method:'naqt', customer:'' })
  const [ordersDebt,  setOrdersDebt]  = useState(MOCK_ORDERS_WITH_DEBT)
  const [searchDebt,  setSearchDebt]  = useState('')
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const kirim  = crud.data.reduce((s,f) => f.type==='kirim'  ? s+f.amount : s, 0)
  const chiqim = crud.data.reduce((s,f) => f.type==='chiqim' ? s+f.amount : s, 0)
  const totalDebt = ordersDebt.reduce((s,o) => s+(o.debt||0), 0)

  const filteredDebt = useMemo(() => {
    const q = searchDebt.toLowerCase()
    return ordersDebt.filter(o =>
      !q || o.number?.includes(q) || o.customer?.toLowerCase().includes(q)
    )
  }, [ordersDebt, searchDebt])

  async function save() {
    if (!form.description || !form.amount) { toast('Tavsif va miqdor majburiy!','err'); return }
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  /* Customer payment */
  async function doCustomerPay() {
    const amount = parseFloat(payForm.amount)
    if (!payForm.orderId || !amount || amount<=0) {
      toast('Buyurtma va miqdorni kiriting!','err'); return
    }
    const order = ordersDebt.find(o=>o._id===payForm.orderId)
    if (!order) { toast("Buyurtma topilmadi",'err'); return }
    if (amount > order.debt) {
      toast(`Qarz ${fmt.currency(order.debt)} dan oshib ketdi!`,'err'); return
    }

    // Add to finance
    await crud.create({
      type: 'kirim',
      description: `${order.customer} — ${order.number} to'lov (${payForm.method})`,
      amount,
      category: 'Buyurtma',
      by: 'Admin',
      date: new Date().toISOString().slice(0,10),
    })

    // Update debt
    setOrdersDebt(prev => prev.map(o => o._id===payForm.orderId
      ? { ...o, paid: o.paid+amount, debt: Math.max(0, o.debt-amount) }
      : o
    ).filter(o=>o.debt>0))

    toast(`${fmt.currency(amount)} qabul qilindi ✅`, 'ok')
    setPayModal(false)
    setPayForm({ orderId:'', orderNum:'', amount:'', method:'naqt', customer:'' })
  }

  const COLS = [
    { k:'date',        l:'Sana',        r:v=><span className="mono" style={{fontSize:11}}>{v}</span> },
    { k:'type',        l:'Turi',         r:v=><Sbadge s={v}/> },
    { k:'description', l:'Tavsif' },
    { k:'category',    l:'Kategoriya',   r:v=><span className="badge b-gray">{v}</span> },
    { k:'amount',      l:'Miqdor',       r:(v,r)=>(
      <span className="mono" style={{fontWeight:700,color:r.type==='kirim'?'var(--green)':'var(--red)'}}>
        {r.type==='kirim'?'+':'−'}{fmt.currency(v)}
      </span>
    )},
    { k:'by', l:'Kim', r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v}</span> },
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setModal('edit')}}><MdEdit size={15}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={15}/></button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      <div className="finance-wrap">
        <PH title="💰 Moliya" sub="Kirim-chiqim va qarzdorlar"
          actions={<>
            <ExportBtn data={crud.filtered} name="moliya"/>
            <button className="btn btn-ghost" style={{borderColor:'#229ED9',color:'#229ED9'}} onClick={()=>setPayModal(true)}>
              <MdPerson size={15}/> Mijoz to'lovi
            </button>
            <button className="btn btn-success" onClick={()=>{setForm({...EMPTY,type:'kirim'});setModal('create')}}>
              <MdTrendingUp size={15}/> Kirim
            </button>
            <button className="btn btn-danger" onClick={()=>{setForm({...EMPTY,type:'chiqim'});setModal('create')}}>
              <MdTrendingDown size={15}/> Chiqim
            </button>
          </>}
        />

        {/* Summary cards */}
        <div className="kpi-grid" style={{marginBottom:16}}>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--greenbg)'}}><MdTrendingUp size={20} style={{color:'var(--green)'}}/></div>
              <span className="badge b-green">Kirim</span>
            </div>
            <div className="kpi-val" style={{color:'var(--green)',fontSize:18}}>{fmt.currency(kirim)}</div>
            <div className="kpi-lbl">Jami kirim</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--redbg)'}}><MdTrendingDown size={20} style={{color:'var(--red)'}}/></div>
              <span className="badge b-red">Chiqim</span>
            </div>
            <div className="kpi-val" style={{color:'var(--red)',fontSize:18}}>{fmt.currency(chiqim)}</div>
            <div className="kpi-lbl">Jami chiqim</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:kirim-chiqim>=0?'var(--greenbg)':'var(--redbg)'}}>
                <MdBalance size={20} style={{color:kirim-chiqim>=0?'var(--green)':'var(--red)'}}/>
              </div>
            </div>
            <div className="kpi-val" style={{color:kirim-chiqim>=0?'var(--green)':'var(--red)',fontSize:18}}>
              {fmt.currency(Math.abs(kirim-chiqim))}
            </div>
            <div className="kpi-lbl">Balans {kirim-chiqim<0?'(minus)':''}</div>
          </div>
          <div className="kpi-card" style={{cursor:'pointer'}} onClick={()=>setPayModal(true)}>
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'rgba(34,158,217,.12)'}}>
                <MdCreditCard size={20} style={{color:'#229ED9'}}/>
              </div>
              <span className="badge" style={{background:'rgba(34,158,217,.1)',color:'#229ED9'}}>Qarz</span>
            </div>
            <div className="kpi-val" style={{color:'#229ED9',fontSize:18}}>{fmt.currency(totalDebt)}</div>
            <div className="kpi-lbl">Mijozlar qarzi · {ordersDebt.length} ta</div>
          </div>
        </div>

        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Tavsif yoki kategoriya..."
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.type||''} onChange={e=>crud.setFilter('type',e.target.value)}>
            <option value="">Barchasi</option>
            <option value="kirim">Kirim</option>
            <option value="chiqim">Chiqim</option>
          </select>
          <input type="date" className="finput" style={{width:145}}/>
        </div>

        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>

        {/* ══ CUSTOMER PAYMENT MODAL ══ */}
        <Modal open={payModal} onClose={()=>setPayModal(false)} title="💳 Mijoz to'lovi" size="lg"
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setPayModal(false)}>Bekor</button>
            <button className="btn btn-primary" onClick={doCustomerPay}>✅ To'lovni qabul qilish</button>
          </>}
        >
          {/* Debt list */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:'var(--text2)'}}>📋 Qarzdor mijozlar</div>
            <input className="finput" style={{marginBottom:8,width:'100%'}} placeholder="🔍 Buyurtma raqami yoki mijoz..."
              value={searchDebt} onChange={e=>setSearchDebt(e.target.value)}/>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:180,overflowY:'auto'}}>
              {filteredDebt.length===0
                ? <div style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Qarzdor yo'q ✅</div>
                : filteredDebt.map(o=>(
                    <div key={o._id}
                      className={payForm.orderId===o._id?'':''}
                      onClick={()=>setPayForm(p=>({...p,orderId:o._id,orderNum:o.number,customer:o.customer,amount:o.debt}))}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:'var(--r)',background:payForm.orderId===o._id?'var(--accentbg)':'var(--bg3)',border:`1px solid ${payForm.orderId===o._id?'var(--accent)':'var(--border)'}`,cursor:'pointer',transition:'all var(--t)'}}
                    >
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:12}}>{o.number} — {o.customer}</div>
                        <div style={{fontSize:11,color:'var(--text2)'}}>Jami: {fmt.currency(o.total)} · To'landi: {fmt.currency(o.paid)}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontWeight:800,fontFamily:'monospace',color:'var(--red)',fontSize:13}}>{fmt.currency(o.debt)}</div>
                        <div style={{fontSize:10,color:'var(--text3)'}}>qarz</div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Payment form */}
          {payForm.orderId && (
            <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
              <div style={{padding:'8px 10px',background:'var(--accentbg)',borderRadius:'var(--r)',marginBottom:10,fontSize:12}}>
                <span style={{fontWeight:700,color:'var(--accent)'}}>{payForm.orderNum}</span>
                {' — '}{payForm.customer}
                {' · Qarz: '}<span style={{fontWeight:800,color:'var(--red)'}}>{fmt.currency(ordersDebt.find(o=>o._id===payForm.orderId)?.debt||0)}</span>
              </div>
              <div className="fgrid2">
                <div className="fg"><label className="flabel">To'lov miqdori (so'm) *</label>
                  <input className="finput" type="number" value={payForm.amount}
                    onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))}/></div>
                <div className="fg"><label className="flabel">To'lov usuli</label>
                  <select className="fselect" value={payForm.method} onChange={e=>setPayForm(p=>({...p,method:e.target.value}))}>
                    <option value="naqt">💵 Naqt</option>
                    <option value="karta">💳 Karta</option>
                    <option value="transfer">📱 Transfer</option>
                  </select></div>
              </div>
            </div>
          )}
        </Modal>

        {/* Create/Edit modal */}
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={form.type==='kirim'?'💰 Kirim':'💸 Chiqim'}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>Bekor</button>
            <button className={`btn ${form.type==='kirim'?'btn-success':'btn-danger'}`} onClick={save}>Saqlash</button>
          </>}
        >
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Turi</label>
              <select className="fselect" value={form.type} onChange={set('type')}>
                <option value="kirim">Kirim</option>
                <option value="chiqim">Chiqim</option>
              </select></div>
            <div className="fg"><label className="flabel">Kategoriya</label>
              <select className="fselect" value={form.category} onChange={set('category')}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="fg"><label className="flabel">Tavsif *</label>
            <input className="finput" value={form.description} onChange={set('description')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Miqdor (so'm) *</label>
              <input className="finput" type="number" value={form.amount}
                onChange={e=>setForm(p=>({...p,amount:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Sana</label>
              <input className="finput" type="date" value={form.date} onChange={set('date')}/></div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}} title="O'chirish" msg="O'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
