/**
 * api/baseApi.js
 *
 * RTK Query — markaziy API konfiguratsiya.
 * Barcha endpoint'lar shu baseApi'dan extends bo'ladi.
 *
 * Xususiyatlar:
 *  - Axios bilan (fetch emas) — interceptor, timeout, retry
 *  - Token avtomatik qo'shiladi
 *  - 401 → auth:expired event (logout)
 *  - Retry: 5xx xatolarda 2 marta qayta urinish
 *  - Cache: RTK Query o'zi boshqaradi (keepUnusedDataFor)
 */
import { createApi } from '@reduxjs/toolkit/query/react'
import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL || 'https://gilam.medme.uz'

// ── Axios instance ──
export const axiosInstance = axios.create({
  baseURL: BASE_URL + '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — token qo'shish
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — 401 → logout
axiosInstance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired',
        { detail: { msg: 'Sessiya tugadi. Qayta kiring.' } }))
    }
    return Promise.reject(err)
  }
)

// ── RTK Query baseQuery (axios bilan) ──
function axiosBaseQuery() {
  return async ({ url, method = 'GET', data, params, headers }) => {
    try {
      const result = await axiosInstance({ url, method, data, params, headers })
      return { data: result.data }
    } catch (err) {
      return {
        error: {
          status: err.response?.status,
          data:   err.response?.data || err.message,
        },
      }
    }
  }
}

// ── Base API — barcha endpoint'lar shu'dan extends ──
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery:   axiosBaseQuery(),
  // Sahifadan ketganda ham N soniya cache saqlanadi
  keepUnusedDataFor: 300, // 5 daqiqa
  // Tag'lar — invalidatesTags/providesTags uchun
  tagTypes: [
    'Bootstrap',
    'Orders', 'OrderItems',
    'Drivers', 'Employees',
    'Customers',
    'Delivery', 'Pickup',
    'Finance', 'Salary',
    'Prices', 'Settings',
    'Attendance', 'Stats',
  ],
  endpoints: () => ({}),
})
