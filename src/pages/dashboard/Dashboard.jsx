import { useState, useEffect } from 'react'
import {
  MdShoppingBag, MdAttachMoney, MdPeople, MdDirectionsCar,
  MdTrendingUp, MdTrendingDown, MdBalance, MdRefresh,
  MdWarningAmber, MdCheckCircle, MdHourglassBottom,
  MdAdd, MdLocalShipping, MdConstruction,
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import './Dashboard.css'

const today = new Date().toISOString().slice(0,10)
const thisMonth = new Date().toISOString().slice(0,7)

export default function Dashboard({ onNav }) {
  const [stats,       setStats]       = useState(null)
  const [finance,     setFinance]     = useState([])
  const [attendance,  setAttendance]  = useState({ total:0, present:0, absent:0, list:[] })
  const [debtOrders,  setDebtOrders]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [retrying,    setRetrying]    = useState(false)

  /* Quick action modals */
  const [orderModal, setOrderModal] = useState(false)
  const [finModal,   setFinModal]   = useState(false)
  const [newOrder,   setNewOrder]   = useState({ customer:'', phone:'', description:'' })
  const [newFin,     setNewFin]     = useState({ type:'kirim', description:'', amount:'', category:'Buyurtma' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [stR, finR, attR, ordR] = await Promise.allSettled([
        api.getDashStats(),
        api.getFinance(),
        api.getAttendanceToday(),
        api.getOrders(),
      ])

      if (stR.status==='fulfilled') setStats(stR.value)

      const fins = (Array.isArray(finR.value) ? finR.value : finR.value?.data || [])
      setFinance(fins)

      if (attR.status==='fulfilled') setAttendance(attR.value)

      const ords = (Array.isArray(ordR.value) ? ordR.value : ordR.value?.data || [])
      // Qarzli mijozlar — tugallandi lekin to'lanmagan
      setDebtOrders(ords.filter(o => o.debt > 0 || (o.status==='tugallandi' && !o.paid && o.total > 0)).slice(0,5))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function retry() { setRetrying(true); await load(); setRetrying(false) }

  /* Finance calc */
  const kirim   = finance.filter(f=>f.type==='kirim').reduce((s,f)=>s+(f.amount||0),0)
  const chiqim  = finance.filter(f=>f.type==='chiqim').reduce((s,f)=>s++(f.amount||0),0)
  const balans  = kirim - chiqim
  const todayKirim  = finance.filter(f=>f.type==='kirim'&&f.date===today).reduce((s,f)=>s+(f.amount||0),0)

  /* Quick create order */
  async function doOrder() {
    if (!newOrder.customer||!newOrder.phone){toast('Ism va telefon!','err');return}
    try {
      await api.createOrder({...newOrder,status:'yangi',total:0,itemCount:0})
      toast('Yangi buyurtma ✅','ok'); setOrderModal(false); setNewOrder({customer:'',phone:'',description:''}); load()
    } catch(e){toast(e.message,'err')}
  }

  /* Quick add finance */
  async function doFin() {
    if (!newFin.description||!newFin.amount){toast("To'ldiring!",'err');return}
    try {
      await api.createFinance({...newFin,amount:+newFin.amount,date:today,by:'Admin'})
      toast(`${newFin.type==='kirim'?'Kirim':'Chiqim'} qo'shildi ✅`,'ok'); setFinModal(false); load()
    } catch(e){toast(e.message,'err')}
  }

  const KPI_CARDS = stats ? [
    { icon:<MdShoppingBag size={20}/>, lbl:"Faol buyurtmalar", val:stats.activeOrders||0,     bg:'var(--accentbg)', c:'var(--accent)',  nav:'orders'    },
    { icon:<MdTrendingUp  size={20}/>, lbl:"Bugungi kirim",    val:fmt.currency(todayKirim),  bg:'var(--greenbg)', c:'var(--green)',   nav:'finance'   },
    { icon:<MdTrendingDown size={20}/>,lbl:"Jami balans",      val:fmt.currency(balans),       bg:balans>=0?'var(--greenbg)':'var(--redbg)', c:balans>=0?'var(--green)':'var(--red)', nav:'finance' },
    { icon:<MdPeople      size={20}/>, lbl:"Bugun ish boshladilar", val:`${attendance.present}/${attendance.total}`, bg:'var(--yellowbg)', c:'var(--yellow)', nav:'salary' },
  ] : []

  return (
    <div className="dash-wrap">

      {/* KPI */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {loading ? [...Array(4)].map((_,i)=>(
          <SkeletonKPI key={i}/>)) : KPI_CARDS.map((k,i)=>(
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
        {/* Left */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Bugungi davomat */}
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
                        : <span style={{fontSize:10,color:'var(--red)',fontWeight:600}}>Kelmadi</span>
                      }
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Mijozlar qarzlari */}
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
              ))
            }
          </div>

          {/* Kirim/Chiqim bugun */}
          <div className="card">
            <div className="card-hd"><div className="card-title">💰 Moliyaviy holat</div><button className="btn btn-ghost btn-sm" onClick={()=>onNav?.('finance')}>Barchasi →</button></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[
                { lbl:'Jami kirim',  val:kirim,  c:'var(--green)', icon:'📈' },
                { lbl:'Jami chiqim', val:chiqim, c:'var(--red)',   icon:'📉' },
                { lbl:'Balans',      val:balans, c:balans>=0?'var(--green)':'var(--red)', icon:'⚖️' },
              ].map(it=>(
                <div key={it.lbl} style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:'var(--r)',textAlign:'center'}}>
                  <div style={{fontSize:16,marginBottom:3}}>{it.icon}</div>
                  <div style={{fontWeight:800,fontFamily:'monospace',fontSize:13,color:it.c}}>{fmt.currency(it.val)}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{it.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Quick actions */}
          <div className="card">
            <div className="card-hd"><div className="card-title">⚡ Tezkor harakatlar</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                { icon:'📦', lbl:'Yangi buyurtma',   c:'var(--accent)',  action:()=>setOrderModal(true) },
                { icon:'🚛', lbl:'Transport',          c:'var(--green)',   action:()=>onNav?.('transport') },
                { icon:'💰', lbl:"Kirim qo'shish",    c:'var(--yellow)',  action:()=>{setNewFin(p=>({...p,type:'kirim'}));setFinModal(true)} },
                { icon:'💸', lbl:"Chiqim qo'shish",   c:'var(--red)',     action:()=>{setNewFin(p=>({...p,type:'chiqim'}));setFinModal(true)} },
                { icon:'🏠', lbl:'Uyga xizmat',        c:'var(--purple)',  action:()=>onNav?.('homeservice') },
                { icon:'🔧', lbl:'Sex topshiriqlari',  c:'var(--orange)',  action:()=>onNav?.('workers') },
              ].map(q=>(
                <button key={q.lbl} onClick={q.action} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 10px',borderRadius:'var(--r)',border:'1px solid var(--border)',background:'var(--bg3)',cursor:'pointer',transition:'all var(--t)',fontSize:12,fontWeight:600,color:'var(--text2)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=q.c;e.currentTarget.style.background=q.c+'11';e.currentTarget.style.color=q.c}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.color='var(--text2)'}}>
                  <span style={{fontSize:18}}>{q.icon}</span>{q.lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Tizim holati */}
          <div className="card">
            <div className="card-hd"><div className="card-title">🖥️ Tizim holati</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                { icon:'🖥️', lbl:'Asosiy server',          ok:!loading&&stats!==null, okT:'Ishlayapti',          errT:'Ulanmadi' },
                { icon:'🗄️', lbl:"Ma'lumotlar bazasi",     ok:stats!==null,           okT:'Ulangan',             errT:'MongoDB ishlamayapti' },
                { icon:'🤖', lbl:'Telegram Bot',            ok:false,                  okT:'Bot ishlayapti',      errT:'Settings → BOT_TOKEN kiriting' },
                { icon:'⚡', lbl:'Tezkor xotira (Redis)',   ok:true,                   okT:"Ishlayapti",          errT:'Oddiy rejim' },
                { icon:'🌐', lbl:'Internet aloqa',          ok:navigator.onLine,       okT:'Ulanilgan',           errT:'Uzilgan — offline rejim' },
              ].map(s=>(
                <div key={s.lbl} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg3)',borderRadius:'var(--r)'}}>
                  <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
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

          {/* So'nggi faoliyat */}
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

      {/* Order modal */}
      <Modal open={orderModal} onClose={()=>setOrderModal(false)} title="📦 Yangi buyurtma" size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>setOrderModal(false)}>Bekor</button><button className="btn btn-primary" onClick={doOrder}>Yaratish</button></>}>
        <div className="fg"><label className="flabel">Mijoz ismi *</label><input className="finput" value={newOrder.customer} onChange={e=>setNewOrder(p=>({...p,customer:e.target.value}))} autoFocus/></div>
        <div className="fg"><label className="flabel">Telefon *</label><input className="finput" placeholder="+998 90 000 00 00" value={newOrder.phone} onChange={e=>setNewOrder(p=>({...p,phone:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">Tavsif</label><textarea className="ftextarea" rows={2} value={newOrder.description} onChange={e=>setNewOrder(p=>({...p,description:e.target.value}))}/></div>
      </Modal>

      {/* Finance modal */}
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
    </div>
  )
}
