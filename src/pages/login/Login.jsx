import { useState } from 'react'
import { api } from '../../services/api.js'
import './Login.css'

export default function Login({ onLogin }) {
  const [phone,   setPhone]   = useState('')
  const [pass,    setPass]    = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!phone || !pass) { setErr('Telefon va parolni kiriting!'); return }
    setLoading(true); setErr('')
    try {
      const res = await api.login(phone, pass)
      localStorage.setItem('token', res.token)
      onLogin(res.user)
    } catch (e) {
      setErr(e?.message || "Noto'g'ri ma'lumot")
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-orb" style={{ width:400, height:400, background:'var(--accent)', top:-150, left:-150 }} />
      <div className="login-orb" style={{ width:300, height:300, background:'var(--purple)', bottom:-80, right:-80 }} />
      <div className="login-orb" style={{ width:200, height:200, background:'var(--green)', top:'40%', right:'10%' }} />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🏭</div>
          <div>
            <div className="login-logo-name">Dispecher</div>
            <div className="login-logo-sub">Admin Panel</div>
          </div>
        </div>
        <div className="login-divider" />
        <h2 className="login-h2">Kirish</h2>
        <p className="login-sub">Tizimga kiring</p>

        <form className="login-form" onSubmit={submit}>
          <div className="fg">
            <label className="flabel">Telefon / Email</label>
            <input className="finput" placeholder="+998 90 000 00 00 yoki admin"
              value={phone} onChange={e => setPhone(e.target.value)} autoFocus />
          </div>
          <div className="fg">
            <label className="flabel">Parol</label>
            <input className="finput" type="password" placeholder="••••••••"
              value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          {err && <div className="login-err">⚠️ {err}</div>}
          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            {loading
              ? <span className="spin" style={{ width:16, height:16, borderWidth:2 }} />
              : 'Kirish →'}
          </button>
        </form>

        <div className="login-hint">
          Demo: istalgan login + parol <code>admin123</code>
        </div>
      </div>
    </div>
  )
}
