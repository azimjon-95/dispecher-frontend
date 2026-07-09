/**
 * store/slices/uiSlice.js
 * UI holati — sidebar, theme, active page
 */
import { createSlice } from '@reduxjs/toolkit'

function getSavedPage() {
  try { return localStorage.getItem('activePage') || 'dashboard' } catch { return 'dashboard' }
}
function getSavedTheme() {
  try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activePage: getSavedPage(),
    theme:      getSavedTheme(),
    collapsed:  false,
    mobOpen:    false,
  },
  reducers: {
    setPage(state, { payload }) {
      state.activePage = payload
      try { localStorage.setItem('activePage', payload) } catch {}
    },
    setTheme(state, { payload }) {
      state.theme = payload
      document.documentElement.setAttribute('data-theme', payload)
      try { localStorage.setItem('theme', payload) } catch {}
    },
    setCollapsed(state, { payload }) { state.collapsed = payload },
    setMobOpen(state,   { payload }) { state.mobOpen   = payload },
  },
})

export const { setPage, setTheme, setCollapsed, setMobOpen } = uiSlice.actions
export default uiSlice.reducer

// Selectors
export const selectPage      = state => state.ui.activePage
export const selectTheme     = state => state.ui.theme
export const selectCollapsed = state => state.ui.collapsed
export const selectMobOpen   = state => state.ui.mobOpen
