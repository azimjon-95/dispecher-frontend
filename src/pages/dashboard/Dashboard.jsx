import { useState, useEffect, useCallback, useRef } from 'react'
import { MdRefresh, MdAdd, MdChevronRight, MdTrendingUp, MdTrendingDown } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { Modal, toast } from '../../components/ui/UI.jsx'
import './Dashboard.css'
import { useRealtime } from '../../services/realtime.js'

const today    = new Date().toISOString().slice(0,10)
const isMob    = () => window.innerWidth <= 768

/* ══════════════════════════════════════════
   MOBILE DASHBOARD — iOS 18 / Linear style
══════════════════════════════════════════ */

function MobDashboard({ stats, finance, attendance, debtOrders, loading, onNav, onOrder, onFin, retry, retrying }) {
  const kirim  = finance.filter(f=>f.type==='kirim').reduce((s,f)=>s+(f.amount||0),0)
  const chiqim = finance.filter(f=>f.type==='chiqim').reduce((s,f)=>s+(f.amount||0),0)
  const balans = kirim - chiqim
  const todayK = finance.filter(f=>f.type==='kirim'&&f.date===today).reduce((s,f)=>s+(f.amount||0),0)

  const scrollRef = useRef(null)

  return (
    <div style={{
      minHeight:'100vh',
      background:'var(--bg)',
      paddingBottom:80,
      overflowX:'hidden',
    }}>

      {/* ══ HERO STRIP ══ */}
      <div style={{
        background:'linear-gradient(160deg,#1a1f3a 0%,#0d1117 100%)',
        padding:'14px 16px 20px',
        position:'relative',
        overflow:'hidden',
      }}>
        {/* Glow */}
        <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,borderRadius:'50%',background:'rgba(59,130,246,.12)',filter:'blur(40px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-40,left:-40,width:160,height:160,borderRadius:'50%',background:'rgba(6,182,212,.08)',filter:'blur(30px)',pointerEvents:'none'}}/>

        {/* Greeting */}
        <div style={{fontSize:13,color:'rgba(255,255,255,.45)',fontWeight:500,marginBottom:2}}>
          {new Date().getHours()<12?'🌅 Xayrli tong':new Date().getHours()<18?'☀️ Xayrli kun':'🌙 Xayrli kech'}
        </div>
        <div style={{fontSize:22,fontWeight:800,color:'white',marginBottom:16,letterSpacing:'-.3px'}}>
          Tartib CRM
        </div>

        {/* Main metric */}
        <div style={{
          background:'rgba(255,255,255,.05)',
          border:'1px solid rgba(255,255,255,.08)',
          borderRadius:20,
          padding:'16px 20px',
          backdropFilter:'blur(20px)',
        }}>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
            Bugungi kirim
          </div>
          {loading
            ? <div style={{height:36,width:160,borderRadius:8,background:'rgba(255,255,255,.08)',animation:'mobSkel 1.4s ease-in-out infinite'}}/>
            : <div style={{fontSize:32,fontWeight:900,color:'#22c55e',fontFamily:'monospace',letterSpacing:'-1px'}}>
                {fmt.currency(todayK)}
              </div>
          }
          <div style={{display:'flex',gap:16,marginTop:10}}>
            {[
              {lbl:'Balans', val:fmt.currency(balans), c:balans>=0?'#22c55e':'#f85149'},
              {lbl:'Chiqim', val:fmt.currency(chiqim), c:'#f85149'},
            ].map(it=>(
              <div key={it.lbl}>
                <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:1}}>{it.lbl}</div>
                <div style={{fontSize:14,fontWeight:700,color:it.c,fontFamily:'monospace'}}>{it.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ KPI SCROLL STRIP ══ */}
      <div style={{
        display:'flex',gap:8,
        overflowX:'auto',padding:'12px 16px 2px',
        scrollbarWidth:'none',
        WebkitOverflowScrolling:'touch',
        msOverflowStyle:'none',
      }}>
        {[
          {emoji:'📦',lbl:'Faol buyurtma',val:loading?'…':stats?.activeOrders||0,c:'#3B82F6',nav:'orders'},
          {emoji:'👷',lbl:'Ishchilar',val:loading?'…':`${attendance.present}/${attendance.total}`,c:'#f59e0b',nav:'salary'},
          {emoji:'🚗',lbl:'Transport',val:loading?'…':stats?.activeDeliveries||0,c:'#22c55e',nav:'transport'},
          {emoji:'💳',lbl:'Qarzlar',val:loading?'…':debtOrders.length,c:'#f85149',nav:'finance'},
        ].map((k,i)=>(
          <button key={i} onClick={()=>onNav?.(k.nav)} style={{
            flexShrink:0,
            display:'flex',flexDirection:'column',gap:6,
            padding:'14px 16px',
            background:'var(--bg2)',
            border:'1px solid var(--border)',
            borderRadius:18,
            minWidth:100,
            cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
            textAlign:'left',
          }}
            onTouchStart={e=>{e.currentTarget.style.transform='scale(.95)';e.currentTarget.style.opacity='.8'}}
            onTouchEnd={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.opacity='1'}}
          >
            <span style={{fontSize:22}}>{k.emoji}</span>
            <span style={{fontSize:24,fontWeight:900,color:k.c,fontFamily:'monospace',lineHeight:1}}>{k.val}</span>
            <span style={{fontSize:11,color:'var(--text2)',fontWeight:500}}>{k.lbl}</span>
          </button>
        ))}
        <style>{`::-webkit-scrollbar{display:none}`}</style>
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <div style={{padding:'10px 16px 0'}}>
        <div style={{
          display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,
        }}>
          {[
            {emoji:'📦',lbl:'Buyurtma', c:'#3B82F6', action:onOrder},
            {emoji:'💰',lbl:'Kirim',    c:'#22c55e', action:()=>onFin('kirim')},
            {emoji:'💸',lbl:'Chiqim',   c:'#f85149', action:()=>onFin('chiqim')},
            {emoji:'🚛',lbl:'Transport',c:'#f59e0b', action:()=>onNav?.('transport')},
          ].map(q=>(
            <button key={q.lbl} onClick={q.action} style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:6,padding:'12px 6px',
              background:'var(--bg2)',
              border:'1px solid var(--border)',
              borderRadius:18,
              cursor:'pointer',
              WebkitTapHighlightColor:'transparent',
              transition:'transform .12s, opacity .12s',
            }}
              onTouchStart={e=>{e.currentTarget.style.transform='scale(.92)';e.currentTarget.style.opacity='.75'}}
              onTouchEnd={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.opacity='1'}}
            >
              <div style={{
                width:44,height:44,borderRadius:14,
                background:`${q.c}18`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:20,
              }}>{q.emoji}</div>
              <span style={{fontSize:11,fontWeight:600,color:'var(--text2)'}}>{q.lbl}</span>
            </button>
          ))}
        </div>

        {/* Ikkinchi qator */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginTop:7}}>
          {[
            {emoji:'🏠',lbl:'Uyga xizmat', c:'#8b5cf6', action:()=>onNav?.('homeservice')},
            {emoji:'🔧',lbl:'Sex ishi',    c:'#f97316', action:()=>onNav?.('workers')},
            {emoji:'👥',lbl:'Xodimlar',   c:'#06B6D4', action:()=>onNav?.('employees')},
            {emoji:'📊',lbl:'Moliya',      c:'#ec4899', action:()=>onNav?.('finance')},
          ].map(q=>(
            <button key={q.lbl} onClick={q.action} style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:6,padding:'12px 6px',
              background:'var(--bg2)',
              border:'1px solid var(--border)',
              borderRadius:18,
              cursor:'pointer',
              WebkitTapHighlightColor:'transparent',
            }}
              onTouchStart={e=>{e.currentTarget.style.transform='scale(.92)';e.currentTarget.style.opacity='.75'}}
              onTouchEnd={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.opacity='1'}}
            >
              <div style={{
                width:44,height:44,borderRadius:14,
                background:`${q.c}18`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:20,
              }}>{q.emoji}</div>
              <span style={{fontSize:11,fontWeight:600,color:'var(--text2)'}}>{q.lbl}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ DAVOMAT CARD ══ */}
      <div style={{padding:'10px 16px 0'}}>
        <div style={{
          background:'var(--bg2)',
          border:'1px solid var(--border)',
          borderRadius:20,overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'14px 16px',
            borderBottom:'1px solid var(--border)',
          }}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>👷 Bugungi davomat</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{today}</div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <span style={{
                fontSize:12,fontWeight:700,color:'#22c55e',
                background:'rgba(34,197,94,.1)',padding:'3px 8px',borderRadius:99,
              }}>✅ {attendance.present}</span>
              <span style={{
                fontSize:12,fontWeight:700,color:'#f85149',
                background:'rgba(248,81,73,.1)',padding:'3px 8px',borderRadius:99,
              }}>❌ {attendance.absent}</span>
            </div>
          </div>
          {/* List */}
          {attendance.list?.length===0
            ? <div style={{padding:'16px',fontSize:12,color:'var(--text3)',textAlign:'center'}}>
                Ma'lumot yo'q — bot orqali ishchilar belgilanadi
              </div>
            : attendance.list?.slice(0,5).map((emp,i)=>(
              <div key={emp._id} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'11px 16px',
                borderBottom: i<Math.min(attendance.list.length,5)-1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Avatar */}
                <div style={{
                  width:34,height:34,borderRadius:10,
                  background:emp.attendance?'rgba(34,197,94,.15)':'rgba(248,81,73,.15)',
                  border:`1.5px solid ${emp.attendance?'rgba(34,197,94,.3)':'rgba(248,81,73,.3)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:14,fontWeight:800,
                  color:emp.attendance?'#22c55e':'#f85149',
                  flexShrink:0,
                }}>
                  {emp.name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{emp.name}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{emp.role}</div>
                </div>
                {emp.attendance
                  ? <span style={{fontSize:12,fontFamily:'monospace',color:'#22c55e',fontWeight:700}}>{emp.attendance.checkIn}</span>
                  : <span style={{fontSize:11,color:'#f85149',fontWeight:700,background:'rgba(248,81,73,.1)',padding:'2px 7px',borderRadius:99}}>Kelmadi</span>
                }
              </div>
            ))
          }
        </div>
      </div>

      {/* ══ QARZLAR CARD ══ */}
      {debtOrders.length > 0 && (
        <div style={{padding:'8px 16px 0'}}>
          <div style={{
            background:'var(--bg2)',
            border:'1px solid rgba(248,81,73,.2)',
            borderRadius:20,overflow:'hidden',
          }}>
            <div style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'14px 16px',borderBottom:'1px solid var(--border)',
            }}>
              <div style={{fontSize:14,fontWeight:700}}>💳 Mijozlar qarzlari</div>
              <button onClick={()=>onNav?.('finance')} style={{
                fontSize:12,color:'#3B82F6',background:'none',border:'none',
                cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:2,
              }}>Barchasi <MdChevronRight size={14}/></button>
            </div>
            {debtOrders.map((o,i)=>(
              <div key={o._id} style={{
                display:'flex',alignItems:'center',
                padding:'12px 16px',
                borderBottom:i<debtOrders.length-1?'1px solid var(--border)':'none',
              }}>
                <div style={{
                  width:36,height:36,borderRadius:11,
                  background:'rgba(248,81,73,.12)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,marginRight:12,flexShrink:0,
                }}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{o.customer}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{o.number} · {o.phone}</div>
                </div>
                <div style={{
                  fontWeight:800,fontFamily:'monospace',
                  color:'#f85149',fontSize:13,
                  background:'rgba(248,81,73,.1)',
                  padding:'4px 9px',borderRadius:9,
                }}>{fmt.currency(o.debt||o.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ MOLIYA CARD ══ */}
      <div style={{padding:'8px 16px 0'}}>
        <div style={{
          background:'var(--bg2)',
          border:'1px solid var(--border)',
          borderRadius:20,overflow:'hidden',
        }}>
          <div style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'14px 16px',borderBottom:'1px solid var(--border)',
          }}>
            <div style={{fontSize:14,fontWeight:700}}>💰 Moliyaviy holat</div>
            <button onClick={()=>onNav?.('finance')} style={{fontSize:12,color:'#3B82F6',background:'none',border:'none',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:2}}>
              Barchasi <MdChevronRight size={14}/>
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0}}>
            {[
              {lbl:'Kirim',  val:kirim,  c:'#22c55e', icon:'📈', border:true},
              {lbl:'Chiqim', val:chiqim, c:'#f85149', icon:'📉', border:true},
              {lbl:'Balans', val:balans, c:balans>=0?'#22c55e':'#f85149', icon:'⚖️', border:false},
            ].map((it,i)=>(
              <div key={it.lbl} style={{
                padding:'14px 10px',textAlign:'center',
                borderRight:it.border?'1px solid var(--border)':'none',
              }}>
                <div style={{fontSize:18,marginBottom:5}}>{it.icon}</div>
                <div style={{fontWeight:800,fontFamily:'monospace',fontSize:13,color:it.c,marginBottom:2}}>{fmt.currency(it.val)}</div>
                <div style={{fontSize:10,color:'var(--text3)',fontWeight:500}}>{it.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TIZIM HOLATI ══ */}
      <div style={{padding:'8px 16px 0'}}>
        <div style={{
          background:'var(--bg2)',
          border:'1px solid var(--border)',
          borderRadius:20,overflow:'hidden',
        }}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',fontSize:14,fontWeight:700}}>
            🖥️ Tizim holati
          </div>
          {[
            {lbl:'Asosiy server',        ok:stats!==null,     okT:'Ishlayapti',  errT:'Ulanmadi'},
            {lbl:"Ma'lumotlar bazasi",   ok:stats!==null,     okT:'Ulangan',     errT:'MongoDB off'},
            {lbl:'Telegram Bot',         ok:false,            okT:'Active',      errT:'Token kiritilmagan'},
            {lbl:'Redis cache',          ok:true,             okT:'Ishlayapti',  errT:'Oddiy rejim'},
            {lbl:'Internet',             ok:navigator.onLine, okT:'Ulanilgan',   errT:'Offline rejim'},
          ].map((s,i,arr)=>(
            <div key={s.lbl} style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'11px 16px',
              borderBottom:i<arr.length-1?'1px solid var(--border)':'none',
            }}>
              <span style={{fontSize:13,fontWeight:500}}>{s.lbl}</span>
              <span style={{
                fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:99,
                background:s.ok?'rgba(34,197,94,.12)':'rgba(245,158,11,.12)',
                color:s.ok?'#22c55e':'#f59e0b',
              }}>
                {s.ok?`✅ ${s.okT}`:`⚠️ ${s.errT}`}
              </span>
            </div>
          ))}
          <div style={{padding:'10px 16px'}}>
            <button onClick={retry} disabled={retrying} style={{
              width:'100%',padding:'11px',borderRadius:12,
              background:'var(--bg3)',border:'1px solid var(--border)',
              color:'var(--text2)',fontSize:12,fontWeight:600,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            }}>
              <MdRefresh size={14} style={{animation:retrying?'mobSpin 1s linear infinite':'none'}}/> Qayta tekshirish
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes mobSpin{to{transform:rotate(360deg)}}
        @keyframes mobSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════
   DESKTOP DASHBOARD (o'zgarmadi)
══════════════════════════════════════════ */
function DeskDashboard({ stats, finance, attendance, debtOrders, loading, onNav, onOrder, onFin, retry, retrying }) {
  const kirim  = finance.filter(f=>f.type==='kirim').reduce((s,f)=>s+(f.amount||0),0)
  const chiqim = finance.filter(f=>f.type==='chiqim').reduce((s,f)=>s+(f.amount||0),0)
  const balans = kirim - chiqim
  const todayK = finance.filter(f=>f.type==='kirim'&&f.date===today).reduce((s,f)=>s+(f.amount||0),0)

  const KPI = stats ? [
    {icon:'📦',lbl:'Faol buyurtmalar',  val:stats.activeOrders||0,      bg:'var(--accentbg)', c:'var(--accent)',  nav:'orders'},
    {icon:'📈',lbl:'Bugungi kirim',      val:fmt.currency(todayK),       bg:'var(--greenbg)',  c:'var(--green)',   nav:'finance'},
    {icon:'⚖️',lbl:'Jami balans',        val:fmt.currency(balans),       bg:balans>=0?'var(--greenbg)':'var(--redbg)', c:balans>=0?'var(--green)':'var(--red)', nav:'finance'},
    {icon:'👷',lbl:'Bugun ish boshladilar',val:`${attendance.present}/${attendance.total}`,bg:'var(--yellowbg)',c:'var(--yellow)',nav:'salary'},
  ] : []

  const QUICK = [
    {icon:'📦',lbl:'Yangi buyurtma',  c:'var(--accent)',  action:onOrder},
    {icon:'🚛',lbl:'Transport',        c:'var(--green)',   action:()=>onNav?.('transport')},
    {icon:'💰',lbl:"Kirim qo'shish",  c:'var(--yellow)',  action:()=>onFin('kirim')},
    {icon:'💸',lbl:"Chiqim qo'shish", c:'var(--red)',     action:()=>onFin('chiqim')},
    {icon:'🏠',lbl:'Uyga xizmat',      c:'var(--purple)', action:()=>onNav?.('homeservice')},
    {icon:'🔧',lbl:'Sex topshiriqlari',c:'var(--orange)', action:()=>onNav?.('workers')},
  ]

  return (
    <div className="dash-wrap">
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {loading ? [...Array(4)].map((_,i)=>(<div key={i} className="kpi-card"><div className="skel" style={{height:80}}/></div>))
          : KPI.map((k,i)=>(
          <div key={i} className="kpi-card" style={{cursor:'pointer',animationDelay:i*40+'ms'}} onClick={()=>onNav?.(k.nav)}>
            <div className="kpi-hd"><div className="kpi-icon" style={{background:k.bg}}><span style={{color:k.c,fontSize:18}}>{k.icon}</span></div></div>
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
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:160,overflowY:'auto'}}>
              {attendance.list?.length===0
                ? <div style={{color:'var(--text3)',fontSize:12,padding:8}}>Ma'lumot yo'q — bot orqali ishchilar keladi</div>
                : attendance.list?.map(emp=>(
                  <div key={emp._id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:'var(--r)',background:'var(--bg3)'}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:emp.attendance?'var(--green)':'var(--red)',flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:600,flex:1}}>{emp.name}</span>
                    <span style={{fontSize:10,color:'var(--text2)'}}>{emp.role}</span>
                    {emp.attendance ? <span style={{fontSize:11,fontFamily:'monospace',color:'var(--green)'}}>{emp.attendance.checkIn}</span>
                      : <span style={{fontSize:10,color:'var(--red)',fontWeight:600}}>Kelmadi</span>}
                  </div>
                ))}
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><div className="card-title">💳 Mijozlar qarzlari</div><button className="btn btn-ghost btn-sm" onClick={()=>onNav?.('finance')}>Barchasi →</button></div>
            {debtOrders.length===0 ? <div style={{color:'var(--text3)',fontSize:12,padding:12}}>✅ Qarzli mijoz yo'q</div>
              : debtOrders.map(o=>(
                <div key={o._id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12}}>{o.customer}</div><div style={{fontSize:11,color:'var(--text2)'}}>{o.number} · {o.phone}</div></div>
                  <div style={{fontWeight:800,fontFamily:'monospace',color:'var(--red)',fontSize:13}}>{fmt.currency(o.debt||o.total)}</div>
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
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=q.c;e.currentTarget.style.background=q.c+'11';e.currentTarget.style.color=q.c}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.color='var(--text2)'}}>
                  <span style={{fontSize:18}}>{q.icon}</span>{q.lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><div className="card-title">🖥️ Tizim holati</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                {lbl:'Asosiy server',ok:stats!==null,okT:'Ishlayapti',errT:'Ulanmadi'},
                {lbl:"Ma'lumotlar bazasi",ok:stats!==null,okT:'Ulangan',errT:'MongoDB off'},
                {lbl:'Telegram Bot',ok:false,okT:'Active',errT:'Settings → TOKEN kiriting'},
                {lbl:'Redis cache',ok:true,okT:'Ishlayapti',errT:'Oddiy rejim'},
                {lbl:'Internet',ok:navigator.onLine,okT:'Ulanilgan',errT:'Offline rejim'},
              ].map(s=>(
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
        </div>
      </div>
    </div>
  )
}

/* ══ ROOT ══ */
export default function Dashboard({ onNav }) {
  const [stats,      setStats]      = useState(null)
  const [finance,    setFinance]    = useState([])
  const [attendance, setAttendance] = useState({ total:0, present:0, absent:0, list:[] })
  const [debtOrders, setDebtOrders] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [retrying,   setRetrying]   = useState(false)
  const [mobile,     setMobile]     = useState(isMob())
  const [orderModal, setOrderModal] = useState(false)
  const [finModal,   setFinModal]   = useState(false)
  const [finType,    setFinType]    = useState('kirim')
  const [newOrder,   setNewOrder]   = useState({ customer:'', phone:'', description:'' })
  const [newFin,     setNewFin]     = useState({ type:'kirim', description:'', amount:'', category:'Buyurtma' })

  useEffect(() => {
    load()
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Real-time: dashboard har 15s yoki yangi data kelganda
  useRealtime(['refresh:orders','refresh:dashboard','refresh:all'], () => { load() })

  async function load() {
    setLoading(true)
    try {
      const [stR,finR,attR,ordR] = await Promise.allSettled([
        api.getDashStats(), api.getFinance(), api.getAttendanceToday(), api.getOrders(),
      ])
      if (stR.status==='fulfilled') setStats(stR.value)
      setFinance(Array.isArray(finR.value) ? finR.value : finR.value?.data||[])
      if (attR.status==='fulfilled') setAttendance(attR.value)
      const ords = Array.isArray(ordR.value) ? ordR.value : ordR.value?.data||[]
      setDebtOrders(ords.filter(o=>o.debt>0||(o.status==='tugallandi'&&!o.paid&&o.total>0)).slice(0,5))
    } catch(e){ console.error(e) }
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
      await api.createFinance({...newFin,type:finType,amount:+newFin.amount,date:today,by:'Admin'})
      toast(`${finType==='kirim'?'Kirim':'Chiqim'} qo'shildi ✅`,'ok'); setFinModal(false); load()
    } catch(e){toast(e.message,'err')}
  }

  const shared = {
    stats, finance, attendance, debtOrders, loading, onNav,
    onOrder: () => setOrderModal(true),
    onFin:   (t) => { setFinType(t); setNewFin(p=>({...p,type:t})); setFinModal(true) },
    retry, retrying,
  }

  return (
    <>
      {mobile ? <MobDashboard {...shared}/> : <DeskDashboard {...shared}/>}

      {/* ── Modal: Yangi buyurtma ── */}
      <Modal open={orderModal} onClose={()=>setOrderModal(false)} title="📦 Yangi buyurtma" size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>setOrderModal(false)}>Bekor</button><button className="btn btn-primary" onClick={doOrder}>Yaratish</button></>}>
        <div className="fg"><label className="flabel">Mijoz ismi *</label>
          <input className="finput" value={newOrder.customer} onChange={e=>setNewOrder(p=>({...p,customer:e.target.value}))} autoFocus/></div>
        <div className="fg"><label className="flabel">Telefon *</label>
          <input className="finput" placeholder="+998 90 000 00 00" value={newOrder.phone} onChange={e=>setNewOrder(p=>({...p,phone:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">Tavsif</label>
          <textarea className="ftextarea" rows={2} value={newOrder.description} onChange={e=>setNewOrder(p=>({...p,description:e.target.value}))}/></div>
      </Modal>

      {/* ── Modal: Moliya ── */}
      <Modal open={finModal} onClose={()=>setFinModal(false)} title={finType==='kirim'?'💰 Kirim':'💸 Chiqim'} size="sm"
        footer={<><button className="btn btn-ghost" onClick={()=>setFinModal(false)}>Bekor</button>
          <button className={`btn ${finType==='kirim'?'btn-success':'btn-danger'}`} onClick={doFin}>Saqlash</button></>}>
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          {['kirim','chiqim'].map(t=>(
            <button key={t} className={`btn btn-sm ${finType===t?(t==='kirim'?'btn-success':'btn-danger'):'btn-ghost'}`}
              onClick={()=>{setFinType(t);setNewFin(p=>({...p,type:t}))}}>
              {t==='kirim'?'💰 Kirim':'💸 Chiqim'}
            </button>
          ))}
        </div>
        <div className="fg"><label className="flabel">Kategoriya</label>
          <select className="fselect" value={newFin.category} onChange={e=>setNewFin(p=>({...p,category:e.target.value}))}>
            {['Buyurtma','Transport','Kimyoviy','Kommunal','Maosh','Uy xizmati','Arenda','Boshqa'].map(c=><option key={c}>{c}</option>)}
          </select></div>
        <div className="fg"><label className="flabel">Tavsif *</label>
          <input className="finput" value={newFin.description} onChange={e=>setNewFin(p=>({...p,description:e.target.value}))}/></div>
        <div className="fg"><label className="flabel">Miqdor (so'm) *</label>
          <input className="finput" type="number" value={newFin.amount} onChange={e=>setNewFin(p=>({...p,amount:e.target.value}))}/></div>
      </Modal>
    </>
  )
}
