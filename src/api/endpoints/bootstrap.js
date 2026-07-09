/**
 * api/endpoints/bootstrap.js
 *
 * GET /api/dashboard/bootstrap — BITTA so'rovda barcha data.
 * RTK Query shu datani 5 daqiqa cache'da saqlaydi.
 * Sahifalar o'tganda server'ga so'rov KETMAYDI.
 *
 * Socket.IO 'data:update' → invalidatesTags → RTK Query
 * avtomatik qayta yuklaydi (faqat o'zgargan resource).
 */
import { baseApi } from '../baseApi'

export const bootstrapApi = baseApi.injectEndpoints({
  endpoints: build => ({

    // ── Bitta so'rovda hammasi ──
    getBootstrap: build.query({
      query: () => ({ url: '/dashboard/bootstrap' }),
      providesTags: ['Bootstrap', 'Orders', 'Drivers', 'Employees',
        'Customers', 'Delivery', 'Pickup', 'Finance', 'Prices', 'Stats'],
      keepUnusedDataFor: 300,
      // Transform: raw data ni normalized formatga
      transformResponse: (res) => ({
        orders:    res.orders    || [],
        drivers:   res.drivers   || [],
        employees: res.employees || [],
        customers: res.customers || [],
        delivery:  res.delivery  || [],
        pickup:    res.pickup    || [],
        finance:   res.finance   || [],
        prices:    res.prices    || [],
        stats:     res.stats     || {},
        _ts:       res._ts       || Date.now(),
      }),
    }),

    // ── Dashboard stats (alohida — tez-tez yangilanadi) ──
    getStats: build.query({
      query: () => ({ url: '/dashboard/stats' }),
      providesTags: ['Stats'],
      keepUnusedDataFor: 60,
    }),

  }),
})

export const {
  useGetBootstrapQuery,
  useGetStatsQuery,
} = bootstrapApi
