/**
 * store/index.js — Markaziy Redux Store
 *
 * Tarkib:
 *   api          — RTK Query cache (barcha server data)
 *   auth         — foydalanuvchi session
 *   ui           — loading, sidebar, theme
 */
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../api/baseApi'
import authReducer from './slices/authSlice'
import uiReducer   from './slices/uiSlice'

// RTK Query'ning error va loading larni konsol'ga log qilish
const rtkLogger = (store) => (next) => (action) => {
  if (
    typeof action.type === 'string' &&
    action.type.endsWith('/rejected') &&
    action.payload?.status >= 500
  ) {
    console.error('[RTK]', action.type, action.payload)
  }
  return next(action)
}

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    ui:   uiReducer,
  },
  middleware: (getDefault) =>
    getDefault()
      .concat(baseApi.middleware)
      .concat(rtkLogger),
  devTools: import.meta.env.DEV,
})

// RTK Query invalidation — Socket.IO'dan kelgan yangilanishlar uchun
// Tashqaridan chaqiriladi: socketInvalidate('Orders')
export function socketInvalidate(...tags) {
  store.dispatch(baseApi.util.invalidateTags(tags))
}

// Butun cache'ni tozalash (logout'da)
export function resetApiCache() {
  store.dispatch(baseApi.util.resetApiState())
}
