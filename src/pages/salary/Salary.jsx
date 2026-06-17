import { useState, useEffect, useMemo } from 'react'
import { MdAdd, MdRefresh, MdAttachMoney, MdWarning, MdStar } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, Sbadge, Table, Paging, PH, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'

const MONTHS = Array.from({length:6},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  return d.toISOString().slice(0,7)
})
const PAY_TYPES = (t={}) => [
  { key:'avans',  label:t.advance||'Avans',  icon:'💵', color:'var(--yellow)' },
  { key:'oylik',  label:'Oylik',              icon:'💰', color:'var(--green)'  },
  { key:'jarima', label:t.fine||'Jarima',     icon:'⚠️', color:'var(--red)'   },
  { key:'bonus',  label:t.bonus||'Bonus',     icon:'🌟', color:'var(--purple)' },
]

function norm(r){ return Array.isArray(r)?r:Array.isArray(r?.data)?r.data:[] }

const isMobS = () => window.innerWidth <= 768

function MobSalary({ summary, history, loading, month, setMonth, tab, setTab, totalExpected, totalPaid, totalBalance, MONTHS, onAvans, fmt }) {
  const { t } = useLang()
  return (
    <div style={{paddingBottom:90}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(160deg,#0d1a0d 0%,#0d1117 100%)',padding:'14px 16px 18px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:150,height:150,borderRadius:'50%',background:'rgba(34,197,94,.1)',filter:'blur(30px)',pointerEvents:'none'}}/>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          💰 Maosh Hisoblash
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div style={{fontSize:28,fontWeight:900,color:'#22c55e',fontFamily:'monospace',letterSpacing:'-1px'}}>{fmt.currency(totalExpected)}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>Jami kutilgan maosh</div>
          </div>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{
            background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',
            borderRadius:10,color:'white',padding:'7px 10px',fontSize:12,fontWeight:600,
          }}>
            {MONTHS.map(m=><option key={m} value={m} style={{background:'#1a1a2e'}}>{m}</option>)}
          </select>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
            {lbl:t.paidSalary||'Berilgan maosh', val:fmt.currency(totalPaid),    c:'#22c55e'},
            {lbl:"Yig'ilgan balans",val:fmt.currency(totalBalance), c:'#f59e0b'},
          ].map(it=>(
            <div key={it.lbl} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'10px 12px'}}>
              <div style={{fontWeight:800,fontFamily:'monospace',fontSize:14,color:it.c}}>{it.val}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:2}}>{it.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,margin:'12px 16px 10px',background:'var(--bg2)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
        {[{k:'summary',l:'📊 Oylik xulosa'},{k:'history',l:"📋 To'lov tarixi"}].map((t,i)=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            flex:1,padding:'10px 6px',border:'none',borderRight:i===0?'1px solid var(--border)':'none',
            background:tab===t.k?'rgba(34,197,94,.15)':'transparent',
            color:tab===t.k?'#22c55e':'var(--text3)',fontSize:12,fontWeight:700,cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
          }}>{t.l}</button>
        ))}
      </div>

      {/* FAB */}
      <button onClick={onAvans} style={{
        position:'fixed',bottom:74,right:20,padding:'10px 18px',borderRadius:99,
        background:'linear-gradient(135deg,#22c55e,#15803d)',color:'white',
        border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
        boxShadow:'0 4px 16px rgba(34,197,94,.4)',zIndex:200,
        display:'flex',alignItems:'center',gap:6,WebkitTapHighlightColor:'transparent',
      }}>+ Avans/Jarima</button>

      {/* Content */}
      <div style={{padding:'0 16px'}}>
        {loading ? (
          [...Array(3)].map((_,i)=>(
            <div key={i} style={{height:80,borderRadius:14,background:'var(--bg2)',marginBottom:8,
              animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*80+'ms'}}/>
          ))
        ) : tab==='summary' ? (
          summary.length===0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
              <div style={{fontSize:36,marginBottom:8}}>💰</div>
              <div>Ma'lumot yo'q</div>
            </div>
          ) : summary.map(emp=>(
            <div key={emp._id} style={{
              background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,
              padding:'12px 14px',marginBottom:8,position:'relative',overflow:'hidden',
            }}>
              <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:'#22c55e',borderRadius:'16px 0 0 16px'}}/>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:38,height:38,borderRadius:12,background:'rgba(34,197,94,.12)',
                  border:'1.5px solid rgba(34,197,94,.3)',display:'flex',alignItems:'center',
                  justifyContent:'center',fontWeight:800,color:'#22c55e',fontSize:15,flexShrink:0}}>
                  {emp.name?.[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{emp.name}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{emp.role} · {emp.salaryType||'Oylik'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#22c55e',fontFamily:'monospace'}}>{fmt.currency(emp.expected)}</div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>kutilgan</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                {[
                  {lbl:'Berilgan', val:fmt.currency(emp.paid),    c:'#22c55e'},
                  {lbl:'Balans',   val:fmt.currency(emp.balance), c:'#f59e0b'},
                  {lbl:t.advance||'Avans',    val:fmt.currency(emp.advance), c:'#3B82F6'},
                ].map(it=>(
                  <div key={it.lbl} style={{background:'var(--bg3)',borderRadius:9,padding:'7px 8px',textAlign:'center'}}>
                    <div style={{fontWeight:700,fontFamily:'monospace',fontSize:11,color:it.c}}>{it.val}</div>
                    <div style={{fontSize:9,color:'var(--text3)',marginTop:2}}>{it.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          history.length===0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
              <div style={{fontSize:36,marginBottom:8}}>📋</div>
              <div>To'lov tarixi yo'q</div>
            </div>
          ) : history.map((h,i)=>(
            <div key={i} style={{
              background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,
              padding:'11px 14px',marginBottom:8,
              display:'flex',alignItems:'center',gap:12,
            }}>
              <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                background:h.type==='avans'?'rgba(59,130,246,.12)':h.type==='jarima'?'rgba(248,81,73,.12)':'rgba(34,197,94,.12)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
                {h.type==='avans'?'💳':h.type==='jarima'?'⚠️':'🎁'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{h.workerName}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{h.type} · {h.date}</div>
              </div>
              <div style={{fontWeight:800,fontFamily:'monospace',fontSize:14,
                color:h.type==='jarima'?'#f85149':h.type==='avans'?'#3B82F6':'#22c55e'}}>
                {h.type==='jarima'?'-':'+'}  {fmt.currency(h.amount)}
              </div>
            </div>
          ))
        )}
      </div>
      <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  )
}

export default function Salary() {
  const { t } = useLang()
  const [mobile,   setMobile]   = useState(isMobS())
  useEffect(() => {
    const fn = () => setMobile(isMobS())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
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
      toast(`${PAY_TYPES(t).find(t=>t.key===form.type)?.label} berildi ✅`,'ok')
      setModal(false); setForm({employeeId:'',type:'avans',amount:'',note:''}); load()
    } catch(e){ toast(e.message,'err') } finally { setSaving(false) }
  }

  const totalExpected = summary.reduce((s,e)=>s+(e.expected||0),0)
  const totalPaid     = summary.reduce((s,e)=>s+(e.oylik||0)+(e.avans||0),0)
  const totalBalance  = summary.reduce((s,e)=>s+(e.currentBalance||0),0)

  const HIST_COLS = [
    { k:'date',         l:'Sana',    r:v=><span className="mono" style={{fontSize:11}}>{v}</span> },
    { k:'employeeName', l:'Ishchi' },
    { k:'type', l:'Tur', r:v=>{ const t=PAY_TYPES(t).find(x=>x.key===v); return <span className="badge" style={{background:t?.color+'22',color:t?.color}}>{t?.icon} {t?.label||v}</span> } },
    { k:'amount',       l:'Miqdor', r:v=><span className="mono" style={{fontWeight:700,color:'var(--green)'}}>{fmt.currency(v)}</span> },
    { k:'note',         l:'Izoh',   r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v||'—'}</span> },
    { k:'paidBy',       l:'Kim berdi', r:v=><span style={{fontSize:11}}>{v}</span> },
  ]

  if (mobile) return (
    <ErrorBoundary>
      <MobSalary
        summary={summary} history={history} loading={loading}
        month={month} setMonth={setMonth} tab={tab} setTab={setTab}
        totalExpected={totalExpected} totalPaid={totalPaid} totalBalance={totalBalance}
        MONTHS={MONTHS} fmt={fmt}
        onAvans={()=>setModal(true)}
      />
      <Modal open={modal} onClose={()=>setModal(false)}
        title="+ Avans / Jarima / Bonus" size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>setModal(false)}>Bekor</button>
          <button className="btn btn-primary" onClick={pay}>Saqlash</button></>}>
        <div className="fg"><label className="flabel">Xodim *</label>
          <select className="fselect" value={form.workerId} onChange={e=>setForm(p=>({...p,workerId:e.target.value}))}>
            <option value="">Tanlang...</option>
            {summary.map(e=><option key={e._id} value={e._id}>{e.name}</option>)}
          </select></div>
        <div className="fgrid2">
          <div className="fg"><label className="flabel">Tur *</label>
            <select className="fselect" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              <option value="avans">💳 Avans</option>
              <option value="jarima">⚠️ Jarima</option>
              <option value="bonus">🎁 Bonus</option>
            </select></div>
          <div className="fg"><label className="flabel">Summa *</label>
            <input className="finput" type="number" value={form.amount}
              onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></div>
        </div>
        <div className="fg"><label className="flabel">Izoh</label>
          <input className="finput" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/></div>
      </Modal>
    </ErrorBoundary>
  )

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
            {loading ? <Loader size="md" text="Yuklanmoqda..."/>
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
            {PAY_TYPES(t).map(t=>(
              <button key={t.key} className="btn btn-ghost btn-sm"
                style={{borderColor:form.type===t.key?t.color:'var(--border)',background:form.type===t.key?t.color+'22':'transparent',color:form.type===t.key?t.color:'var(--text2)',display:'flex',alignItems:'center',gap:6,justifyContent:'flex-start'}}
                onClick={()=>setForm(p=>({...p,type:t.key}))}>
                <span>{t.icon}</span><span style={{fontWeight:700}}>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:10}}>
            {PAY_TYPES(t).find(t=>t.key===form.type)?.desc}
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
