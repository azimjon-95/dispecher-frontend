import { useState, useEffect, useMemo } from 'react'
import { MdAdd, MdEdit, MdDelete, MdTrendingUp, MdTrendingDown, MdBalance, MdPieChart } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, ExportBtn, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Finance.css'

const CATS_KIRIM  = ['Buyurtma','Uy xizmati','Avans qaytarish','Boshqa kirim']
const CATS_CHIQIM = ['Kimyoviy moddalar','Kommunal (svet/suv/gaz)','Arenda','Transport xarajat','Bank xizmati','Maosh','Jihozlar','Boshqa chiqim']
const today = new Date().toISOString().slice(0,10)
const thisMonth = new Date().toISOString().slice(0,7)
const EMPTY = { type:'kirim', description:'', amount:'', category:'Buyurtma', date:today, by:'Admin' }

export default function Finance() {
  const crud = useCRUD(
    { getAll:api.getFinance, create:api.createFinance, update:api.updateFinance, remove:api.deleteFinance },
    ['description','category']
  )
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [delId,   setDelId]   = useState(null)
  const [period,  setPeriod]  = useState('all')
  const [typeF,   setTypeF]   = useState('')
  const [catF,    setCatF]    = useState('')
  const [payModal,setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ orderId:'', amount:'', method:'naqt', customer:'' })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Filter by period
  const filtered = useMemo(() => {
    let rows = crud.data || []
    if (period === 'today')  rows = rows.filter(f => f.date === today)
    if (period === 'month')  rows = rows.filter(f => f.date?.startsWith(thisMonth))
    if (typeF) rows = rows.filter(f => f.type === typeF)
    if (catF)  rows = rows.filter(f => f.category === catF)
    return rows
  }, [crud.data, period, typeF, catF])

  const kirim  = filtered.filter(f=>f.type==='kirim') .reduce((s,f)=>s+(f.amount||0),0)
  const chiqim = filtered.filter(f=>f.type==='chiqim').reduce((s,f)=>s+(f.amount||0),0)
  const foyda  = kirim - chiqim
  const allKirim  = (crud.data||[]).filter(f=>f.type==='kirim') .reduce((s,f)=>s+(f.amount||0),0)
  const allChiqim = (crud.data||[]).filter(f=>f.type==='chiqim').reduce((s,f)=>s+(f.amount||0),0)

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map = {}
    filtered.forEach(f => {
      const key = f.category || 'Boshqa'
      if (!map[key]) map[key] = { kirim:0, chiqim:0 }
      map[key][f.type] = (map[key][f.type]||0) + (f.amount||0)
    })
    return Object.entries(map).sort((a,b) => (b[1].kirim+b[1].chiqim)-(a[1].kirim+a[1].chiqim))
  }, [filtered])

  async function save() {
    if (!form.description||!form.amount){toast('Tavsif va miqdor!','err');return}
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  const COLS = [
    { k:'date',        l:'Sana',       r:v=><span className="mono" style={{fontSize:11}}>{v}</span> },
    { k:'type',        l:'Turi',        r:v=><span className="badge" style={{background:v==='kirim'?'var(--greenbg)':' var(--redbg)',color:v==='kirim'?'var(--green)':' var(--red)'}}>{v==='kirim'?'↑ Kirim':'↓ Chiqim'}</span> },
    { k:'description', l:'Tavsif' },
    { k:'category',    l:'Kategoriya',  r:v=><span className="badge b-gray">{v}</span> },
    { k:'amount',      l:'Miqdor',      r:(v,r)=><span className="mono" style={{fontWeight:700,color:r.type==='kirim'?'var(--green)':' var(--red)'}}>{r.type==='kirim'?'+':'-'}{fmt.currency(v)}</span> },
    { k:'by',          l:'Kim',         r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v}</span> },
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setModal('edit')}}><MdEdit size={14}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={14}/></button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      <div className="finance-wrap">
        <PH title="💰 Moliya — Pul Oqimi" sub="Kirim, Chiqim va Foyda nazorati"
          actions={<>
            <ExportBtn data={filtered} name="moliya"/>
            <button className="btn btn-success" onClick={()=>{setForm({...EMPTY,type:'kirim'});setModal('create')}}>
              <MdTrendingUp size={14}/> Kirim
            </button>
            <button className="btn btn-danger" onClick={()=>{setForm({...EMPTY,type:'chiqim'});setModal('create')}}>
              <MdTrendingDown size={14}/> Chiqim
            </button>
          </>}
        />

        {/* Period filter */}
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
          {[['all','Barchasi'],['today','Bugun'],['month','Bu oy']].map(([v,l])=>(
            <button key={v} className={`btn btn-sm ${period===v?'btn-primary':'btn-ghost'}`} onClick={()=>setPeriod(v)}>{l}</button>
          ))}
          <select className="fselect" value={typeF} onChange={e=>setTypeF(e.target.value)} style={{minWidth:100}}>
            <option value="">Barcha tur</option>
            <option value="kirim">Kirim</option>
            <option value="chiqim">Chiqim</option>
          </select>
          <select className="fselect" value={catF} onChange={e=>setCatF(e.target.value)} style={{minWidth:140}}>
            <option value="">Barcha kategoriya</option>
            {[...CATS_KIRIM,...CATS_CHIQIM].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        {/* KPI Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
          {[
            { lbl:'Kirim',   val:fmt.currency(kirim),  c:'var(--green)',  icon:'📈', bg:'var(--greenbg)' },
            { lbl:'Chiqim',  val:fmt.currency(chiqim), c:'var(--red)',    icon:'📉', bg:'var(--redbg)'  },
            { lbl:'Foyda',   val:fmt.currency(foyda),  c:foyda>=0?'var(--green)':'var(--red)', icon:foyda>=0?'💵':'📛', bg:foyda>=0?'var(--greenbg)':'var(--redbg)' },
            { lbl:'Umumiy balans', val:fmt.currency(allKirim-allChiqim), c:'var(--accent)', icon:'⚖️', bg:'var(--accentbg)' },
          ].map(k=>(
            <div key={k.lbl} className="kpi-card">
              <div style={{fontSize:20,marginBottom:4}}>{k.icon}</div>
              <div style={{fontWeight:800,fontSize:15,color:k.c,fontFamily:'monospace'}}>{k.val}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {catBreakdown.length > 0 && (
          <div className="card" style={{marginBottom:14}}>
            <div className="card-hd"><div className="card-title"><MdPieChart size={14} style={{verticalAlign:'middle',marginRight:5}}/>Kategoriya bo'yicha</div></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
              {catBreakdown.slice(0,8).map(([cat,data])=>(
                <div key={cat} style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:'var(--r)',border:'1px solid var(--border)'}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{cat}</div>
                  {data.kirim>0  && <div style={{fontSize:11,color:'var(--green)',fontFamily:'monospace'}}>↑ {fmt.currency(data.kirim)}</div>}
                  {data.chiqim>0 && <div style={{fontSize:11,color:'var(--red)',fontFamily:'monospace'}}>↓ {fmt.currency(data.chiqim)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Tavsif yoki kategoriya..."
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <input type="date" className="finput" style={{width:145}} onChange={e=>{}}/>
        </div>
        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>

        {/* Create/Edit modal */}
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={form.type==='kirim'?'💰 Kirim':'💸 Chiqim'}
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>Bekor</button><button className={`btn ${form.type==='kirim'?'btn-success':'btn-danger'}`} onClick={save}>Saqlash</button></>}>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['kirim','chiqim'].map(t=>(
              <button key={t} className={`btn btn-sm ${form.type===t?(t==='kirim'?'btn-success':'btn-danger'):'btn-ghost'}`} onClick={()=>setForm(p=>({...p,type:t,category:t==='kirim'?'Buyurtma':'Kimyoviy moddalar'}))}>
                {t==='kirim'?'💰 Kirim':'💸 Chiqim'}
              </button>
            ))}
          </div>
          <div className="fg"><label className="flabel">Kategoriya</label>
            <select className="fselect" value={form.category} onChange={set('category')}>
              {(form.type==='kirim'?CATS_KIRIM:CATS_CHIQIM).map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg"><label className="flabel">Tavsif *</label><input className="finput" value={form.description} onChange={set('description')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Miqdor (so'm) *</label><input className="finput" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Sana</label><input className="finput" type="date" value={form.date} onChange={set('date')}/></div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}} title="O'chirish" msg="O'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
