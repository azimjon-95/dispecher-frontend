import {
  MdDashboard, MdShoppingBag, MdLocalShipping, MdBuild,
  MdPeople, MdDirectionsCar, MdPerson, MdAttachMoney,
  MdAccountBalance, MdArchive, MdSettings, MdHome,
  MdChevronLeft, MdChevronRight, MdSpeed
} from 'react-icons/md'
import { Logo } from '../../assets/logo.jsx'
import './Sidebar.css'

export default function Sidebar({ active, onNav, collapsed, onToggle, mobOpen, onCloseMob, badges = {} }) {
  const NAV = [
    {
      section: 'Asosiy',
      items: [
        { id:'dashboard',   Icon:MdDashboard,     label:'Dashboard',          badge:null },
        { id:'orders',      Icon:MdShoppingBag,   label:'Buyurtmalar',         badge:badges.orders    || null },
        { id:'transport',   Icon:MdLocalShipping, label:'Transport',           badge:badges.transport || null },
        { id:'workers',     Icon:MdBuild,         label:'Sex Topshiriqlari',   badge:null },
      ]
    },
    {
      section: 'Hodimlar',
      items: [
        { id:'employees',   Icon:MdPeople,        label:'Xodimlar',   badge:null },
        { id:'drivers',     Icon:MdDirectionsCar, label:'Shafyorlar', badge:null },
        { id:'customers',   Icon:MdPerson,        label:'Mijozlar',   badge:null },
      ]
    },
    {
      section: 'Moliya',
      items: [
        { id:'finance',     Icon:MdAttachMoney,    label:'Moliya',          badge:null },
        { id:'salary',      Icon:MdAccountBalance, label:'Maosh Hisoblash', badge:null },
        { id:'homeservice', Icon:MdHome,           label:'Uyga Xizmat',     badge:null },
      ]
    },
    {
      section: 'Boshqa',
      items: [
        { id:'archive',     Icon:MdArchive,       label:'Tarix / Arxiv', badge:null },
        { id:'settings',    Icon:MdSettings,      label:'Sozlamalar',    badge:null },
      ]
    }
  ]

  return (
    <>
      <div className={`mob-backdrop ${mobOpen?'show':''}`} onClick={onCloseMob}/>
      <aside className={`sidebar ${collapsed?'collapsed':''} ${mobOpen?'mob-open':''}`}>
        <div className="sb-logo">
          {collapsed
            ? <Logo size={32}/>
            : <Logo size={32} showText={true}/>
          }
        </div>

        <nav className="sb-nav">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <div className="sb-section">{section}</div>
              {items.map(({ id, Icon, label, badge }) => (
                <a key={id} href="#" className={`sb-item ${active===id?'active':''}`}
                  data-tip={label}
                  onClick={e=>{ e.preventDefault(); onNav(id); onCloseMob?.() }}>
                  <span className="sb-icon"><Icon size={18}/></span>
                  <span className="sb-label">{label}</span>
                  {badge > 0 && <span className="sb-badge">{badge > 99 ? '99+' : badge}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-bottom">
          <button className="sb-toggle" onClick={onToggle}>
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
