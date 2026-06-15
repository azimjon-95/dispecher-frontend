import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api, norm } from '../services/api.js'
import { bus } from '../services/realtime.js'

const defaultStore = {
  orders:[], drivers:[], employees:[], finance:[],
  setOrders:()=>{}, setDrivers:()=>{}, setEmployees:()=>{}, setFinance:()=>{},
  reload:{ orders:()=>{}, drivers:()=>{}, employees:()=>{}, finance:()=>{}, all:()=>{} }
}
const StoreCtx = createContext(defaultStore)

export function AppStoreProvider({ children }) {
  const [orders,    setOrders]    = useState([])
  const [drivers,   setDrivers]   = useState([])
  const [employees, setEmployees] = useState([])
  const [finance,   setFinance]   = useState([])
  const loadingRef = useRef({})

  const loadOrders = useCallback(async (silent=false) => {
    if (loadingRef.current.orders) return
    loadingRef.current.orders = true
    try {
      setOrders(norm(await api.getOrders()))
    } catch {}
    loadingRef.current.orders = false
  }, [])

  const loadDrivers = useCallback(async () => {
    if (loadingRef.current.drivers) return
    loadingRef.current.drivers = true
    try { setDrivers(norm(await api.getDrivers())) } catch {}
    loadingRef.current.drivers = false
  }, [])

  const loadEmployees = useCallback(async () => {
    try {
      const d = norm(await api.getEmployees())
      setEmployees(d.filter(e => e.role==='Ishchi' && e.status==='active'))
    } catch {}
  }, [])

  const loadFinance = useCallback(async () => {
    try { setFinance(norm(await api.getFinance())) } catch {}
  }, [])

  // Initial load
  useEffect(() => {
    loadOrders()
    loadDrivers()
    loadEmployees()
    loadFinance()
  }, [])

  // Real-time refresh
  useEffect(() => {
    const off1 = bus.on('refresh:orders', () => loadOrders(true))
    const off2 = bus.on('refresh:all',    () => { loadOrders(true); loadFinance() })
    return () => { off1(); off2() }
  }, [loadOrders, loadFinance])

  // Polling every 20s
  useEffect(() => {
    const iv = setInterval(() => loadOrders(true), 20000)
    return () => clearInterval(iv)
  }, [loadOrders])

  return (
    <StoreCtx.Provider value={{
      orders, setOrders,
      drivers, setDrivers,
      employees, setEmployees,
      finance, setFinance,
      reload: {
        orders:    () => loadOrders(false),
        drivers:   loadDrivers,
        employees: loadEmployees,
        finance:   loadFinance,
        all: () => { loadOrders(false); loadDrivers(); loadEmployees(); loadFinance() }
      }
    }}>
      {children}
    </StoreCtx.Provider>
  )
}

export function useStore() {
  return useContext(StoreCtx)
}
