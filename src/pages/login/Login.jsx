import { useState } from 'react'
import { MdPhone, MdLock, MdVisibility, MdVisibilityOff, MdLogin } from 'react-icons/md'
import { api } from '../../services/api.js'
import './Login.css'

/* Variant 2 logo — Qizil/Oltin Islomiy naqsh */
function LogoV2({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer dark ring */}
      <circle cx="110" cy="110" r="108" fill="#280A03"/>
      <circle cx="110" cy="110" r="103" fill="#B73A24"/>
      {/* Gold ring */}
      <circle cx="110" cy="110" r="98" fill="none" stroke="#FFD700" strokeWidth="3"/>
      {/* Cream inner */}
      <circle cx="110" cy="110" r="92" fill="#FFF8E1"/>
      {/* Spokes */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i)=>{
        const a=deg*Math.PI/180
        const x1=110+20*Math.cos(a), y1=110+20*Math.sin(a)
        const x2=110+88*Math.cos(a), y2=110+88*Math.sin(a)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B28200" strokeWidth="1.5" opacity="0.4"/>
      })}
      {/* 8-pointed Islamic star */}
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const a1=deg*Math.PI/180, a2=(deg+22.5)*Math.PI/180
        const pts=[
          `${110},${110}`,
          `${110+50*Math.cos(a1)},${110+50*Math.sin(a1)}`,
          `${110+30*Math.cos(a2)},${110+30*Math.sin(a2)}`
        ].join(' ')
        return <polygon key={i} points={pts} fill={i%2===0?"#B73A24":"#B28200"} opacity="0.9"/>
      })}
      {/* Petal decorations */}
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const a=deg*Math.PI/180
        const px=110+62*Math.cos(a), py=110+62*Math.sin(a)
        return (
          <g key={i}>
            <circle cx={px} cy={py} r="9" fill="#B73A24" opacity="0.85"/>
            <circle cx={px} cy={py} r="5" fill="#FFD700" opacity="0.9"/>
          </g>
        )
      })}
      {/* Center circles */}
      <circle cx="110" cy="110" r="20" fill="#280A03"/>
      <circle cx="110" cy="110" r="13" fill="#FFD700"/>
      <circle cx="110" cy="110" r="7"  fill="#B73A24"/>
      {/* Carpet waves at bottom */}
      {[0,1,2].map(j=>{
        const pts=[]
        for(let x=38;x<=182;x+=8){
          const y=175+j*11+5*Math.sin((x-110)*0.1+j)
          pts.push(`${x},${y}`)
        }
        return <polyline key={j} points={pts.join(' ')} stroke="#B73A24" strokeWidth={4-j} fill="none" opacity={0.9-j*0.25}/>
      })}
    </svg>
  )
}

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
      {/* Background decorations */}
      <div className="login-bg-blob" style={{top:-180,left:-180,width:460,height:460,background:'radial-gradient(circle,rgba(183,58,36,0.18) 0%,transparent 70%)'}}/>
      <div className="login-bg-blob" style={{bottom:-120,right:-120,width:380,height:380,background:'radial-gradient(circle,rgba(13,71,161,0.15) 0%,transparent 70%)'}}/>
      <div className="login-bg-blob" style={{top:'35%',right:'8%',width:220,height:220,background:'radial-gradient(circle,rgba(178,130,0,0.1) 0%,transparent 70%)'}}/>

      <div className="login-card">
        {/* LEFT — branding */}
        <div className="login-left">
          <div className="login-logo-wrap">
            <LogoV2 size={140}/>
          </div>
          <h1 className="login-brand">CleanPro</h1>
          <p className="login-brand-sub">Gilam Yuvish CRM · ERP</p>

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

        {/* RIGHT — form */}
        <div className="login-right">
          <div className="login-form-header">
            <h2>Xush kelibsiz!</h2>
            <p>Hisobingizga kiring</p>
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
              <div className="login-error">
                <span>⚠️ {err}</span>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <><span className="login-spinner"/>Kirilmoqda...</>
                : <><MdLogin size={18}/>Kirish</>
              }
            </button>
          </form>

          <div className="login-footer">
            <span>CleanPro CRM v2.0</span>
            <span>·</span>
            <span>Gilam Yuvish Tizimi</span>
          </div>
        </div>
      </div>
    </div>
  )
}
