import { useState, useEffect, useCallback } from 'react'
import {
  MdShoppingBag, MdAttachMoney, MdPeople, MdDirectionsCar,
  MdTrendingUp, MdTrendingDown, MdRefresh, MdAdd,
  MdLocalShipping, MdConstruction, MdHome,
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import './Dashboard.css'

const today     = new Date().toISOString().slice(0,10)
const isMobile  = () => window.innerWidth <= 768

/* ─── Mobile KPI Card ─── */
function MobileKPI({ icon, label, value, color, bg, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'flex-start',
      background:'var(--bg2)', borderRadius:18,
      padding:'14px 16px', border:'1px solid var(--border)',
      cursor:'pointer', textAlign:'left', gap:6,
      WebkitTapHighlightColor:'transparent',
      transition:'transform .15s, box-shadow .15s',
      boxShadow:'0 1px 3px rgba(0,0,0,.15)',
    }}
      onTouchStart={e=>e.currentTarget.style.transform='scale(.97)'}
      onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <div style={{
        width:40, height:40, borderRadius:12,
        background:bg, display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ color, display:'flex' }}>{icon}</span>
      </div>
      <div style={{ fontFamily:'monospace', fontSize:20, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text2)', fontWeight:500 }}>{label}</div>
    </button>
  )
}

/* ─── Mobile Quick Action ─── */
function MobileAction({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:8, padding:'16px 8px',
      background:'var(--bg2)', borderRadius:16,
      border:'1px solid var(--border)',
      cursor:'pointer', WebkitTapHighlightColor:'transparent',
      transition:'transform .15s',
    }}
      onTouchStart={e=>e.currentTarget.style.transform='scale(.95)'}
      onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <div style={{
        width:48, height:48, borderRadius:14,
        background:color+'18', display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:22,
      }}>{icon}</div>
      <span style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textAlign:'center', lineHeight:1.3 }}>{label}</span>
    </button>
  )
}

/* ─── Mobile Status Row ─── */
function MobileStatus({ ok, label, okT, errT }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 0', borderBottom:'1px solid var(--border)',
    }}>
      <span style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{label}</span>
      <span style={{
        fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99,
        background:ok ? 'var(--greenbg)' : 'var(--yellowbg)',
        color:ok ? 'var(--green)' : 'var(--yellow)',
      }}>
        {ok ? `✅ ${okT}` : `⚠️ ${errT}`}
      </span>
    </div>
  )
}

export default function Dashboard({ onNav }) {
  const [stats,      setStats]      = useState(null)
  const [finance,    setFinance]    = useState([])
  const [attendance, setAttendance] = useState({ total:0, present:0, absent:0, list:[] })
  const [debtOrders, setDebtOrders] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [retrying,   setRetrying]   = useState(false)
  const [mobile,     setMobile]     = useState(isMobile())

  const [orderModal, setOrderModal] = useState(false)
  const [finModal,   setFinModal]   = useState(false)
  const [newOrder,   setNewOrder]   = useState({ customer:'', phone:'', description:'' })
  const [newFin,     setNewFin]     = useState({ type:'kirim', description:'', amount:'', category:'Buyurtma' })

  useEffect(() => {
    load()
    const onResize = () => setMobile(isMobile())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [stR, finR, attR, ordR] = await Promise.allSettled([
        api.getDashStats(), api.getFinance(),
        api.getAttendanceToday(), api.getOrders(),
      ])
      if (stR.status==='fulfilled') setStats(stR.value)
      const fins = Array.isArray(finR.value) ? finR.value : finR.value?.data || []
      setFinance(fins)
      if (attR.status==='fulfilled') setAttendance(attR.value)
      const ords = Array.isArray(ordR.value) ? ordR.value : ordR.value?.data || []
      setDebtOrders(ords.filter(o=>o.debt>0||(o.status==='tugallandi'&&!o.paid&&o.total>0)).slice(0,5))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function retry() { setRetrying(true); await load(); setRetrying(false) }

  async function doOrder() {
    if (!newOrder.customer||!newOrder.phone){toast('Ism va telefon!','err');return}
    try {
      await api.createOrder({...newOrder,status:'yangi',total:0,itemCount:0})
      toast('Yangi buyurtma ✅','ok'); setOrderModal(false)
      setNewOrder({customer:'',phone:'',description:''}); load()
    } catch(e){toast(e.message,'err')}
  }

  async function doFin() {
    if (!newFin.description||!newFin.amount){toast("To'ldiring!",'err');return}
    try {
      await api.createFinance({...newFin,amount:+newFin.amount,date:today,by:'Admin'})
      toast(`${newFin.type==='kirim'?'Kirim':'Chiqim'} qo'shildi ✅`,'ok')
      setFinModal(false); load()
    } catch(e){toast(e.message,'err')}
  }

  const kirim      = finance.filter(f=>f.type==='kirim').reduce((s,f)=>s+(f.amount||0),0)
  const chiqim     = finance.filter(f=>f.type==='chiqim').reduce((s,f)=>s+(f.amount||0),0)
  const balans     = kirim - chiqim
  const todayKirim = finance.filter(f=>f.type==='kirim'&&f.date===today).reduce((s,f)=>s+(f.amount||0),0)

  const KPI_CARDS = stats ? [
    { icon:<MdShoppingBag size={20}/>, lbl:'Faol buyurtmalar',   val:stats.activeOrders||0,      bg:'var(--accentbg)', c:'var(--accent)',  nav:'orders'   },
    { icon:<MdTrendingUp  size={20}/>, lbl:'Bugungi kirim',       val:fmt.currency(todayKirim),   bg:'var(--greenbg)',  c:'var(--green)',   nav:'finance'  },
    { icon:<MdTrendingDown size={20}/>,lbl:'Jami balans',         val:fmt.currency(balans),       bg:balans>=0?'var(--greenbg)':'var(--redbg)', c:balans>=0?'var(--green)':'var(--red)', nav:'finance' },
    { icon:<MdPeople      size={20}/>, lbl:'Bugun ish boshladilar',val:`${attendance.present}/${attendance.total}`,bg:'var(--yellowbg)',c:'var(--yellow)',nav:'salary' },
  ] : []

  const QUICK = [
    { icon:'📦', lbl:'Yangi buyurtma',  color:'var(--accent)',  action:()=>setOrderModal(true) },
    { icon:'🚛', lbl:'Transport',        color:'var(--green)',   action:()=>onNav?.('transport') },
    { icon:'💰', lbl:'Kirim',            color:'var(--yellow)',  action:()=>{setNewFin(p=>({...p,type:'kirim'}));setFinModal(true)} },
    { icon:'💸', lbl:'Chiqim',           color:'var(--red)',     action:()=>{setNewFin(p=>({...p,type:'chiqim'}));setFinModal(true)} },
    { icon:'🏠', lbl:'Uyga xizmat',      color:'var(--purple)',  action:()=>onNav?.('homeservice') },
    { icon:'🔧', lbl:'Sex topshirig\'i', color:'var(--orange)',  action:()=>onNav?.('workers') },
  ]

  const STATUS = [
    { lbl:'Asosiy server',        ok:!loading&&stats!==null, okT:'Ishlayapti',    errT:'Ulanmadi' },
    { lbl:"Ma'lumotlar bazasi",   ok:stats!==null,           okT:'Ulangan',       errT:'MongoDB ishlamayapti' },
    { lbl:'Telegram Bot',         ok:false,                  okT:'Ishlayapti',    errT:'Token kiritilmagan' },
    { lbl:'Tezkor xotira (Redis)',ok:true,                   okT:'Ishlayapti',    errT:'Oddiy rejim' },
    { lbl:'Internet aloqa',       ok:navigator.onLine,       okT:'Ulanilgan',     errT:'Offline rejim' },
  ]

  /* ════════════════════════════════
     MOBILE LAYOUT
  ════════════════════════════════ */
  if (mobile) return (
    <div style={{ padding:'12px 16px 100px', display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── KPI 2x2 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {loading
          ? [...Array(4)].map((_,i) => (
            <div key={i} style={{ background:'var(--bg2)', borderRadius:18, padding:16, height:110, animation:'pulse 1.5s infinite' }}/>
          ))
          : KPI_CARDS.map((k,i) => (
            <MobileKPI key={i}
              icon={k.icon} label={k.lbl} value={k.val}
              color={k.c} bg={k.bg}
              onClick={()=>onNav?.(k.nav)}
            />
          ))
        }
      </div>

      {/* ── Tezkor harakatlar ── */}
      <div style={{ background:'var(--bg2)', borderRadius:20, padding:'16px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          ⚡ Tezkor harakatlar
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {QUICK.map(q => (
            <MobileAction key={q.lbl} icon={q.icon} label={q.lbl} color={q.color} onClick={q.action}/>
          ))}
        </div>
      </div>

      {/* ── Bugungi davomat ── */}
      <div style={{ background:'var(--bg2)', borderRadius:20, padding:'16px', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>👷 Bugungi davomat</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{today}</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--green)' }}>✅ {attendance.present}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--red)'   }}>❌ {attendance.absent}</span>
          </div>
        </div>
        {attendance.list?.length===0
          ? <div style={{ fontSize:12, color:'var(--text3)', padding:'8px 0' }}>Ma'lumot yo'q — bot orqali keladi</div>
          : attendance.list?.slice(0,5).map(emp => (
            <div key={emp._id} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 0', borderBottom:'1px solid var(--border)',
            }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:emp.attendance?'var(--green)':'var(--red)', flexShrink:0 }}/>
              <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{emp.name}</span>
              {emp.attendance
                ? <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--green)' }}>{emp.attendance.checkIn}</span>
                : <span style={{ fontSize:11, color:'var(--red)', fontWeight:600 }}>Kelmadi</span>
              }
            </div>
          ))
        }
      </div>

      {/* ── Mijozlar qarzlari ── */}
      <div style={{ background:'var(--bg2)', borderRadius:20, padding:'16px', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>💳 Mijozlar qarzlari</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>onNav?.('finance')}>Barchasi →</button>
        </div>
        {debtOrders.length===0
          ? <div style={{ fontSize:12, color:'var(--text3)' }}>✅ Qarzli mijoz yo'q</div>
          : debtOrders.map(o => (
            <div key={o._id} style={{ display:'flex', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{o.customer}</div>
                <div style={{ fontSize:11, color:'var(--text2)' }}>{o.number} · {o.phone}</div>
              </div>
              <div style={{ fontWeight:800, fontFamily:'monospace', color:'var(--red)', fontSize:14 }}>
                {fmt.currency(o.debt||o.total)}
              </div>
            </div>
          ))
        }
      </div>

      {/* ── Moliyaviy holat ── */}
      <div style={{ background:'var(--bg2)', borderRadius:20, padding:'16px', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>💰 Moliyaviy holat</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>onNav?.('finance')}>Barchasi →</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { lbl:'Jami kirim',  val:kirim,  c:'var(--green)', icon:'📈' },
            { lbl:'Jami chiqim', val:chiqim, c:'var(--red)',   icon:'📉' },
            { lbl:'Balans',      val:balans, c:balans>=0?'var(--green)':'var(--red)', icon:'⚖️' },
          ].map(it => (
            <div key={it.lbl} style={{
              padding:'12px 10px', background:'var(--bg3)',
              borderRadius:14, textAlign:'center',
            }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{it.icon}</div>
              <div style={{ fontWeight:800, fontFamily:'monospace', fontSize:12, color:it.c }}>{fmt.currency(it.val)}</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{it.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tizim holati ── */}
      <div style={{ background:'var(--bg2)', borderRadius:20, padding:'16px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>🖥️ Tizim holati</div>
        {STATUS.map(s => <MobileStatus key={s.lbl} {...s}/>)}
        <button className="btn btn-ghost btn-sm" onClick={retry} disabled={retrying}
          style={{ marginTop:12, width:'100%', justifyContent:'center' }}>
          <MdRefresh size={14}/> Qayta tekshirish
        </button>
      </div>

      {/* Modals */}
      <DashModals
        orderModal={orderModal} setOrderModal={setOrderModal}
        finModal={finModal}     setFinModal={setFinModal}
        newOrder={newOrder}     setNewOrder={setNewOrder}
        newFin={newFin}         setNewFin={setNewFin}
        doOrder={doOrder}       doFin={doFin}
      />

      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  )

  /* ════════════════════════════════
     DESKTOP LAYOUT (o'zgarishsiz)
  ════════════════════════════════ */
  return (
    <div className="dash-wrap">
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {loading ? [...Array(4)].map((_,i)=>(<SkeletonKPI key={i}/>))
          : KPI_CARDS.map((k,i)=>(
          <div key={i} className="kpi-card" style={{cursor:'pointer',animationDelay:i*40+'ms'}} onClick={()=>onNav?.(k.nav)}>
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:k.bg}}><span style={{color:k.c}}>{k.icon}</span></div>
            </div>
            <div className="kpi-val" style={{color:k.c,fontSize:19}}>{k.val}</div>
            <div className="kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card">
            <div className="card-hd">
              <div><div className="card-title">👷 Bugungi davomat</div><div className="card-sub">{today}</div></div>
              <div style={{display:'flex',gap:10,fontSize:12}}>
                <span style={{color:'var(--green)',fontWeight:700}}>✅ {attendance.present} keldi</span>
                <span style={{color:'var(--red)',fontWeight:700}}>❌ {attendance.absent} kelmadi</span>
              </div>
            </div>
            {loading ? <div className="skel" style={{height:60}}/> : (
              <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:160,overflowY:'auto'}}>
                {attendance.list?.length===0
                  ? <div style={{color:'var(--text3)',fontSize:12,padding:8}}>Ma'lumot yo'q — bot orqali ishchilar keladi</div>
                  : attendance.list?.map(emp=>(
                    <div key={emp._id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:'var(--r)',background:'var(--bg3)'}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:emp.attendance?'var(--green)':'var(--red)',flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:600,flex:1}}>{emp.name}</span>
                      <span style={{fontSize:10,color:'var(--text2)'}}>{emp.role}</span>
                      {emp.attendance
                        ? <span style={{fontSize:11,fontFamily:'monospace',color:'var(--green)'}}>{emp.attendance.checkIn}</span>
                        : <span style={{fontSize:10,color:'var(--red)',fontWeight:600}}>Kelmadi</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-hd">
              <div><div className="card-title">💳 Mijozlar qarzlari</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>onNav?.('finance')}>Barchasi →</button>
            </div>
            {debtOrders.length===0
              ? <div style={{color:'var(--text3)',fontSize:12,padding:12}}>✅ Qarzli mijoz yo'q</div>
              : debtOrders.map(o=>(
                <div key={o._id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:12}}>{o.customer}</div>
                    <div style={{fontSize:11,color:'var(--text2)'}}>{o.number} · {o.phone}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:800,fontFamily:'monospace',color:'var(--red)',fontSize:13}}>{fmt.currency(o.debt||o.total)}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>qarz</div>
                  </div>
                </div>
              ))}
          </div>

          <div className="card">
            <div className="card-hd"><div className="card-title">💰 Moliyaviy holat</div><button className="btn btn-ghost btn-sm" onClick={()=>onNav?.('finance')}>Barchasi →</button></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[{lbl:'Jami kirim',val:kirim,c:'var(--green)',icon:'📈'},{lbl:'Jami chiqim',val:chiqim,c:'var(--red)',icon:'📉'},{lbl:'Balans',val:balans,c:balans>=0?'var(--green)':'var(--red)',icon:'⚖️'}].map(it=>(
                <div key={it.lbl} style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:'var(--r)',textAlign:'center'}}>
                  <div style={{fontSize:16,marginBottom:3}}>{it.icon}</div>
                  <div style={{fontWeight:800,fontFamily:'monospace',fontSize:13,color:it.c}}>{fmt.currency(it.val)}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{it.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card">
            <div className="card-hd"><div className="card-title">⚡ Tezkor harakatlar</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {QUICK.map(q=>(
                <button key={q.lbl} onClick={q.action} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 10px',borderRadius:'var(--r)',border:'1px solid var(--border)',background:'var(--bg3)',cursor:'pointer',transition:'all var(--t)',fontSize:12,fontWeight:600,color:'var(--text2)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=q.color;e.currentTarget.style.background=q.color+'11';e.currentTarget.style.color=q.color}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.color='var(--text2)'}}>
                  <span style={{fontSize:18}}>{q.icon}</span>{q.lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><div className="card-title">🖥️ Tizim holati</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {STATUS.map(s=>(
                <div key={s.lbl} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg3)',borderRadius:'var(--r)'}}>
                  <span style={{fontSize:12,fontWeight:500,flex:1}}>{s.lbl}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:s.ok?'var(--greenbg)':'var(--yellowbg)',color:s.ok?'var(--green)':'var(--yellow)',whiteSpace:'nowrap'}}>
                    {s.ok?`✅ ${s.okT}`:`⚠️ ${s.errT}`}
                  </span>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={retry} disabled={retrying} style={{marginTop:4}}>
                <MdRefresh size={13}/> Qayta tekshirish
              </button>
            </div>
          </div>

          {stats?.recentActivities?.length > 0 && (
            <div className="card">
              <div className="card-hd"><div className="card-title">🔔 So'nggi faoliyat</div></div>
              <div className="dash-feed">
                {stats.recentActivities.slice(0,6).map((a,i)=>(
                  <div key={i} className="dash-feed-item">
                    <span className="dash-feed-dot" style={{background:'var(--accent)'}}/>
                    <span className="dash-feed-msg">{a.msg}</span>
                    <span className="dash-feed-time">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DashModals
        orderModal={orderModal} setOrderModal={setOrderModal}
        finModal={finModal}     setFinModal={setFinModal}
        newOrder={newOrder}     setNewOrder={setNewOrder}
        newFin={newFin}         setNewFin={setNewFin}
        doOrder={doOrder}       doFin={doFin}
      />
    </div>
  )
}

/* ── Shared modals ── */
function DashModals({ orderModal, setOrderModal, finModal, setFinModal, newOrder, setNewOrder, newFin, setNewFin, doOrder, doFin }) {
  return (<>
    <Modal open={orderModal} onClose={()=>setOrderModal(false)} title="📦 Yangi buyurtma" size="sm"
      footer={<><button className="btn btn-ghost" onClick={()=>setOrderModal(false)}>Bekor</button><button className="btn btn-primary" onClick={doOrder}>Yaratish</button></>}>
      <div className="fg"><label className="flabel">Mijoz ismi *</label><input className="finput" value={newOrder.customer} onChange={e=>setNewOrder(p=>({...p,customer:e.target.value}))} autoFocus/></div>
      <div className="fg"><label className="flabel">Telefon *</label><input className="finput" placeholder="+998 90 000 00 00" value={newOrder.phone} onChange={e=>setNewOrder(p=>({...p,phone:e.target.value}))}/></div>
      <div className="fg"><label className="flabel">Tavsif</label><textarea className="ftextarea" rows={2} value={newOrder.description} onChange={e=>setNewOrder(p=>({...p,description:e.target.value}))}/></div>
    </Modal>

    <Modal open={finModal} onClose={()=>setFinModal(false)} title={newFin.type==='kirim'?'💰 Kirim':'💸 Chiqim'} size="sm"
      footer={<><button className="btn btn-ghost" onClick={()=>setFinModal(false)}>Bekor</button><button className={`btn ${newFin.type==='kirim'?'btn-success':'btn-danger'}`} onClick={doFin}>Saqlash</button></>}>
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {['kirim','chiqim'].map(t=>(
          <button key={t} className={`btn btn-sm ${newFin.type===t?(t==='kirim'?'btn-success':'btn-danger'):'btn-ghost'}`} onClick={()=>setNewFin(p=>({...p,type:t}))}>
            {t==='kirim'?'💰 Kirim':'💸 Chiqim'}
          </button>
        ))}
      </div>
      <div className="fg"><label className="flabel">Kategoriya</label>
        <select className="fselect" value={newFin.category} onChange={e=>setNewFin(p=>({...p,category:e.target.value}))}>
          {['Buyurtma','Transport','Kimyoviy','Kommunal','Maosh','Uy xizmati','Arenda','Bank','Svet','Suv/Gaz','Boshqa'].map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="fg"><label className="flabel">Tavsif *</label><input className="finput" value={newFin.description} onChange={e=>setNewFin(p=>({...p,description:e.target.value}))}/></div>
      <div className="fg"><label className="flabel">Miqdor (so'm) *</label><input className="finput" type="number" value={newFin.amount} onChange={e=>setNewFin(p=>({...p,amount:e.target.value}))}/></div>
    </Modal>
  </>)
}
