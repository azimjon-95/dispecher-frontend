/**
 * store/slices/authSlice.js
 * Foydalanuvchi autentifikatsiya holati
 */
import { createSlice } from '@reduxjs/toolkit'

function loadUser() {
  try {
    const token = localStorage.getItem('token')
    const user  = localStorage.getItem('user')
    if (!token || !user) return null
    // JWT exp tekshiruv
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }
    return JSON.parse(user)
  } catch { return null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:  loadUser(),
    token: localStorage.getItem('token') || null,
  },
  reducers: {
    setCredentials(state, { payload }) {
      state.user  = payload.user
      state.token = payload.token
      localStorage.setItem('token', payload.token)
      localStorage.setItem('user',  JSON.stringify(payload.user))
    },
    logout(state) {
      state.user  = null
      state.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

// Selectors
export const selectCurrentUser  = state => state.auth.user
export const selectCurrentToken = state => state.auth.token
export const selectIsAuthed     = state => !!state.auth.token
