/**
 * api/endpoints/resources.js
 *
 * Barcha CRUD endpoint'lar — orders, drivers, employees,
 * customers, delivery, pickup, finance, prices, salary.
 *
 * Har mutation (create/update/delete) kerakli tag'larni
 * invalidate qiladi → RTK Query avtomatik qayta yuklaydi.
 */
import { baseApi } from '../baseApi'

export const resourcesApi = baseApi.injectEndpoints({
  endpoints: build => {

    // ── Helper: standart CRUD endpoint'lar ──
    function crudEndpoints(resource, tags) {
      return {
        [`getAll${resource}`]: build.query({
          query: (params) => ({ url: `/${resource.toLowerCase()}`, params }),
          providesTags: tags,
          keepUnusedDataFor: 300,
        }),
        [`get${resource}ById`]: build.query({
          query: (id) => ({ url: `/${resource.toLowerCase()}/${id}` }),
          providesTags: (_, __, id) => [{ type: tags[0], id }],
        }),
        [`create${resource}`]: build.mutation({
          query: (data) => ({ url: `/${resource.toLowerCase()}`, method: 'POST', data }),
          invalidatesTags: tags,
        }),
        [`update${resource}`]: build.mutation({
          query: ({ id, ...data }) => ({ url: `/${resource.toLowerCase()}/${id}`, method: 'PUT', data }),
          invalidatesTags: tags,
        }),
        [`delete${resource}`]: build.mutation({
          query: (id) => ({ url: `/${resource.toLowerCase()}/${id}`, method: 'DELETE' }),
          invalidatesTags: tags,
        }),
      }
    }

    return {
      // ── Orders ──
      ...crudEndpoints('Orders', ['Orders', 'Stats', 'Bootstrap']),
      getOrderItems: build.query({
        query: (orderId) => ({ url: `/order-items`, params: { orderId } }),
        providesTags: ['OrderItems'],
        keepUnusedDataFor: 120,
      }),
      updateOrderItem: build.mutation({
        query: ({ id, ...data }) => ({ url: `/order-items/${id}`, method: 'PUT', data }),
        invalidatesTags: ['OrderItems', 'Orders', 'Stats'],
      }),

      // ── Drivers ──
      ...crudEndpoints('Drivers', ['Drivers', 'Bootstrap']),
      generateDriverPin: build.mutation({
        query: (id) => ({ url: `/drivers/${id}/generate-pin`, method: 'POST' }),
        invalidatesTags: ['Drivers'],
      }),

      // ── Employees ──
      ...crudEndpoints('Employees', ['Employees', 'Bootstrap']),
      generateEmployeePin: build.mutation({
        query: (id) => ({ url: `/employees/${id}/generate-pin`, method: 'POST' }),
        invalidatesTags: ['Employees'],
      }),

      // ── Customers ──
      ...crudEndpoints('Customers', ['Customers', 'Bootstrap']),

      // ── Delivery ──
      getAllDelivery: build.query({
        query: () => ({ url: '/delivery' }),
        providesTags: ['Delivery'],
        keepUnusedDataFor: 300,
      }),
      updateDelivery: build.mutation({
        query: ({ id, ...data }) => ({ url: `/delivery/${id}`, method: 'PUT', data }),
        invalidatesTags: ['Delivery', 'Bootstrap'],
      }),
      deleteDelivery: build.mutation({
        query: (id) => ({ url: `/delivery/${id}`, method: 'DELETE' }),
        invalidatesTags: ['Delivery'],
      }),

      // ── Pickup ──
      getAllPickup: build.query({
        query: () => ({ url: '/pickup' }),
        providesTags: ['Pickup'],
        keepUnusedDataFor: 300,
      }),
      updatePickup: build.mutation({
        query: ({ id, ...data }) => ({ url: `/pickup/${id}`, method: 'PUT', data }),
        invalidatesTags: ['Pickup', 'Bootstrap'],
      }),
      deletePickup: build.mutation({
        query: (id) => ({ url: `/pickup/${id}`, method: 'DELETE' }),
        invalidatesTags: ['Pickup'],
      }),

      // ── Finance ──
      ...crudEndpoints('Finance', ['Finance', 'Stats', 'Bootstrap']),

      // ── Salary ──
      ...crudEndpoints('Salary', ['Salary']),

      // ── Prices ──
      ...crudEndpoints('Prices', ['Prices', 'Bootstrap']),

      // ── Settings ──
      getSettings: build.query({
        query: () => ({ url: '/settings' }),
        providesTags: ['Settings'],
        keepUnusedDataFor: 600,
      }),
      updateSettings: build.mutation({
        query: (data) => ({ url: '/settings', method: 'PUT', data }),
        invalidatesTags: ['Settings'],
      }),
      getCompanyLocation: build.query({
        query: () => ({ url: '/settings/company-location' }),
        keepUnusedDataFor: 600,
      }),

      // ── Attendance ──
      getAttendanceToday: build.query({
        query: () => ({ url: '/attendance/today' }),
        providesTags: ['Attendance'],
        keepUnusedDataFor: 60,
      }),

      // ── Bot ──
      requestLocation: build.mutation({
        query: (data) => ({ url: '/bot/request-location', method: 'POST', data }),
      }),
    }
  },
})

export const {
  // Orders
  useGetAllOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrdersMutation,
  useUpdateOrdersMutation,
  useDeleteOrdersMutation,
  useGetOrderItemsQuery,
  useUpdateOrderItemMutation,
  // Drivers
  useGetAllDriversQuery,
  useCreateDriversMutation,
  useUpdateDriversMutation,
  useDeleteDriversMutation,
  useGenerateDriverPinMutation,
  // Employees
  useGetAllEmployeesQuery,
  useCreateEmployeesMutation,
  useUpdateEmployeesMutation,
  useDeleteEmployeesMutation,
  useGenerateEmployeePinMutation,
  // Customers
  useGetAllCustomersQuery,
  useCreateCustomersMutation,
  useUpdateCustomersMutation,
  useDeleteCustomersMutation,
  // Delivery
  useGetAllDeliveryQuery,
  useUpdateDeliveryMutation,
  useDeleteDeliveryMutation,
  // Pickup
  useGetAllPickupQuery,
  useUpdatePickupMutation,
  useDeletePickupMutation,
  // Finance
  useGetAllFinanceQuery,
  useCreateFinanceMutation,
  useUpdateFinanceMutation,
  useDeleteFinanceMutation,
  // Salary
  useGetAllSalaryQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
  useDeleteSalaryMutation,
  // Prices
  useGetAllPricesQuery,
  useCreatePricesMutation,
  useUpdatePricesMutation,
  useDeletePricesMutation,
  // Settings
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetCompanyLocationQuery,
  // Attendance
  useGetAttendanceTodayQuery,
  // Bot
  useRequestLocationMutation,
} = resourcesApi
