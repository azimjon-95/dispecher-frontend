import { useState } from 'react'
import { MdPhone, MdLock, MdVisibility, MdVisibilityOff, MdLogin } from 'react-icons/md'
import { api } from '../../services/api.js'
import { LogoFull } from '../../assets/logo.jsx'
import './Login.css'

export default function Login({ onLogin }) {
  const [phone,   setPhone]   = useState('')
  const [pass,    setPass]    = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!phone || !pass) { setErr("Telefon va parolni kiriting!"); return }
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
      <div className="login-bg-blob" style={{top:-200,left:-200,width:500,height:500,background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)'}}/>
      <div className="login-bg-blob" style={{bottom:-150,right:-150,width:400,height:400,background:'radial-gradient(circle,rgba(6,182,212,0.1) 0%,transparent 70%)'}}/>

      <div className="login-card">

        {/* ── LEFT: Branding ── */}
        <div className="login-left">
          <div className="login-logo-wrap">
            <LogoFull size={200}/>
          </div>

          <div className="login-features">
            {[
              ['📦', 'Buyurtmalar nazorati'],
              ['🚛', 'Shafyor & Transport'],
              ['👷', 'Ishchilar boshqaruvi'],
              ['💰', 'Moliyaviy hisobotlar'],
              ['📡', 'Offline rejimda ishlaydi'],
            ].map(([icon, txt]) => (
              <div key={txt} className="login-feature-item">
                <span className="login-feature-icon">{icon}</span>
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Form ── */}
        <div className="login-right">
          <div className="login-form-header">
            <h2>Xush kelibsiz!</h2>
            <p>Tartib CRM tizimiga kiring</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <div className="login-field">
              <label>Telefon raqam</label>
              <div className="login-input-wrap">
                <MdPhone size={18} className="login-input-icon"/>
                <input
                  type="tel"
                  placeholder="+998 90 000 00 00"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label>Parol</label>
              <div className="login-input-wrap">
                <MdLock size={18} className="login-input-icon"/>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                />
                <button type="button" className="login-pwd-toggle" onClick={() => setShowPwd(v=>!v)}>
                  {showPwd ? <MdVisibilityOff size={18}/> : <MdVisibility size={18}/>}
                </button>
              </div>
            </div>

            {err && (
              <div className="login-error">⚠️ {err}</div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <><span className="login-spinner"/>Kirilmoqda...</>
                : <><MdLogin size={18}/>Kirish</>
              }
            </button>
          </form>

          <div className="login-footer">
            <span>Tartib CRM v2.0</span>
            <span>·</span>
            <span>Gilam yuvish boshqaruv tizimi</span>
          </div>
        </div>
      </div>
    </div>
  )
}
