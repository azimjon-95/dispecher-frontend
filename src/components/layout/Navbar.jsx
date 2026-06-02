import { useState } from 'react'
import {
  MdDashboard, MdShoppingBag, MdLocalShipping, MdConstruction,
  MdPeople, MdDirectionsCar, MdPerson, MdAttachMoney,
  MdAccountBalance, MdArchive, MdSettings,
  MdNotifications, MdLightMode, MdDarkMode, MdSearch,
  MdMenu, MdLogout, MdExpandMore
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

export default function Navbar({ active, collapsed, theme, onTheme, onBurger, user, onLogout, networkStatus }) {
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

      <div className="nb-live">
        <span className="nb-live-dot"/>LIVE
      </div>

      <div className="nb-btn">
        <MdNotifications size={18}/>
        <span className="nb-dot">3</span>
      </div>

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
