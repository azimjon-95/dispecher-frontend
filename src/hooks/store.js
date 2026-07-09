/**
 * hooks/store.js — Typed Redux hooks
 *
 * useAppDispatch  — typed dispatch
 * useAppSelector  — typed selector
 *
 * Resource hooks — bootstrap'dan selector bilan olish:
 *   useOrders()    → { data, isLoading, isError }
 *   useDrivers()
 *   useEmployees()
 *   useCustomers()
 *   ...
 *
 * Sahifalar o'tganda data qayta yuklanmaydi (RTK cache)
 */
import { useDispatch, useSelector } from 'react-redux'
import { useGetBootstrapQuery }     from '../api/endpoints/bootstrap'

// ── Typed hooks ──
export const useAppDispatch = () => useDispatch()
export const useAppSelector = useSelector

// ── Bootstrap dan slice selector ──
function makeBootstrapSelector(key, empty = []) {
  return function useResource(opts = {}) {
    const result = useGetBootstrapQuery(undefined, {
      // Sahifadan ketganda ham 5 daqiqa cache saqlaydi
      // Qaytib kelganda server'ga so'rov KETMAYDI
      ...opts,
    })
    return {
      data:      result.data?.[key] ?? empty,
      isLoading: result.isLoading,
      isFetching: result.isFetching,
      isError:   result.isError,
      error:     result.error,
      refetch:   result.refetch,
    }
  }
}

// ── Resource hooks — barcha sahifalar shu'dan foydalanadi ──
export const useOrders    = makeBootstrapSelector('orders')
export const useDrivers   = makeBootstrapSelector('drivers')
export const useEmployees = makeBootstrapSelector('employees')
export const useCustomers = makeBootstrapSelector('customers')
export const useDelivery  = makeBootstrapSelector('delivery')
export const usePickup    = makeBootstrapSelector('pickup')
export const useFinance   = makeBootstrapSelector('finance')
export const usePrices    = makeBootstrapSelector('prices')
export const useStats     = () => {
  const result = useGetBootstrapQuery(undefined)
  return { data: result.data?.stats ?? {}, isLoading: result.isLoading }
}
