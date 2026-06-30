import { useState, useEffect, useMemo } from 'react'
import { MdPhone, MdLocationOn, MdShoppingBag, MdAttachMoney,
         MdChevronRight, MdClose, MdSearch } from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { useRealtime } from '../../services/realtime.js'
import { Sbadge, ErrorBoundary, toast } from '../../components/ui/UI.jsx'
import './Customers.css'
import { useLang } from '../../i18n/index.jsx'

const isMob = () => window.innerWidth <= 768

/* ── Mijoz detail panel ── */
function CustomerDetail({ cust, onClose }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cust) return
    setLoading(true)
    api.getOrders()
      .then(res => {
        const all = Array.isArray(res) ? res : res?.data || []
        const phone = (cust.phone||'').replace(/\D/g,'')
        setOrders(all.filter(o => (o.phone||'').replace(/\D/g,'').includes(phone)))
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [cust])

  if (!cust) return null

  const totalSpent = orders.reduce((s,o) => s + (o.total||0), 0)

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'flex-end',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxHeight:'85vh',
        background:'var(--bg2)', borderRadius:'20px 20px 0 0',
        overflow:'hidden', display:'flex', flexDirection:'column',
        animation:'slideUp .3s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 4px'}}>
          <div style={{width:36,height:4,borderRadius:99,background:'var(--border)'}}/>
        </div>

        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', gap:14,
          padding:'12px 20px 16px',
          borderBottom:'1px solid var(--border)',
        }}>
          <div style={{
            width:52, height:52, borderRadius:16, flexShrink:0,
            background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, fontWeight:900, color:'white',
          }}>
            {cust.name?.[0]?.toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:800}}>{cust.name}</div>
            <a href={`tel:${cust.phone}`} style={{
              fontSize:13, color:'#229ED9', textDecoration:'none',
              display:'flex', alignItems:'center', gap:4, marginTop:2,
            }}>
              <MdPhone size={12}/>{cust.phone}
            </a>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:10,
            background:'var(--bg3)', border:'1px solid var(--border)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--text2)',
          }}><MdClose size={16}/></button>
        </div>

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0,
          borderBottom:'1px solid var(--border)'}}>
          {[
            {lbl:'Buyurtmalar', val:orders.length+' ta', c:'#3B82F6'},
            {lbl:'Jami xarid',  val:fmt.currency(totalSpent), c:'#22c55e'},
            {lbl:'Chegirma',    val:(cust.discount||0)+'%', c:'#f59e0b'},
          ].map((s,i,arr)=>(
            <div key={s.lbl} style={{
              padding:'14px 10px', textAlign:'center',
              borderRight:i<arr.length-1?'1px solid var(--border)':'none',
            }}>
              <div style={{fontWeight:900,fontFamily:'monospace',fontSize:14,color:s.c}}>{s.val}</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Info rows */}
        <div style={{padding:'12px 20px', borderBottom:'1px solid var(--border)'}}>
          {cust.address && (
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--text2)',marginBottom:8}}>
              <MdLocationOn size={15} style={{color:'#f97316',flexShrink:0}}/>
              {cust.address}
            </div>
          )}
          {cust.lat && cust.lon && (
            <a href={`https://maps.google.com/?q=${cust.lat},${cust.lon}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                fontSize:12, color:'#22c55e', textDecoration:'none',
                background:'rgba(34,197,94,.1)', padding:'4px 10px',
                borderRadius:99, border:'1px solid rgba(34,197,94,.2)',
              }}>
              📍 GPS xaritada ko'rish
            </a>
          )}
        </div>

        {/* Order history */}
        <div style={{flex:1, overflowY:'auto', padding:'12px 20px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',
            textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>
            Buyurtmalar tarixi
          </div>
          {loading ? (
            <div style={{textAlign:'center',padding:'20px 0',color:'var(--text3)'}}>Yuklanmoqda...</div>
          ) : orders.length===0 ? (
            <div style={{textAlign:'center',padding:'20px 0',color:'var(--text3)'}}>
              <div style={{fontSize:28,marginBottom:6}}>📭</div>
              <div>Buyurtma tarixi yo'q</div>
            </div>
          ) : orders.map(o => (
            <div key={o._id} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 0', borderBottom:'1px solid var(--border)',
            }}>
              <div style={{
                width:36,height:36,borderRadius:10,flexShrink:0,
                background:o.status==='tugallandi'?'rgba(34,197,94,.12)':'rgba(59,130,246,.12)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,
              }}>
                {o.status==='tugallandi'?'✅':'📦'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'monospace',fontWeight:700,fontSize:13,color:'var(--accent)'}}>{o.number}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>
                  {o.itemSummary||o.description||'—'} · {o.createdAt?.slice(0,10)||''}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,fontFamily:'monospace',fontSize:13,color:'#22c55e'}}>
                  {fmt.currency(o.total)}
                </div>
                <Sbadge s={o.status}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  )
}

/* ── Customer card (mobile) ── */
function CustCard({ cust, onClick }) {
  return (
    <div onClick={()=>onClick(cust)} style={{
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:16, padding:'13px 14px',
      display:'flex', alignItems:'center', gap:12,
      cursor:'pointer', WebkitTapHighlightColor:'transparent',
      transition:'opacity .1s',
    }}
      onTouchStart={e=>e.currentTarget.style.opacity='.7'}
      onTouchEnd={e=>e.currentTarget.style.opacity='1'}
    >
      {/* Avatar */}
      <div style={{
        width:44,height:44,borderRadius:13,flexShrink:0,
        background:'linear-gradient(135deg,#3B82F650,#1D4ED820)',
        border:'1.5px solid rgba(59,130,246,.2)',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:18,fontWeight:800,color:'#3B82F6',
      }}>
        {cust.name?.[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{cust.name}</div>
        <div style={{fontSize:12,color:'var(--text2)',display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
          <MdPhone size={11}/>{cust.phone}
        </div>
        {cust.address && (
          <div style={{fontSize:11,color:'var(--text3)',
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            📍 {cust.address}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:800,color:'#22c55e',fontFamily:'monospace'}}>
          {fmt.currency(cust.totalSpent||0)}
        </div>
        <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>
          {cust.orders||0} ta buyurtma
        </div>
        {(cust.discount||0)>0 && (
          <div style={{fontSize:10,color:'#f59e0b',fontWeight:700,marginTop:1}}>
            {cust.discount}% chegirma
          </div>
        )}
      </div>

      <MdChevronRight size={18} style={{color:'var(--text3)',flexShrink:0}}/>
    </div>
  )
}

/* ── MAIN ── */
export default function Customers() {
  const { t } = useLang()
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [selected,  setSelected]  = useState(null)
  const [mobile,    setMobile]    = useState(isMob())

  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => { load() }, [])

  // Mijoz statistikasi buyurtma orqali yangilanadi (orders.upsertCustomer)
  // — shu sababli ham 'customers', ham 'orders' eventini tinglaymiz
  useRealtime(['refresh:customers', 'refresh:orders', 'network:online'], () => load())

  async function load() {
    setLoading(true)
    try {
      const res = await api.getCustomers()
      const list = Array.isArray(res) ? res : res?.data || []
      setCustomers(list)
    } catch(e) { toast(e.message,'err') }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let r = customers
    if (statusF) r = r.filter(c => c.status === statusF)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(c =>
        (c.name||'').toLowerCase().includes(q) ||
        (c.phone||'').includes(q) ||
        (c.address||'').toLowerCase().includes(q)
      )
    }
    return r.sort((a,b) => (b.orders||0)-(a.orders||0))
  }, [customers, search, statusF])

  const totalSpent   = customers.reduce((s,c)=>s+(c.totalSpent||0),0)
  const totalOrders  = customers.reduce((s,c)=>s+(c.orders||0),0)
  const withLocation = customers.filter(c=>c.lat&&c.lon).length

  /* ── DESKTOP ── */
  if (!mobile) return (
    <ErrorBoundary>
      <div style={{padding:'0 0 24px'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,margin:0}}>👤 Mijozlar</h2>
            <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{customers.length} ta mijoz</div>
          </div>
        </div>

        {/* KPI */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {lbl:'Jami mijozlar',  val:customers.length,        c:'var(--accent)',  bg:'var(--accentbg)'},
            {lbl:'Jami buyurtma',  val:totalOrders+' ta',       c:'var(--green)',   bg:'var(--greenbg)'},
            {lbl:'Jami xarid',     val:fmt.currency(totalSpent),c:'var(--green)',   bg:'var(--greenbg)'},
            {lbl:'GPS saqlangan',  val:withLocation+' ta',      c:'#f59e0b',        bg:'var(--yellowbg)'},
          ].map(k=>(
            <div key={k.lbl} className="kpi-card" style={{cursor:'default'}}>
              <div style={{fontSize:18,fontWeight:900,color:k.c,fontFamily:'monospace'}}>{k.val}</div>
              <div style={{fontSize:11,color:'var(--text2)',marginTop:4}}>{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',
            border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'8px 12px'}}>
            <MdSearch size={16} style={{color:'var(--text3)'}}/>
            <input placeholder="Ism, telefon, manzil..."
              value={search} onChange={e=>setSearch(e.target.value)}
              style={{flex:1,background:'none',border:'none',outline:'none',
                color:'var(--text)',fontSize:13,fontFamily:'inherit'}}/>
          </div>
          <select value={statusF} onChange={e=>setStatusF(e.target.value)}
            className="fselect" style={{width:140}}>
            <option value="">Barcha holat</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{padding:0}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Mijoz','Manzil','Buyurtmalar','Jami xarid','Chegirma','Holat',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,
                    fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Yuklanmoqda...</td></tr>
              ) : filtered.length===0 ? (
                <tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Topilmadi</td></tr>
              ) : filtered.map(cust=>(
                <tr key={cust._id} onClick={()=>setSelected(cust)}
                  style={{borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:10,
                        background:'rgba(59,130,246,.12)',border:'1px solid rgba(59,130,246,.2)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontWeight:800,fontSize:14,color:'#3B82F6'}}>
                        {cust.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{cust.name}</div>
                        <div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:3}}>
                          <MdPhone size={10}/>{cust.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'var(--text2)',maxWidth:180,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {cust.lat&&cust.lon?'📍 ':''}{cust.address||'—'}
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{fontFamily:'monospace',color:'var(--accent)',fontWeight:700}}>
                      {cust.orders||0} ta
                    </span>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{fontFamily:'monospace',fontWeight:700,color:'#22c55e'}}>
                      {fmt.currency(cust.totalSpent||0)}
                    </span>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    {(cust.discount||0)>0
                      ? <span style={{color:'#f59e0b',fontWeight:700}}>{cust.discount}%</span>
                      : <span style={{color:'var(--text3)'}}>—</span>}
                  </td>
                  <td style={{padding:'12px 14px'}}><Sbadge s={cust.status}/></td>
                  <td style={{padding:'12px 14px',textAlign:'right'}}>
                    <button onClick={e=>{e.stopPropagation();setSelected(cust)}}
                      className="btn btn-ghost btn-sm">Ko'rish →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && <CustomerDetail cust={selected} onClose={()=>setSelected(null)}/>}
      </div>
    </ErrorBoundary>
  )

  /* ── MOBILE ── */
  return (
    <ErrorBoundary>
      <div style={{paddingBottom:90}}>

        {/* Hero */}
        <div style={{background:'linear-gradient(160deg,#0d0d1f 0%,#0d1117 100%)',
          padding:'14px 16px 18px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',
            background:'rgba(59,130,246,.1)',filter:'blur(30px)',pointerEvents:'none'}}/>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>👤 Mijozlar bazasi</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              {lbl:'Mijozlar',   val:customers.length,         c:'#3B82F6', emoji:'👥'},
              {lbl:'Buyurtmalar',val:totalOrders+' ta',        c:'#22c55e', emoji:'📦'},
              {lbl:'GPS bor',    val:withLocation+' ta',       c:'#f59e0b', emoji:'📍'},
            ].map(s=>(
              <div key={s.lbl} style={{background:'rgba(255,255,255,.05)',
                border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'10px'}}>
                <div style={{fontSize:16,marginBottom:4}}>{s.emoji}</div>
                <div style={{fontWeight:900,color:s.c,fontFamily:'monospace',fontSize:18}}>{s.val}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:2}}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div style={{display:'flex',gap:6,padding:'10px 16px 6px'}}>
          {[{k:'',l:'Hammasi'},{k:'active',l:'✅ Faol'},{k:'inactive',l:'⛔ Nofaol'}].map(t=>(
            <button key={t.k} onClick={()=>setStatusF(t.k)} style={{
              padding:'6px 14px',borderRadius:99,cursor:'pointer',
              background:statusF===t.k?'rgba(59,130,246,.15)':'var(--bg2)',
              border:`1px solid ${statusF===t.k?'rgba(59,130,246,.4)':'var(--border)'}`,
              color:statusF===t.k?'#3B82F6':'var(--text3)',
              fontSize:12,fontWeight:700,WebkitTapHighlightColor:'transparent',
            }}>{t.l}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{padding:'4px 16px 10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',
            border:'1px solid var(--border)',borderRadius:12,padding:'8px 12px'}}>
            <MdSearch size={16} style={{color:'var(--text3)',flexShrink:0}}/>
            <input placeholder="Ism, telefon, manzil..."
              value={search} onChange={e=>setSearch(e.target.value)}
              style={{flex:1,background:'none',border:'none',outline:'none',
                color:'var(--text)',fontSize:14,fontFamily:'inherit'}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',
              color:'var(--text3)',cursor:'pointer',fontSize:16}}>✕</button>}
          </div>
        </div>

        {/* Count */}
        <div style={{padding:'0 16px 8px',fontSize:12,color:'var(--text3)'}}>
          {filtered.length} ta mijoz
        </div>

        {/* Cards */}
        <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:8}}>
          {loading ? (
            [...Array(4)].map((_,i)=>(
              <div key={i} style={{height:80,borderRadius:16,background:'var(--bg2)',
                animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*80+'ms'}}/>
            ))
          ) : filtered.length===0 ? (
            <div style={{textAlign:'center',padding:'50px 0',color:'var(--text3)'}}>
              <div style={{fontSize:40,marginBottom:10}}>👤</div>
              <div style={{fontSize:14,fontWeight:600}}>Mijoz topilmadi</div>
              <div style={{fontSize:12,marginTop:4}}>Buyurtma qo'shilganda avtomatik yaratiladi</div>
            </div>
          ) : filtered.map(cust=>(
            <CustCard key={cust._id} cust={cust} onClick={setSelected}/>
          ))}
        </div>

        {/* Detail panel */}
        {selected && <CustomerDetail cust={selected} onClose={()=>setSelected(null)}/>}

        <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      </div>
    </ErrorBoundary>
  )
}
