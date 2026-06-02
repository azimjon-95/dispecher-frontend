import { useState, useEffect } from 'react'
import {
  MdShoppingBag, MdFlashOn, MdAttachMoney, MdPeople,
  MdDirectionsCar, MdBalance, MdTrendingUp, MdTrendingDown,
  MdAdd, MdLocalShipping, MdBarChart, MdRefresh,
  MdConstruction, MdCheckCircle, MdHourglassBottom, MdWarning
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, toast } from '../../components/ui/UI.jsx'
import './Dashboard.css'

const BARS = [
  {d:'Du',v:420000},{d:'Se',v:680000},{d:'Ch',v:310000},
  {d:'Pa',v:790000},{d:'Ju',v:550000},{d:'Sh',v:920000},{d:'Ya',v:340000},
]
const maxV = Math.max(...BARS.map(b=>b.v))

const STAGE_LABELS = {
  yangi:'Yangi',qabul_qilindi:'Qabul',yuvishda:'Yuvish',
  qurishda:'Quritish',bezakda:'Bezak',yetkazishda:'Yetkazish',tugallandi:'Tugallandi'
}
const STAGE_COLORS = {
  yangi:'var(--accent)',qabul_qilindi:'var(--yellow)',yuvishda:'#58a6ff',
  qurishda:'var(--orange)',bezakda:'var(--purple)',yetkazishda:'#f0883e',tugallandi:'var(--green)'
}

export default function Dashboard({ onNav }) {
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [orderModal, setOrderModal] = useState(false)
  const [finModal,   setFinModal]   = useState(false)
  const [newOrder,   setNewOrder]   = useState({ customer:'', phone:'', description:'' })
  const [newFin,     setNewFin]     = useState({ type:'kirim', description:'', amount:'' })
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [st, ords] = await Promise.all([
        api.getDashStats(),
        api.getOrders().then(r=>Array.isArray(r)?r:r?.data||[]).catch(()=>[]),
      ])
      setStats(st)
      setRecentOrders(ords.slice(0,5))
    } catch {}
    setLoading(false)
  }

  async function retry() { setRetrying(true); await load(); setRetrying(false) }

  /* Quick action: create order */
  async function doCreateOrder() {
    if (!newOrder.customer||!newOrder.phone) { toast('Ism va telefon kerak!','err'); return }
    try {
      await api.createOrder({ ...newOrder, status:'yangi', total:0, itemCount:0 })
      toast('Yangi buyurtma yaratildi ✅','ok')
      setOrderModal(false); setNewOrder({customer:'',phone:'',description:''})
      load()
    } catch(e){ toast(e.message,'err') }
  }

  /* Quick action: add finance */
  async function doAddFin() {
    if (!newFin.description||!newFin.amount){ toast('Maydonlarni to\'ldiring!','err'); return }
    try {
      await api.createFinance({ ...newFin, date:new Date().toISOString().slice(0,10), by:'Admin' })
      toast(`${newFin.type==='kirim'?'Kirim':'Chiqim'} qo'shildi ✅`,'ok')
      setFinModal(false); setNewFin({type:'kirim',description:'',amount:''})
      load()
    } catch(e){ toast(e.message,'err') }
  }

  const KPIS = stats ? [
    { Icon:MdShoppingBag,   lbl:'Jami buyurtmalar', val:stats.totalOrders,             trend:'+12%', up:true,  bg:'var(--accentbg)', c:'var(--accent)'  },
    { Icon:MdFlashOn,       lbl:'Faol buyurtmalar', val:stats.activeOrders,            trend:'+3',   up:true,  bg:'var(--yellowbg)', c:'var(--yellow)'  },
    { Icon:MdAdd,           lbl:'Yangi buyurtmalar',val:stats.newOrders||0,            trend:'',     up:true,  bg:'var(--purplebg)', c:'var(--purple)'  },
    { Icon:MdAttachMoney,   lbl:'Jami kirim',        val:fmt.currency(stats.todayRevenue),trend:'+8%',up:true, bg:'var(--greenbg)',  c:'var(--green)'   },
    { Icon:MdPeople,        lbl:'Mijozlar',          val:stats.totalCustomers,          trend:'+2',   up:true,  bg:'var(--purplebg)', c:'var(--purple)'  },
    { Icon:MdDirectionsCar, lbl:'Faol shafyorlar',  val:stats.activeDrivers,           trend:'',     up:true,  bg:'var(--orangebg)', c:'var(--orange)'  },
    { Icon:MdLocalShipping, lbl:'Kutayotgan yetkazish',val:stats.pendingDeliveries||0, trend:'',     up:false, bg:'var(--yellowbg)', c:'var(--yellow)'  },
    { Icon:MdBalance,       lbl:'Balans',             val:fmt.currency(stats.balance),  trend:'',     up:stats.balance>=0, bg:stats.balance>=0?'var(--greenbg)':'var(--redbg)', c:stats.balance>=0?'var(--green)':'var(--red)' },
  ] : []

  /* Monitoring: stage breakdown */
  const stageData = stats?.stages ? Object.entries(stats.stages)
    .filter(([k])=>k!=='tugallandi')
    .sort((a,b)=>b[1]-a[1]) : []

  const totalActive = stageData.reduce((s,[,v])=>s+v,0)

  return (
    <div className="dash-wrap">

      {/* KPI Cards */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {loading
          ? [...Array(8)].map((_,i)=>(
              <div key={i} className="kpi-card">
                <div className="skel" style={{height:32,width:32,borderRadius:'var(--r)'}}/>
                <div className="skel" style={{height:24,width:'60%',marginTop:8}}/>
                <div className="skel" style={{height:12,width:'40%',marginTop:6}}/>
              </div>
            ))
          : KPIS.length
            ? KPIS.map((k,i)=>(
                <div key={i} className="kpi-card" style={{animationDelay:i*30+'ms'}}>
                  <div className="kpi-hd">
                    <div className="kpi-icon" style={{background:k.bg}}>
                      <k.Icon size={18} style={{color:k.c}}/>
                    </div>
                    {k.trend && (
                      <span className={`kpi-trend ${k.up?'trend-up':'trend-down'}`}>
                        {k.up?<MdTrendingUp size={11}/>:<MdTrendingDown size={11}/>} {k.trend}
                      </span>
                    )}
                  </div>
                  <div className="kpi-val" style={{color:k.c,fontSize:20}}>{k.val}</div>
                  <div className="kpi-lbl">{k.lbl}</div>
                </div>
              ))
            : (
                <div className="kpi-card" style={{gridColumn:'1/-1',textAlign:'center',padding:24}}>
                  <div style={{color:'var(--text2)',marginBottom:12}}>⚠️ Server bilan aloqa yo'q</div>
                  <button className="btn btn-primary btn-sm" onClick={retry} disabled={retrying}>
                    <MdRefresh size={14}/> {retrying?'Yuklanmoqda...':'Qayta urinish'}
                  </button>
                </div>
              )
        }
      </div>

      <div className="g2">
        {/* Left column */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Bar Chart */}
          <div className="card">
            <div className="card-hd">
              <div>
                <div className="card-title"><MdBarChart size={15} style={{verticalAlign:'middle',marginRight:5}}/>Haftalik daromad</div>
                <div className="card-sub">So'mda</div>
              </div>
              <span className="badge b-green">↑ 18%</span>
            </div>
            <div className="dash-chart">
              {BARS.map(b=>(
                <div key={b.d} className="dash-chart-col">
                  <div className="dash-chart-val">{Math.round(b.v/1000)}k</div>
                  <div className="dash-chart-outer">
                    <div className="dash-chart-bar" style={{height:(b.v/maxV*100)+'%'}}/>
                  </div>
                  <div className="dash-chart-day">{b.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage monitoring */}
          {stageData.length > 0 && (
            <div className="card">
              <div className="card-hd">
                <div className="card-title">🔄 Bosqichlar monitoring</div>
                <span style={{fontSize:11,color:'var(--text2)'}}>{totalActive} ta aktiv mahsulot</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {stageData.map(([stage, count])=>{
                  const pct = totalActive>0 ? Math.round((count/totalActive)*100) : 0
                  const color = STAGE_COLORS[stage] || 'var(--text2)'
                  return (
                    <div key={stage}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:12}}>
                        <span style={{fontWeight:600}}>{STAGE_LABELS[stage]||stage}</span>
                        <span className="mono" style={{color}}>{count} ta · {pct}%</span>
                      </div>
                      <div style={{height:6,background:'var(--bg4)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',background:color,borderRadius:99,width:pct+'%',transition:'width .5s ease'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent orders */}
          {recentOrders.length > 0 && (
            <div className="card">
              <div className="card-hd"><div className="card-title">📋 So'nggi buyurtmalar</div></div>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {recentOrders.map((o,i)=>{
                  const col = STAGE_COLORS[o.status]||'var(--text3)'
                  return (
                    <div key={o._id||i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<recentOrders.length-1?'1px solid var(--border)':'none'}}>
                      <div style={{width:4,height:32,borderRadius:99,background:col,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:12,fontFamily:'monospace',color:'var(--accent)'}}>{o.number}</div>
                        <div style={{fontSize:11,color:'var(--text2)'}}>{o.customer}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:11,fontWeight:700,fontFamily:'monospace',color:'var(--green)'}}>{fmt.currency(o.total)}</div>
                        <div style={{fontSize:10,color:col,fontWeight:600}}>{STAGE_LABELS[o.status]||o.status}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Quick Actions — WORKING */}
          <div className="card">
            <div className="card-hd"><div className="card-title">⚡ Tezkor harakatlar</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                { Icon:MdAdd,           lbl:'Yangi buyurtma',      c:'var(--accent)',  action:()=>setOrderModal(true) },
                { Icon:MdLocalShipping, lbl:'Transport sahifasi',   c:'var(--green)',   action:()=>onNav?.('transport') },
                { Icon:MdAttachMoney,   lbl:"Kirim qo'shish",      c:'var(--yellow)',  action:()=>{setNewFin(p=>({...p,type:'kirim'}));setFinModal(true)} },
                { Icon:MdConstruction,  lbl:'Sex topshiriqlari',    c:'var(--purple)',  action:()=>onNav?.('workers') },
              ].map(q=>(
                <button key={q.lbl} className="btn btn-ghost"
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'14px 8px',border:'1px solid var(--border)',borderRadius:'var(--r)',cursor:'pointer',transition:'all var(--t)',fontSize:11,fontWeight:600,color:'var(--text2)'}}
                  onClick={q.action}
                  onMouseEnter={e=>{e.currentTarget.style.color=q.c;e.currentTarget.style.borderColor=q.c;e.currentTarget.style.background=q.c+'11'}}
                  onMouseLeave={e=>{e.currentTarget.style.color='var(--text2)';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent'}}
                >
                  <q.Icon size={22} style={{color:'inherit'}}/>
                  {q.lbl}
                </button>
              ))}
            </div>
          </div>

          {/* System health */}
          <div className="card">
            <div className="card-hd"><div className="card-title">🖥️ Tizim holati</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                { lbl:'Backend API',  ok:!loading,             icon:<MdCheckCircle size={14}/> },
                { lbl:'Ma\'lumotlar bazasi', ok:stats!==null,   icon:<MdCheckCircle size={14}/> },
                { lbl:'Telegram Bot', ok:false,                 icon:<MdWarning size={14}/>     },
                { lbl:'Redis Cache',  ok:true,                  icon:<MdCheckCircle size={14}/> },
              ].map(s=>(
                <div key={s.lbl} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'var(--bg3)',borderRadius:'var(--r)'}}>
                  <span style={{fontSize:12,fontWeight:500}}>{s.lbl}</span>
                  <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:s.ok?'var(--green)':'var(--yellow)'}}>
                    {s.icon} {s.ok?'Ishlayapti':'Sozlash kerak'}
                  </span>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={retry} disabled={retrying} style={{marginTop:4}}>
                <MdRefresh size={13}/> Holatni tekshirish
              </button>
            </div>
          </div>

          {/* Live Feed */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🔴 Jonli xabarnoma</div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:'var(--green)'}}>
                <span className="live-dot"/>LIVE
              </div>
            </div>
            <div className="dash-feed">
              {[
                {msg:'Yangi buyurtma #1048 keldi',    t:'1 daqiqa',  c:'var(--accent)'},
                {msg:"Buyurtma #1044 tayyor bo'ldi",  t:'5 daqiqa',  c:'var(--green)'},
                {msg:'Sardor M. buyurtma olib ketdi', t:'12 daqiqa', c:'var(--yellow)'},
                {msg:'Malika T. to\'lov qildi',       t:'28 daqiqa', c:'var(--purple)'},
                {msg:'Zulfiya H. — yuvish bajardi',   t:'45 daqiqa', c:'#58a6ff'},
              ].map((f,i)=>(
                <div key={i} className="dash-feed-item">
                  <span className="dash-feed-dot" style={{background:f.c}}/>
                  <span className="dash-feed-msg">{f.msg}</span>
                  <span className="dash-feed-time">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick order modal */}
      <Modal open={orderModal} onClose={()=>setOrderModal(false)} title="📦 Yangi buyurtma" size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setOrderModal(false)}>Bekor</button>
          <button className="btn btn-primary" onClick={doCreateOrder}>Yaratish</button>
        </>}
      >
        <div className="fg"><label className="flabel">Mijoz ismi *</label>
          <input className="finput" value={newOrder.customer} onChange={e=>setNewOrder(p=>({...p,customer:e.target.value}))} autoFocus/></div>
        <div className="fg"><label className="flabel">Telefon *</label>
          <input className="finput" placeholder="+998 90 000 00 00" value={newOrder.phone} onChange={e=>setNewOrder(p=>({...p,phone:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">Tavsif</label>
          <textarea className="ftextarea" rows={2} placeholder="3 ta gilam, 2 ta ko'rpa..." value={newOrder.description} onChange={e=>setNewOrder(p=>({...p,description:e.target.value}))}/></div>
      </Modal>

      {/* Quick finance modal */}
      <Modal open={finModal} onClose={()=>setFinModal(false)} title={newFin.type==='kirim'?'💰 Kirim qo\'shish':'💸 Chiqim qo\'shish'} size="sm"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setFinModal(false)}>Bekor</button>
          <button className={`btn ${newFin.type==='kirim'?'btn-success':'btn-danger'}`} onClick={doAddFin}>Saqlash</button>
        </>}
      >
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          {['kirim','chiqim'].map(t=>(
            <button key={t} className={`btn btn-sm ${newFin.type===t?(t==='kirim'?'btn-success':'btn-danger'):'btn-ghost'}`}
              onClick={()=>setNewFin(p=>({...p,type:t}))}>
              {t==='kirim'?'💰 Kirim':'💸 Chiqim'}
            </button>
          ))}
        </div>
        <div className="fg"><label className="flabel">Tavsif *</label>
          <input className="finput" value={newFin.description} onChange={e=>setNewFin(p=>({...p,description:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">Miqdor (so'm) *</label>
          <input className="finput" type="number" value={newFin.amount} onChange={e=>setNewFin(p=>({...p,amount:+e.target.value}))}/></div>
      </Modal>
    </div>
  )
}
