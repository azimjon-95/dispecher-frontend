import {
  MdDashboard, MdShoppingBag, MdLocalShipping, MdBuild,
  MdPeople, MdDirectionsCar, MdPerson, MdAttachMoney,
  MdAccountBalance, MdArchive, MdSettings, MdHome,
  MdChevronLeft, MdChevronRight
} from 'react-icons/md'
import { Logo } from '../../assets/logo.jsx'
import './Sidebar.css'
import { useLang } from '../../i18n/index.jsx'

export default function Sidebar({ active, onNav, collapsed, onToggle, mobOpen, onCloseMob, badges = {} }) {
  const { t } = useLang()
  const NAV = [
    {
      section: 'Asosiy',
      items: [
        { id:'dashboard',   Icon:MdDashboard,     label:t.dashboard||'Dashboard',         badge:null },
        { id:'orders',      Icon:MdShoppingBag,   label:t.orders||'Buyurtmalar',        badge:badges.orders    || null },
        { id:'transport',   Icon:MdLocalShipping, label:t.transport||'Transport',          badge:badges.transport || null },
        { id:'workers',     Icon:MdBuild,         label:t.workers||'Sex Topshiriqlari',  badge:null },
      ]
    },
    {
      section: 'Hodimlar',
      items: [
        { id:'employees',   Icon:MdPeople,        label:t.employees||'Hodimlar',   badge:null },
        { id:'customers',   Icon:MdPerson,        label:t.customers||'Mijozlar',   badge:null },
      ]
    },
    {
      section: 'Moliya',
      items: [
        { id:'finance',     Icon:MdAttachMoney,    label:t.finance||'Moliya',          badge:null },
        { id:'salary',      Icon:MdAccountBalance, label:t.salary||'Maosh Hisoblash', badge:null },
        { id:'homeservice', Icon:MdHome,           label:t.homeservice||'Uyga Xizmat',     badge:null },
      ]
    },
    {
      section: 'Boshqa',
      items: [
        { id:'archive',     Icon:MdArchive,  label:t.archive||'Tarix / Arxiv', badge:null },
        { id:'settings',    Icon:MdSettings, label:t.settings||'Sozlamalar',    badge:null },
      ]
    }
  ]

  return (
    <>
      <div className={`mob-backdrop ${mobOpen?'show':''}`} onClick={onCloseMob}/>
      <aside className={`sidebar ${collapsed?'collapsed':''} ${mobOpen?'mob-open':''}`}>

        {/* ── Logo ── */}
        <div className="sb-logo">
          <Logo size={34} collapsed={collapsed}/>
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              {!collapsed && <div className="sb-section">{section}</div>}
              {items.map(({ id, Icon, label, badge }) => (
                <a key={id} href="#"
                  className={`sb-item ${active===id?'active':''}`}
                  title={collapsed ? label : undefined}
                  onClick={e=>{ e.preventDefault(); onNav(id); onCloseMob?.() }}>
                  <span className="sb-icon"><Icon size={18}/></span>
                  <span className="sb-label">{label}</span>
                  {badge > 0 && <span className="sb-badge">{badge > 99 ? '99+' : badge}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle ── */}
        <div className="sb-bottom">
          <button className="sb-toggle" onClick={onToggle} title={collapsed?'Kengaytirish':"Yig'ish"}>
            <span className="sb-icon">
              {collapsed ? <MdChevronRight size={18}/> : <MdChevronLeft size={18}/>}
            </span>
            <span className="sb-label">{collapsed ? 'Kengaytirish' : "Yig'ish"}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
