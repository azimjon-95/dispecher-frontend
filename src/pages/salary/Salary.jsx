import { useState } from 'react'
import { MdFileDownload, MdEdit, MdCheckCircle, MdHourglassEmpty, MdPeople, MdSavings } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Table, Paging, PH, ExportBtn, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Salary.css'

export default function Salary() {
  const crud = useCRUD(
    { getAll:api.getSalary, create:()=>Promise.resolve({}), update:api.updateSalary, remove:()=>Promise.resolve({}) },
    ['employee']
  )
  const [modal, setModal] = useState(null)
  const [form,  setForm]  = useState({})

  async function saveBonusFine() {
    const total = (form.base||0)+(+form.bonus||0)-(+form.fine||0)
    await crud.update(form._id, { bonus:form.bonus, fine:form.fine, total })
    setModal(null)
  }

  async function togglePaid(row) {
    await crud.update(row._id, { paid:!row.paid })
    toast(row.paid ? "To'lov bekor qilindi" : "To'langan ✅", row.paid?'inf':'ok')
  }

  const paid  = crud.data.filter(r=>r.paid).length
  const total = crud.data.reduce((s,r)=>s+(r.total||0),0)
  const pct   = crud.data.length ? Math.round((paid/crud.data.length)*100) : 0

  const COLS = [
    { k:'employee', l:'Xodim', r:(v,r)=>(
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'var(--accentbg)',border:'2px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,color:'var(--accent)',flexShrink:0}}>
          {v?.[0]}
        </div>
        <div>
          <div style={{fontWeight:600}}>{v}</div>
          <div style={{fontSize:11,color:'var(--text2)'}}>{r.role}</div>
        </div>
      </div>
    )},
    { k:'items',  l:'Buyumlar', r:v=><span className="mono">{v}</span> },
    { k:'sqm',    l:'Kv.m',     r:v=><span className="mono">{v} m²</span> },
    { k:'base',   l:'Asosiy',   r:v=><span className="mono">{fmt.currency(v)}</span> },
    { k:'earned', l:"To'plangan", r:v=>v>0
      ? <span className="mono" style={{color:'var(--accent)',fontWeight:700}}>{fmt.currency(v)}</span>
      : <span style={{color:'var(--text3)'}}>—</span>
    },
    { k:'bonus',  l:'Ustama',   r:v=>v>0?<span className="mono" style={{color:'var(--green)'}}>+{fmt.currency(v)}</span>:<span style={{color:'var(--text3)'}}>—</span> },
    { k:'fine',   l:'Jarima',   r:v=>v>0?<span className="mono" style={{color:'var(--red)'}}>−{fmt.currency(v)}</span>:<span style={{color:'var(--text3)'}}>—</span> },
    { k:'total',  l:'Jami',     r:v=><span className="mono" style={{fontWeight:800,color:'var(--accent)'}}>{fmt.currency(v)}</span> },
    { k:'paid',   l:"To'lov",   r:(v,row)=>(
      <button
        className={`btn btn-sm ${v?'btn-success':'btn-ghost'}`}
        onClick={e=>{e.stopPropagation();togglePaid(row)}}
        style={{display:'flex',alignItems:'center',gap:4}}
      >
        {v ? <><MdCheckCircle size={13}/> To'langan</> : <><MdHourglassEmpty size={13}/> To'lanmagan</>}
      </button>
    )},
    { k:'_a', l:'', r:(_,row)=>(
      <button className="btn btn-ghost btn-icon btn-sm"
        onClick={e=>{e.stopPropagation();setForm({...row});setModal('edit')}}
        title="Ustama/Jarima">
        <MdEdit size={15}/>
      </button>
    )},
  ]

  return (
    <ErrorBoundary>
      <div className="salary-wrap">
        <PH title="💳 Maosh Hisoblash" sub="Oylik to'lovlar"
          actions={<ExportBtn data={crud.filtered} name="maosh-2025-05"/>}
        />

        {/* Summary */}
        <div className="kpi-grid" style={{marginBottom:16}}>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--accentbg)'}}>
                <MdSavings size={20} style={{color:'var(--accent)'}}/>
              </div>
            </div>
            <div className="kpi-val" style={{fontSize:18}}>{fmt.currency(total)}</div>
            <div className="kpi-lbl">Jami to'lov</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--greenbg)'}}>
                <MdCheckCircle size={20} style={{color:'var(--green)'}}/>
              </div>
            </div>
            <div className="kpi-val" style={{color:'var(--green)'}}>{paid}</div>
            <div className="kpi-lbl">To'langan</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--yellowbg)'}}>
                <MdHourglassEmpty size={20} style={{color:'var(--yellow)'}}/>
              </div>
            </div>
            <div className="kpi-val" style={{color:'var(--yellow)'}}>{crud.data.length-paid}</div>
            <div className="kpi-lbl">Kutayotganlar</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="salary-progress-bar">
          <div className="salary-progress-fill" style={{width:pct+'%'}}/>
        </div>
        <div className="salary-progress-label">{pct}% to'langan</div>

        <div className="card" style={{padding:0,marginTop:14}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>

        {/* Edit bonus/fine modal */}
        <Modal open={modal==='edit'} onClose={()=>setModal(null)} title="✏️ Ustama / Jarima"
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>Bekor</button>
            <button className="btn btn-primary" onClick={saveBonusFine}>Saqlash</button>
          </>}
        >
          <div style={{padding:'10px 12px',borderRadius:'var(--r)',background:'var(--bg3)',marginBottom:4}}>
            <div style={{fontWeight:700}}>{form.employee}</div>
            <div style={{fontSize:12,color:'var(--text2)'}}>Asosiy: {fmt.currency(form.base)}</div>
            <div style={{fontSize:12,color:'var(--accent)'}}>To'plangan: {fmt.currency(form.earned)}</div>
          </div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Ustama (so'm)</label>
              <input className="finput" type="number" min="0" value={form.bonus||0}
                onChange={e=>setForm(p=>({...p,bonus:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Jarima (so'm)</label>
              <input className="finput" type="number" min="0" value={form.fine||0}
                onChange={e=>setForm(p=>({...p,fine:+e.target.value}))}/></div>
          </div>
          <div className="salary-total-box">
            <div className="salary-total-label">Jami:</div>
            <div className="salary-total-value">
              {fmt.currency((form.base||0)+(form.earned||0)+(+form.bonus||0)-(+form.fine||0))}
            </div>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  )
}
