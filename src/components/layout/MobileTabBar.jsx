/* ══════════════════════════════════════
   MOBILE BOTTOM TAB BAR — iOS style
   Faqat mobilda ko'rinadi
══════════════════════════════════════ */
import {
  MdDashboard, MdShoppingBag, MdLocalShipping,
  MdAttachMoney, MdMenu
} from 'react-icons/md'
import './MobileTabBar.css'

const TABS = [
  { id:'dashboard',  Icon:MdDashboard,     label:'Bosh' },
  { id:'orders',     Icon:MdShoppingBag,   label:'Buyurtma' },
  { id:'transport',  Icon:MdLocalShipping, label:'Transport' },
  { id:'finance',    Icon:MdAttachMoney,   label:'Moliya' },
  { id:'__more',     Icon:MdMenu,          label:'Ko\'proq' },
]

export default function MobileTabBar({ active, onNav, onMore }) {
  return (
    <nav className="mob-tabbar">
      {TABS.map(t => {
        const isMore   = t.id === '__more'
        const isActive = !isMore && active === t.id
        return (
          <button key={t.id}
            className={`mob-tab ${isActive ? 'active' : ''}`}
            onClick={() => isMore ? onMore?.() : onNav?.(t.id)}
            aria-label={t.label}
          >
            <span className="mob-tab-icon">
              <t.Icon size={22}/>
            </span>
            <span className="mob-tab-label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
