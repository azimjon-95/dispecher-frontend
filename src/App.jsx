import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import Sidebar   from './components/layout/Sidebar.jsx'
import Navbar    from './components/layout/Navbar.jsx'
import { ToastContainer } from './components/ui/UI.jsx'
import Login     from './pages/login/Login.jsx'
import { NetworkToast } from './hooks/useNetworkStatus.jsx'
import MobileTabBar from './components/layout/MobileTabBar.jsx'
import { api, norm } from './services/api.js'
import { bus } from './services/realtime.js'
import { LangProvider } from './i18n/index.jsx'
import { bootstrap } from './store/appStore.js'

// Lazy load — faqat bosilganda yuklanadi, hammasi bir vaqtda emas
const Dashboard   = lazy(() => import('./pages/dashboard/Dashboard.jsx'))
const Orders      = lazy(() => import('./pages/orders/Orders.jsx'))
const Transport   = lazy(() => import('./pages/transport/Transport.jsx'))
const Workers     = lazy(() => import('./pages/workers/Workers.jsx'))
const Employees   = lazy(() => import('./pages/employees/Employees.jsx'))
const Customers   = lazy(() => import('./pages/customers/Customers.jsx'))
const Finance     = lazy(() => import('./pages/finance/Finance.jsx'))
const Salary      = lazy(() => import('./pages/salary/Salary.jsx'))
const Archive     = lazy(() => import('./pages/archive/Archive.jsx'))
const Settings    = lazy(() => import('./pages/settings/Settings.jsx'))
const HomeService = lazy(() => import('./pages/homeservice/HomeService.jsx'))

function getSavedPage() {
  try { return localStorage.getItem('activePage') || 'dashboard' } catch { return 'dashboard' }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('token')
      const saved = localStorage.getItem('user')
      if (!token || !saved) return null

      // JWT muddatini tekshirish (client-side)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token muddati o'tgan — tozala
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          return null
        }
      } catch {}

      return JSON.parse(saved)
    } catch {}
    return null
  })

  const [page,      setPage]      = useState(getSavedPage)
  const [collapsed, setCollapsed] = useState(false)
  const [mobOpen,   setMobOpen]   = useState(false)
  const [theme,     setTheme]     = useState(() => localStorage.getItem('theme') || 'dark')

  /* Real-time badge counts */
  const [badges,        setBadges]        = useState({ orders: 0, transport: 0 })
  const [notifications, setNotifications] = useState([])

  /* ── Token expired listener ── */
  useEffect(() => {
    function onAuthExpired(e) {
      // Token yaroqsiz — localStorage tozalab loginga o'tkazamiz
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      // Toast chiqarish (agar import qilingan bo'lsa)
      try {
        const toastFn = window.__toast
        if (toastFn) toastFn(e.detail?.msg || 'Sessiya tugadi. Qayta kiring.', 'err')
      } catch {}
    }
    window.addEventListener('auth:expired', onAuthExpired)
    return () => window.removeEventListener('auth:expired', onAuthExpired)
  }, [])

  // useNetworkStatus o'z holatini o'zi boshqaradi (NetworkToast komponenti orqali),
  // App.jsx darajasida alohida ushlab turish shart emas

  // Sahifa yangilanganida (token bor bo'lsa) darhol bootstrap
  useEffect(() => {
    if (user) bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)')
    const h = e => setCollapsed(e.matches)
    h(mq); mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  /* Load real badge counts */
  const loadBadges = useCallback(async () => {
    if (!user) return
    try {
      const [ords, del, pick] = await Promise.allSettled([
        api.getOrders(),
        api.getDelivery(),
        api.getPickup(),
      ])
      const orders    = norm(ords.value  || [])
      const deliveries= norm(del.value   || [])
      const pickups   = norm(pick.value  || [])

      const activeOrders     = orders.filter(o => !['tugallandi','bekor'].includes(o.status))
      const pendingDeliveries= deliveries.filter(t => t.status !== 'yetkazildi' && t.status !== 'bekor')
      const pendingPickups   = pickups.filter(t => t.status !== 'yetkazildi' && t.status !== 'bekor')

      setBadges({
        orders:    activeOrders.length,
        transport: [...pendingDeliveries,...pendingPickups].length,
      })

      // Build notifications list
      const notifs = []
      const now = new Date()
      const timeAgo = (date) => {
        const d = new Date(date)
        const diff = Math.floor((now - d) / 60000)
        if (diff < 1)   return 'Hozir'
        if (diff < 60)  return `${diff} daqiqa oldin`
        if (diff < 1440)return `${Math.floor(diff/60)} soat oldin`
        return `${Math.floor(diff/1440)} kun oldin`
      }

      // Yangi buyurtmalar
      const newOrders = activeOrders.filter(o => o.status === 'yangi').slice(0, 3)
      newOrders.forEach(o => notifs.push({
        id: 'ord_' + o._id, type:'order', read:false, nav:'orders',
        title: `Yangi buyurtma: ${o.number}`,
        body: `${o.customer} · ${o.phone || ''} ${o.address ? '· '+o.address : ''}`.trim(),
        time: timeAgo(o.createdAt || now),
      }))

      // Yetkazishda
      pendingDeliveries.slice(0,2).forEach(t => notifs.push({
        id: 'del_' + t._id, type:'transport', read:false, nav:'transport',
        title: `Yetkazish kutilmoqda: ${t.order || t.number || ''}`,
        body: `${t.customer || ''} · ${t.address || ''}`.trim(),
        time: timeAgo(t.createdAt || now),
      }))

      // Olib kelish
      pendingPickups.slice(0,2).forEach(t => notifs.push({
        id: 'pck_' + t._id, type:'transport', read: notifs.length > 3, nav:'transport',
        title: `Olib kelish: ${t.order || t.number || ''}`,
        body: `${t.customer || ''} · ${t.address || ''}`.trim(),
        time: timeAgo(t.createdAt || now),
      }))

      // Qarzdor mijozlar
      const debtors = orders.filter(o => (o.debt||0) > 0 || (o.status==='tugallandi'&&!o.paid&&o.total>0)).slice(0,2)
      debtors.forEach(o => notifs.push({
        id: 'dbt_' + o._id, type:'debt', read:true, nav:'finance',
        title: `Qarz: ${o.customer}`,
        body: `${o.number} · ${o.total?.toLocaleString?.() || 0} so'm to'lanmagan`,
        time: timeAgo(o.createdAt || now),
      }))

      setNotifications(notifs.slice(0, 15))
    } catch {}
  }, [user])

  useEffect(() => {
    if (user) {
      loadBadges()
      const interval = setInterval(loadBadges, 30000)
      return () => clearInterval(interval)
    }
  }, [user, loadBadges])

  /* ── Internet qaytganda: badge va aktiv sahifa darhol yangilanadi ── */
  useEffect(() => {
    if (!user) return
    const off = bus.on('network:online', () => {
      loadBadges()
      bus.emit('refresh:all')
    })
    return off
  }, [user, loadBadges])

  function navigate(p) {
    setPage(p)
    try { localStorage.setItem('activePage', p) } catch {}
    setMobOpen(false)
    // Refresh badges on navigate
    setTimeout(loadBadges, 500)
  }

  function handleLogin(userData) {
    setUser(userData)
    try { localStorage.setItem('user', JSON.stringify(userData)) } catch {}
    // Login bo'lgandan keyin darhol barcha data yuklanadi — bitta so'rovda
    setTimeout(() => bootstrap(), 100)
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (!user) return <Login onLogin={handleLogin} />

  // Sahifalar — faqat aktiv sahifa render bo'ladi
  // useMemo: navigate o'zgarmasa qayta yaratilmaydi
  const Fallback = <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--text2)',fontSize:14}}>Yuklanmoqda...</div>

  const PAGES = {
    dashboard:   <Suspense fallback={Fallback}><Dashboard onNav={navigate} /></Suspense>,
    orders:      <Suspense fallback={Fallback}><Orders /></Suspense>,
    transport:   <Suspense fallback={Fallback}><Transport /></Suspense>,
    workers:     <Suspense fallback={Fallback}><Workers /></Suspense>,
    employees:   <Suspense fallback={Fallback}><Employees /></Suspense>,
    customers:   <Suspense fallback={Fallback}><Customers /></Suspense>,
    finance:     <Suspense fallback={Fallback}><Finance /></Suspense>,
    salary:      <Suspense fallback={Fallback}><Salary /></Suspense>,
    archive:     <Suspense fallback={Fallback}><Archive /></Suspense>,
    settings:    <Suspense fallback={Fallback}><Settings /></Suspense>,
    homeservice: <Suspense fallback={Fallback}><HomeService /></Suspense>,
  }

  return (
    <LangProvider>
      <Sidebar
        active={page}
        onNav={navigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobOpen={mobOpen}
        onCloseMob={() => setMobOpen(false)}
        badges={badges}
      />
      <Navbar
        active={page}
        collapsed={collapsed}
        theme={theme}
        user={user}
        onTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onBurger={() => setMobOpen(true)}
        onLogout={handleLogout}
        notifications={notifications}
        onNav={navigate}
      />
      <main className={`page-wrap ${collapsed ? 'collapsed' : ''}`}>
        {PAGES[page] ?? <Dashboard onNav={navigate} />}
      </main>
      <MobileTabBar
        active={page}
        onNav={navigate}
        onMore={() => setMobOpen(true)}
      />
      <NetworkToast/>
      <ToastContainer />
    </LangProvider>
  )
}
