import { useState, useEffect } from 'react'
import { bus } from '../../services/realtime.js'
import {
  MdDashboard, MdShoppingBag, MdLocalShipping, MdConstruction,
  MdPeople, MdDirectionsCar, MdPerson, MdAttachMoney,
  MdAccountBalance, MdArchive, MdSettings,
  MdNotifications, MdLightMode, MdDarkMode, MdSearch,
  MdMenu, MdLogout, MdExpandMore, MdClose, MdCheckCircle
} from 'react-icons/md'
import { NetworkBar } from '../../hooks/useNetworkStatus.jsx'
import './Navbar.css'

const TITLES = {
  dashboard: ['Dashboard',          'Real-time monitoring'],
  orders:    ['Buyurtmalar',         'Boshqaruv'],
  transport: ['Transport',           'Olib Ketish & Olib Kelish'],
  workers:   ['Sex Topshiriqlari',   'Buyumlar taqsimoti'],
  employees: ['Xodimlar',            'Hodimlar bazasi'],
  drivers:   ['Shafyorlar',          'Haydovchilar'],
  customers: ['Mijozlar',            'Mijozlar bazasi'],
  finance:   ['Moliya',              'Kirim-chiqim'],
  salary:    ['Maosh Hisoblash',     "Oylik to'lovlar"],
  archive:   ['Tarix / Arxiv',       'Tugallangan buyurtmalar'],
  settings:  ['Sozlamalar',          'Tizim parametrlari'],
}


/* ── Notification Bell + Panel ── */
function NotifBell({ notifications, onNav }) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  const TYPE_CFG = {
    order:     { emoji:'📦', color:'#3B82F6', label:'Buyurtma' },
    debt:      { emoji:'💳', color:'#f85149', label:'Qarz' },
    transport: { emoji:'🚛', color:'#22c55e', label:'Transport' },
    system:    { emoji:'⚙️', color:'#94a3b8', label:'Tizim' },
    salary:    { emoji:'💰', color:'#f59e0b', label:'Maosh' },
  }

  return (
    <div style={{position:'relative'}}>
      <button
        className="nb-btn"
        onClick={()=>setOpen(v=>!v)}
        style={{position:'relative'}}
      >
        <MdNotifications size={18}/>
        {unread > 0 && (
          <span className="nb-dot" style={{
            background: unread > 0 ? '#f85149' : 'var(--accent)',
            animation: unread > 0 ? 'notifPulse 2s ease-in-out infinite' : 'none',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={()=>setOpen(false)} style={{
            position:'fixed',inset:0,zIndex:998,
          }}/>

          {/* Panel */}
          <div style={{
            position:'fixed',
            top:58, right:8,
            width:'min(360px, calc(100vw - 16px))',
            maxHeight:'calc(100vh - 80px)',
            background:'var(--bg2)',
            border:'1px solid var(--border)',
            borderRadius:16,
            zIndex:999,
            overflow:'hidden',
            display:'flex',
            flexDirection:'column',
            boxShadow:'0 8px 32px rgba(0,0,0,.4)',
            animation:'notifSlide .2s cubic-bezier(.16,1,.3,1) both',
          }}>
            {/* Header */}
            <div style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'14px 16px',
              borderBottom:'1px solid var(--border)',
              background:'var(--bg3)',
            }}>
              <div style={{fontWeight:800,fontSize:15}}>
                🔔 Bildirishnomalar
                {unread > 0 && (
                  <span style={{
                    marginLeft:8,fontSize:11,fontWeight:700,
                    padding:'2px 7px',borderRadius:99,
                    background:'rgba(248,81,73,.15)',color:'#f85149',
                  }}>{unread} yangi</span>
                )}
              </div>
              <button onClick={()=>setOpen(false)} style={{
                background:'none',border:'none',cursor:'pointer',
                color:'var(--text3)',padding:4,borderRadius:8,
                display:'flex',alignItems:'center',justifyContent:'center',
              }}><MdClose size={18}/></button>
            </div>

            {/* List */}
            <div style={{overflowY:'auto',flex:1}}>
              {notifications.length === 0 ? (
                <div style={{
                  textAlign:'center',padding:'40px 20px',
                  color:'var(--text3)',
                }}>
                  <div style={{fontSize:40,marginBottom:10}}>🔕</div>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Bildirishnoma yo'q</div>
                  <div style={{fontSize:12}}>Yangi hodisalar bu yerda ko'rinadi</div>
                </div>
              ) : (
                notifications.map((n,i) => {
                  const cfg = TYPE_CFG[n.type] || TYPE_CFG.system
                  return (
                    <div key={n.id||i}
                      onClick={()=>{ if(n.nav) onNav?.(n.nav); setOpen(false) }}
                      style={{
                        display:'flex',alignItems:'flex-start',gap:12,
                        padding:'12px 16px',
                        borderBottom:'1px solid var(--border)',
                        cursor:n.nav?'pointer':'default',
                        background:n.read?'transparent':'rgba(59,130,246,.04)',
                        transition:'background .15s',
                      }}
                      onMouseEnter={e=>{ if(n.nav) e.currentTarget.style.background='var(--bg3)' }}
                      onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(59,130,246,.04)'}
                    >
                      {/* Icon */}
                      <div style={{
                        width:38,height:38,borderRadius:12,flexShrink:0,
                        background:`${cfg.color}18`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:18,
                      }}>{cfg.emoji}</div>

                      {/* Content */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{
                          fontSize:13,fontWeight:n.read?500:700,
                          color:'var(--text)',marginBottom:2,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                        }}>{n.title}</div>
                        <div style={{
                          fontSize:12,color:'var(--text2)',lineHeight:1.4,
                          display:'-webkit-box',WebkitLineClamp:2,
                          WebkitBoxOrient:'vertical',overflow:'hidden',
                        }}>{n.body}</div>
                        <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>
                          {n.time}
                        </div>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div style={{
                          width:8,height:8,borderRadius:'50%',
                          background:'#3B82F6',flexShrink:0,marginTop:4,
                        }}/>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{
                padding:'10px 16px',borderTop:'1px solid var(--border)',
                textAlign:'center',
              }}>
                <button
                  onClick={()=>{onNav?.('orders');setOpen(false)}}
                  style={{
                    fontSize:12,color:'#3B82F6',background:'none',
                    border:'none',cursor:'pointer',fontWeight:600,
                  }}>
                  Barcha buyurtmalarni ko'rish →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes notifPulse{0%,100%{box-shadow:0 0 0 0 rgba(248,81,73,.4)}50%{box-shadow:0 0 0 5px rgba(248,81,73,0)}}
        @keyframes notifSlide{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </div>
  )
}


function LiveBadge() {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    const off1 = bus.on('socket:connected',    () => setOk(true))
    const off2 = bus.on('socket:disconnected', () => setOk(false))
    return () => { off1(); off2() }
  }, [])
  return (
    <div className="nb-live" style={{
      background: ok ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)',
      border: `1px solid ${ok ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}`,
      color: ok ? '#22c55e' : '#f59e0b',
      borderRadius: 8, padding: '3px 8px',
      fontSize: 11, fontWeight: 700,
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? '#22c55e' : '#f59e0b',
        animation: ok ? 'livePulse 1.5s infinite' : 'none',
        display: 'inline-block',
      }}/>
      {ok ? 'LIVE' : 'Polling'}
      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}

export default function Navbar({ active, collapsed, theme, onTheme, onBurger, user, onLogout, networkStatus, notifications=[], onNav }) {
  const [showUser, setShowUser] = useState(false)
  const [title, sub] = TITLES[active] || ['Panel', '']
  const initials = (user?.name || 'A').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <header className={`navbar ${collapsed ? 'collapsed' : ''}`}>
      <button className="nb-burger" onClick={onBurger} aria-label="Menu">
        <MdMenu size={22}/>
      </button>

      <div>
        <div className="nb-page-title">{title}</div>
        <div className="nb-page-sub">{sub}</div>
      </div>

      <div className="nb-spacer"/>

      <div className="nb-search">
        <MdSearch size={16} className="nb-search-ico"/>
        <input placeholder="Qidirish..."/>
      </div>

      {/* Network status bar */}
      {networkStatus && (
        <NetworkBar
          online={networkStatus.online}
          queueLen={networkStatus.queueLen}
          syncing={networkStatus.syncing}
          doSync={networkStatus.doSync}
        />
      )}

      <LiveBadge/>

      {/* ── Notification Bell ── */}
      <NotifBell notifications={notifications} onNav={onNav}/>

      <div className="nb-btn" onClick={onTheme} title="Mavzu">
        {theme === 'dark' ? <MdLightMode size={18}/> : <MdDarkMode size={18}/>}
      </div>

      <div className="nb-profile" onClick={() => setShowUser(v => !v)}>
        <div className="nb-avatar">{initials}</div>
        <div>
          <div className="nb-uname">{user?.name || 'Admin'}</div>
          <div className="nb-urole">{user?.role || 'Super Admin'}</div>
        </div>
        <MdExpandMore size={16} style={{color:'var(--text2)',marginLeft:2}}/>
        {showUser && (
          <div className="nb-dropdown" onClick={e => e.stopPropagation()}>
            <div className="nb-dropdown-user">
              <div className="nb-dropdown-name">{user?.name || 'Admin'}</div>
              <div className="nb-dropdown-role">{user?.role || 'Super Admin'}</div>
            </div>
            <div className="nb-dropdown-divider"/>
            <button className="nb-dropdown-item nb-logout" onClick={onLogout}>
              <MdLogout size={16}/> Chiqish
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
