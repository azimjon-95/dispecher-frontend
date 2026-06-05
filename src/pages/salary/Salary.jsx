import { useState, useEffect, useMemo } from 'react'
import { MdAdd, MdRefresh, MdAttachMoney, MdWarning, MdStar } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Sbadge, Table, Paging, PH, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'

const MONTHS = Array.from({length:6},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})
const PAY_TYPES = [
  { key:'avans',  label:'Avans',  icon:'💵', color:'var(--yellow)', desc:'Oyligidan oldindan beriladi' },
  { key:'oylik',  label:'Oylik',  icon:'💰', color:'var(--green)',  desc:"To'liq oylik to'lovi" },
  { key:'jarima', label:'Jarima', icon:'⚠️', color:'var(--red)',    desc:'Intizom buzilishi yoki xato' },
  { key:'bonus',  label:'Bonus',  icon:'🌟', color:'var(--purple)', desc:'Qo\'shimcha mukofot' },
]

function norm(r){ return Array.isArray(r)?r:Array.isArray(r?.data)?r.data:[] }

export default function Salary() {
  const [month,    setMonth]    = useState(MONTHS[0])
  const [summary,  setSummary]  = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ employeeId:'', type:'avans', amount:'', note:'' })
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('summary')

  useEffect(()=>{ load() },[month])

  async function load(){
    setLoading(true)
    try {
      const [sumR, payR] = await Promise.allSettled([
        api.getSalarySummary(month),
        api.getSalaryPayments({ month }),
      ])
      setSummary(norm(sumR.value))
      setPayments(norm(payR.value))
    } catch(e){ toast(e.message,'err') }
    setLoading(false)
  }

  async function pay(){
    if (!form.employeeId||!form.amount){ toast("Ishchi va miqdor!",'err'); return }
    setSaving(true)
    try {
      await api.createSalaryPayment({ ...form, amount:+form.amount })
      toast(`${PAY_TYPES.find(t=>t.key===form.type)?.label} berildi ✅`,'ok')
      setModal(false); setForm({employeeId:'',type:'avans',amount:'',note:''}); load()
    } catch(e){ toast(e.message,'err') } finally { setSaving(false) }
  }

  const totalExpected = summary.reduce((s,e)=>s+(e.expected||0),0)
  const totalPaid     = summary.reduce((s,e)=>s+(e.oylik||0)+(e.avans||0),0)
  const totalBalance  = summary.reduce((s,e)=>s+(e.currentBalance||0),0)

  const HIST_COLS = [
    { k:'date',         l:'Sana',    r:v=><span className="mono" style={{fontSize:11}}>{v}</span> },
    { k:'employeeName', l:'Ishchi' },
    { k:'type', l:'Tur', r:v=>{ const t=PAY_TYPES.find(x=>x.key===v); return <span className="badge" style={{background:t?.color+'22',color:t?.color}}>{t?.icon} {t?.label||v}</span> } },
    { k:'amount',       l:'Miqdor', r:v=><span className="mono" style={{fontWeight:700,color:'var(--green)'}}>{fmt.currency(v)}</span> },
    { k:'note',         l:'Izoh',   r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v||'—'}</span> },
    { k:'paidBy',       l:'Kim berdi', r:v=><span style={{fontSize:11}}>{v}</span> },
  ]

  return (
    <ErrorBoundary>
      <div>
        <PH title="💰 Maosh Hisoblash" sub={`${month} · ${summary.length} ta xodim`}
          actions={<>
            <select className="fselect" value={month} onChange={e=>setMonth(e.target.value)} style={{minWidth:120}}>
              {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={load}><MdRefresh size={14}/></button>
            <button className="btn btn-primary" onClick={()=>setModal(true)}>
              <MdAdd size={15}/> Avans/Jarima/Bonus
            </button>
          </>}
        />

        {/* Summary KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          {[
            { lbl:"Jami kutilgan maosh", val:fmt.currency(totalExpected), c:'var(--accent)',  icon:'📊' },
            { lbl:"Berilgan maosh",      val:fmt.currency(totalPaid),     c:'var(--green)',   icon:'💰' },
            { lbl:"Yig'ilgan balans",    val:fmt.currency(totalBalance),  c:'var(--yellow)',  icon:'⚖️' },
          ].map(k=>(
            <div key={k.lbl} className="kpi-card">
              <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
              <div style={{fontWeight:800,fontSize:16,color:k.c,fontFamily:'monospace'}}>{k.val}</div>
              <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:12}}>
          {['summary','history'].map(t=>(
            <button key={t} className={`btn btn-sm ${tab===t?'btn-primary':'btn-ghost'}`} onClick={()=>setTab(t)}>
              {t==='summary'?'📊 Oylik xulosa':'📋 To\'lov tarixi'}
            </button>
          ))}
        </div>

        {/* Summary tab */}
        {tab==='summary' && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>⏳ Yuklanmoqda...</div>
              : summary.length===0 ? <div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>Ma'lumot yo'q</div>
              : summary.map(emp=>(
                <div key={emp._id} className="card" style={{padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                    {/* Avatar + name */}
                    <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:160}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'var(--accentbg)',border:'2px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'var(--accent)',flexShrink:0}}>
                        {emp.name?.[0]}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{emp.name}</div>
                        <div style={{fontSize:11,color:'var(--text2)'}}>{emp.role} · {emp.salaryType||'Oylik'}</div>
                      </div>
                    </div>

                    {/* Salary type info */}
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',flex:2}}>
                      {/* Expected */}
                      <div style={{textAlign:'center',padding:'6px 10px',background:'var(--bg3)',borderRadius:'var(--r)',minWidth:90}}>
                        <div style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--accent)'}}>{fmt.currency(emp.expected)}</div>
                        <div style={{fontSize:10,color:'var(--text3)'}}>{emp.salaryType==='Kunlik'?'26 kun':'Oylik'}</div>
                      </div>
                      {/* Balance from work */}
                      {emp.salaryType==='Ish bayi' && (
                        <div style={{textAlign:'center',padding:'6px 10px',background:'var(--bg3)',borderRadius:'var(--r)',minWidth:90}}>
                          <div style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--purple)'}}>{fmt.currency(emp.currentBalance)}</div>
                          <div style={{fontSize:10,color:'var(--text3)'}}>Qilgan ishi</div>
                        </div>
                      )}
                      {/* Avans */}
                      {emp.avans>0 && (
                        <div style={{textAlign:'center',padding:'6px 10px',background:'var(--yellowbg)',borderRadius:'var(--r)',minWidth:80}}>
                          <div style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--yellow)'}}>{fmt.currency(emp.avans)}</div>
                          <div style={{fontSize:10,color:'var(--text3)'}}>Avans</div>
                        </div>
                      )}
                      {/* Jarima */}
                      {emp.jarima>0 && (
                        <div style={{textAlign:'center',padding:'6px 10px',background:'var(--redbg)',borderRadius:'var(--r)',minWidth:80}}>
                          <div style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--red)'}}>−{fmt.currency(emp.jarima)}</div>
                          <div style={{fontSize:10,color:'var(--text3)'}}>Jarima</div>
                        </div>
                      )}
                      {/* Bonus */}
                      {emp.bonus>0 && (
                        <div style={{textAlign:'center',padding:'6px 10px',background:'var(--purplebg)',borderRadius:'var(--r)',minWidth:80}}>
                          <div style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--purple)'}}>+{fmt.currency(emp.bonus)}</div>
                          <div style={{fontSize:10,color:'var(--text3)'}}>Bonus</div>
                        </div>
                      )}
                      {/* Remaining */}
                      <div style={{textAlign:'center',padding:'6px 10px',background:emp.remaining>0?'var(--greenbg)':'var(--redbg)',borderRadius:'var(--r)',minWidth:100}}>
                        <div style={{fontFamily:'monospace',fontWeight:800,fontSize:13,color:emp.remaining>0?'var(--green)':'var(--red)'}}>{fmt.currency(emp.remaining)}</div>
                        <div style={{fontSize:10,color:'var(--text3)'}}>Qolgan</div>
                      </div>
                    </div>

                    {/* Pay button */}
                    <button className="btn btn-primary btn-sm" style={{whiteSpace:'nowrap'}}
                      onClick={()=>{setForm({employeeId:emp._id,type:'oylik',amount:emp.remaining>0?emp.remaining:'',note:''});setModal(true)}}>
                      💰 To'lash
                    </button>
                  </div>

                  {/* Progress bar */}
                  {emp.expected>0 && (
                    <div style={{marginTop:10}}>
                      <div style={{height:5,background:'var(--bg4)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',background:'var(--green)',borderRadius:99,width:Math.min(100,Math.round(((emp.avans+emp.oylik)/emp.expected)*100))+'%',transition:'width .5s'}}/>
                      </div>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>
                        {Math.min(100,Math.round(((emp.avans+emp.oylik)/emp.expected)*100))}% to'landi
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* History tab */}
        {tab==='history' && (
          <div className="card" style={{padding:0}}>
            <Table cols={HIST_COLS} rows={payments} loading={loading}/>
          </div>
        )}

        {/* Pay modal */}
        <Modal open={modal} onClose={()=>setModal(false)} title="💰 To'lov" size="sm"
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(false)}>Bekor</button><button className="btn btn-primary" onClick={pay} disabled={saving}>{saving?'⏳':'✅ Tasdiqlash'}</button></>}>
          {/* Type buttons */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
            {PAY_TYPES.map(t=>(
              <button key={t.key} className="btn btn-ghost btn-sm"
                style={{borderColor:form.type===t.key?t.color:'var(--border)',background:form.type===t.key?t.color+'22':'transparent',color:form.type===t.key?t.color:'var(--text2)',display:'flex',alignItems:'center',gap:6,justifyContent:'flex-start'}}
                onClick={()=>setForm(p=>({...p,type:t.key}))}>
                <span>{t.icon}</span><span style={{fontWeight:700}}>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:10}}>
            {PAY_TYPES.find(t=>t.key===form.type)?.desc}
          </div>
          <div className="fg"><label className="flabel">Ishchi *</label>
            <select className="fselect" value={form.employeeId} onChange={e=>setForm(p=>({...p,employeeId:e.target.value}))}>
              <option value="">— Tanlang —</option>
              {summary.map(e=><option key={e._id} value={e._id}>{e.name} (qolgan: {fmt.currency(e.remaining)})</option>)}
            </select>
          </div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Miqdor (so'm) *</label>
              <input className="finput" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Izoh</label>
              <input className="finput" placeholder="Ixtiyoriy..." value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/></div>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  )
}
