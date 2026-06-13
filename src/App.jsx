import { useState, useEffect, useCallback } from 'react'
import Sidebar   from './components/layout/Sidebar.jsx'
import Navbar    from './components/layout/Navbar.jsx'
import { ToastContainer } from './components/ui/UI.jsx'
import Login     from './pages/login/Login.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import Orders    from './pages/orders/Orders.jsx'
import Transport from './pages/transport/Transport.jsx'
import Workers   from './pages/workers/Workers.jsx'
import Employees from './pages/employees/Employees.jsx'
import Drivers   from './pages/drivers/Drivers.jsx'
import Customers from './pages/customers/Customers.jsx'
import Finance   from './pages/finance/Finance.jsx'
import Salary    from './pages/salary/Salary.jsx'
import Archive   from './pages/archive/Archive.jsx'
import Settings     from './pages/settings/Settings.jsx'
import HomeService  from './pages/homeservice/HomeService.jsx'
import { useNetworkStatus, NetworkToast } from './hooks/useNetworkStatus.jsx'
import MobileTabBar from './components/layout/MobileTabBar.jsx'
import { syncOfflineQueue, getQueueSize, isOnline } from './services/api.js'
import { api, norm } from './services/api.js'

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
  const [badges, setBadges] = useState({ orders: 0, transport: 0 })

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

  const networkStatus = useNetworkStatus()

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

      setBadges({
        orders:    orders.filter(o => !['tugallandi','bekor'].includes(o.status)).length,
        transport: [...deliveries,...pickups].filter(t => t.status !== 'yetkazildi' && t.status !== 'bekor').length,
      })
    } catch {}
  }, [user])

  useEffect(() => {
    if (user) {
      loadBadges()
      const interval = setInterval(loadBadges, 30000)
      return () => clearInterval(interval)
    }
  }, [user, loadBadges])

  /* ── Startup sync: sahifa ochilganda offline queue ni yuborish ── */
  useEffect(() => {
    if (!user) return

    async function startupSync() {
      try {
        const size = await getQueueSize()
        if (size === 0) return
        if (!isOnline()) return  // Internet yo'q — skip, 'online' event kutiladi

        // 2 sekunddan keyin — sahifa to'liq yuklanib, useNetworkStatus ham tayyor bo'lsin
        // useNetworkStatus ham sync qiladi, shuning uchun bitta bo'lishi uchun kutamiz
        await new Promise(r => setTimeout(r, 2000))

        const stillSize = await getQueueSize()
        if (stillSize === 0) return  // useNetworkStatus allaqachon sync qildi

        const synced = await syncOfflineQueue()
        if (synced > 0) {
          const { toast } = await import('./components/ui/UI.jsx')
          toast(synced + " ta offline o'zgarish serverga yuborildi ✅", 'ok')
          loadBadges()
        }
      } catch(e) {
        console.warn('Startup sync error:', e)
      }
    }

    const t = setTimeout(startupSync, 1500)
    return () => clearTimeout(t)
  }, [user])

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
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (!user) return <Login onLogin={handleLogin} />

  const PAGES = {
    dashboard: <Dashboard onNav={navigate} />,
    orders:    <Orders />,
    transport: <Transport />,
    workers:   <Workers />,
    employees: <Employees />,
    drivers:   <Drivers />,
    customers: <Customers />,
    finance:   <Finance />,
    salary:    <Salary />,
    archive:   <Archive />,
    settings:    <Settings />,
    homeservice: <HomeService />,
  }

  return (
    <>
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
        networkStatus={networkStatus}
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
    </>
  )
}
