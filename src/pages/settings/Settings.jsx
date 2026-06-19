import React, { useState, useEffect } from 'react'
import { MdAdd, MdEdit, MdDelete, MdSave, MdContentCopy, MdSend, MdRefresh, MdVisibility, MdVisibilityOff, MdCheckCircle, MdError } from 'react-icons/md'
import { Modal, toast } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import { useLang } from '../../i18n/index.jsx'
const isMob = () => window.innerWidth <= 768
import './Settings.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
function hdrs() { return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') } }

function TgLogo({ size = 16 }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size, flexShrink: 0 }}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/></svg>
}

function Toggle({ value, onChange, color }) {
  const on = value === 'true' || value === true
  const c  = color || 'var(--green)'
  return (
    <div onClick={() => onChange(on ? 'false' : 'true')} style={{ width: 44, height: 24, borderRadius: 99, cursor: 'pointer', background: on ? c : 'var(--bg4)', border: `1px solid ${on ? c : 'var(--border)'}`, position: 'relative', transition: 'all .25s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 22 : 3, transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }}/>
    </div>
  )
}

function PwdField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input className="finput" type={show ? 'text' : 'password'} placeholder={placeholder || '...'} value={value || ''} onChange={onChange} style={{ flex: 1, fontFamily: 'monospace' }}/>
      <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={() => setShow(v => !v)}>
        {show ? <MdVisibilityOff size={15}/> : <MdVisibility size={15}/>}
      </button>
    </div>
  )
}

function ResultBox({ res }) {
  if (!res) return null
  return (
    <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: res.ok ? 'var(--greenbg)' : 'var(--redbg)', border: `1px solid ${res.ok ? 'rgba(63,185,80,.2)' : 'rgba(248,81,73,.2)'}`, color: res.ok ? 'var(--green)' : 'var(--red)' }}>
      {res.ok ? <MdCheckCircle size={15}/> : <MdError size={15}/>} {res.msg}
    </div>
  )
}

/* ── TELEGRAM TAB ── */
function TelegramTab() {
  const [cfg,      setCfg]   = useState({ BOT_TOKEN:'', BOT_USERNAME:'', ADMIN_CHAT_ID:'', WEBAPP_URL:'' })
  const [hasToken, setHasToken] = useState(false)
  const [load,  setLoad]  = useState(true)
  const [save,  setSave]  = useState(false)
  const [test,  setTest]  = useState(false)
  const [res,   setRes]   = useState(null)
  const [tchat, setTchat] = useState('')

  useEffect(() => {
    fetch(API + '/api/telegram-settings', { headers: hdrs() })
      .then(r => r.json()).then(d => { setCfg(d); setTchat(d.ADMIN_CHAT_ID || '') })
      .catch(() => {}).finally(() => setLoad(false))
  }, [])

  function s(k) { return e => setCfg(p => ({ ...p, [k]: e.target.value })) }

  async function doSave() {
    if (save) return; setSave(true)
    try {
      const r = await fetch(API + '/api/telegram-settings', { method: 'PUT', headers: hdrs(), body: JSON.stringify(cfg) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast('Telegram sozlamalari saqlandi ✅', 'ok')
    } catch(e) { toast(e.message, 'err') } finally { setSave(false) }
  }

  async function doTest() {
    if (test) return; setTest(true); setRes(null)
    try {
      const r = await fetch(API + '/api/telegram-settings/test', { method: 'POST', headers: hdrs(), body: JSON.stringify({ chatId: tchat }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRes({ ok: true, msg: d.message || 'Test xabari yuborildi' })
    } catch(e) { setRes({ ok: false, msg: e.message }) } finally { setTest(false) }
  }

  if (load) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>⏳ Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(34,158,217,.1)', border: '1px solid rgba(34,158,217,.2)', borderRadius: 'var(--r2)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#229ED9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><TgLogo size={22}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Telegram Bot sozlamalari</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>DB da saqlanadi — serverni qayta ishga tushirish shart emas</div>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: (hasToken || cfg.BOT_TOKEN) ? 'var(--greenbg)' : 'var(--redbg)', color: (hasToken || cfg.BOT_TOKEN) ? 'var(--green)' : 'var(--red)' }}>
          {(hasToken || cfg.BOT_TOKEN) ? '🟢 Sozlangan' : '🔴 Sozlanmagan'}
        </div>
      </div>

      {/* token */}
      <div className="card">
        <div className="card-hd"><div><div className="card-title">🔑 Bot Token</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>@BotFather → /newbot → tokenni nusxa oling</div></div></div>
        <div className="fg" style={{ marginBottom: 10 }}>
          <label className="flabel">BOT_TOKEN *</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <PwdField value={cfg.BOT_TOKEN} onChange={s('BOT_TOKEN')}
              placeholder="1234567890:ABCDef..."/>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { navigator.clipboard?.writeText(cfg.BOT_TOKEN); toast('Nusxa olindi', 'ok') }}><MdContentCopy size={14}/></button>
          </div>
        </div>
        <div className="fgrid2">
          <div className="fg">
            <label className="flabel">BOT_USERNAME</label>
            <input className="finput" placeholder="DispecherBot (@ belgisisiz)" value={cfg.BOT_USERNAME} onChange={s('BOT_USERNAME')}/>
          </div>
          <div className="fg">
            <label className="flabel">WEBAPP_URL</label>
            <input className="finput" placeholder="https://yoursite.com/driver-app" value={cfg.WEBAPP_URL} onChange={s('WEBAPP_URL')}/>
          </div>
        </div>
      </div>

      {/* admin chat id */}
      <div className="card">
        <div className="card-hd"><div><div className="card-title">👤 Admin Chat ID</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>@userinfobot ga /start yozing → ID oling</div></div></div>
        <div className="fg">
          <label className="flabel">ADMIN_CHAT_ID</label>
          <input className="finput" placeholder="123456789" value={cfg.ADMIN_CHAT_ID} onChange={s('ADMIN_CHAT_ID')} style={{ fontFamily: 'monospace' }}/>
        </div>
      </div>

      {/* test */}
      <div className="card">
        <div className="card-hd"><div className="card-title">🧪 Bot sinovi</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fg" style={{ flex: 1, minWidth: 180 }}>
            <label className="flabel">Chat ID (bo'sh = ADMIN_CHAT_ID)</label>
            <input className="finput" placeholder="123456789" value={tchat} onChange={e => setTchat(e.target.value)} style={{ fontFamily: 'monospace' }}/>
          </div>
          <button className="btn btn-primary" onClick={doTest} disabled={test || !cfg.BOT_TOKEN} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {test ? '⏳' : <><MdSend size={14}/> Test</>}
          </button>
        </div>
        <ResultBox res={res}/>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}><MdRefresh size={14}/></button>
        <button className="btn btn-primary" onClick={doSave} disabled={save} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {save ? '⏳' : <><MdSave size={14}/> Saqlash</>}
        </button>
      </div>
    </div>
  )
}

/* ── SMS API TAB ── */
const SMS_PROVS = [
  { id: 'none',       label: "O'chirilgan",    color: 'var(--text3)', icon: '🚫', desc: 'SMS yuborilmaydi' },
  { id: 'eskiz',      label: 'Eskiz.uz',       color: '#f0883e',      icon: '🇺🇿', desc: "O'zbek operatori" },
  { id: 'playmobile', label: 'Playmobile.uz',  color: 'var(--accent)',icon: '📱', desc: "O'zbek operatori" },
  { id: 'twilio',     label: 'Twilio',         color: '#e01e5a',      icon: '🌍', desc: 'Xalqaro platform' },
]
const DEF_SMS = { SMS_PROVIDER:'none', SMS_ENABLED:'false', TG_SMS_ENABLED:'true', PHONE_SMS_ENABLED:'true', ESKIZ_EMAIL:'', ESKIZ_PASSWORD:'', ESKIZ_FROM:'4546', PLAYMOBILE_LOGIN:'', PLAYMOBILE_PASSWORD:'', PLAYMOBILE_ORIGINATOR:'Dispecher', TWILIO_ACCOUNT_SID:'', TWILIO_AUTH_TOKEN:'', TWILIO_FROM:'' }

function SmsApiTab() {
  const [cfg,   setCfg]   = useState(DEF_SMS)
  const [load,  setLoad]  = useState(true)
  const [save,  setSave]  = useState(false)
  const [test,  setTest]  = useState(false)
  const [phone, setPhone] = useState('+998901234567')
  const [res,   setRes]   = useState(null)

  useEffect(() => {
    fetch(API + '/api/sms-settings', { headers: hdrs() })
      .then(r => r.json()).then(d => setCfg({ ...DEF_SMS, ...d }))
      .catch(() => {}).finally(() => setLoad(false))
  }, [])

  function s(k) { return e => setCfg(p => ({ ...p, [k]: e.target.value })) }
  function tog(k) { setCfg(p => ({ ...p, [k]: p[k] === 'true' ? 'false' : 'true' })) }

  async function doSave() {
    if (save) return; setSave(true)
    try {
      const r = await fetch(API + '/api/sms-settings', { method: 'PUT', headers: hdrs(), body: JSON.stringify(cfg) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      toast('SMS sozlamalari saqlandi ✅', 'ok')
    } catch(e) { toast(e.message, 'err') } finally { setSave(false) }
  }

  async function doTest() {
    if (test) return; setTest(true); setRes(null)
    try {
      const r = await fetch(API + '/api/sms-settings/test', { method: 'POST', headers: hdrs(), body: JSON.stringify({ phone }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setRes({ ok: true, msg: 'Test SMS yuborildi — ' + (d.provider || '') })
    } catch(e) { setRes({ ok: false, msg: e.message }) } finally { setTest(false) }
  }

  if (load) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>⏳ Yuklanmoqda...</div>

  const curProv = SMS_PROVS.find(p => p.id === cfg.SMS_PROVIDER) || SMS_PROVS[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* channels */}
      <div className="card">
        <div className="card-hd"><div className="card-title">🔔 SMS kanallarni boshqarish</div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { k: 'TG_SMS_ENABLED',    icon: '💬', label: 'Telegram orqali xabar',  desc: 'TG bot orqali shablonli xabar',  color: '#229ED9' },
            { k: 'PHONE_SMS_ENABLED', icon: '📲', label: 'Telefon SMS',            desc: 'Operator API orqali SMS',         color: 'var(--green)' },
            { k: 'SMS_ENABLED',       icon: '📡', label: 'Avtomatik SMS yoqilgan', desc: 'Provayder orqali avtomatik yuborish', color: 'var(--orange)' },
          ].map(it => (
            <div key={it.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{it.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{it.desc}</div>
              </div>
              <Toggle value={cfg[it.k]} onChange={v => setCfg(p => ({ ...p, [it.k]: v }))} color={it.color}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: cfg[it.k] === 'true' ? it.color : 'var(--text3)', minWidth: 28 }}>
                {cfg[it.k] === 'true' ? 'ON' : 'OFF'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* provider select */}
      <div className="card">
        <div className="card-hd">
          <div><div className="card-title">📡 SMS Provayder</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>Telefon SMS uchun xizmat tanlang</div></div>
          <div style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: curProv.color + '22', color: curProv.color }}>{curProv.icon} {curProv.label}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {SMS_PROVS.map(p => (
            <div key={p.id} onClick={() => setCfg(prev => ({ ...prev, SMS_PROVIDER: p.id }))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r)', cursor: 'pointer', background: cfg.SMS_PROVIDER === p.id ? p.color + '15' : 'var(--bg3)', border: `2px solid ${cfg.SMS_PROVIDER === p.id ? p.color : 'var(--border)'}`, transition: 'all .2s' }}>
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              <div><div style={{ fontWeight: 700, fontSize: 12, color: cfg.SMS_PROVIDER === p.id ? p.color : 'var(--text)' }}>{p.label}</div><div style={{ fontSize: 10, color: 'var(--text2)' }}>{p.desc}</div></div>
              {cfg.SMS_PROVIDER === p.id && <span style={{ marginLeft: 'auto', color: p.color, fontSize: 16 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Eskiz */}
      {cfg.SMS_PROVIDER === 'eskiz' && (
        <div className="card">
          <div className="card-hd"><div className="card-title">🇺🇿 Eskiz.uz</div><a href="https://eskiz.uz" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>eskiz.uz →</a></div>
          <div className="fgrid2" style={{ marginBottom: 10 }}>
            <div className="fg"><label className="flabel">Email *</label><input className="finput" placeholder="login@company.uz" value={cfg.ESKIZ_EMAIL} onChange={s('ESKIZ_EMAIL')}/></div>
            <div className="fg"><label className="flabel">Parol *</label><PwdField value={cfg.ESKIZ_PASSWORD} onChange={s('ESKIZ_PASSWORD')}/></div>
          </div>
          <div className="fg"><label className="flabel">Sender (FROM)</label><input className="finput" placeholder="4546" value={cfg.ESKIZ_FROM} onChange={s('ESKIZ_FROM')}/></div>
        </div>
      )}

      {/* Playmobile */}
      {cfg.SMS_PROVIDER === 'playmobile' && (
        <div className="card">
          <div className="card-hd"><div className="card-title">📱 Playmobile.uz</div><a href="https://playmobile.uz" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>playmobile.uz →</a></div>
          <div className="fgrid2" style={{ marginBottom: 10 }}>
            <div className="fg"><label className="flabel">Login *</label><input className="finput" value={cfg.PLAYMOBILE_LOGIN} onChange={s('PLAYMOBILE_LOGIN')}/></div>
            <div className="fg"><label className="flabel">Parol *</label><PwdField value={cfg.PLAYMOBILE_PASSWORD} onChange={s('PLAYMOBILE_PASSWORD')}/></div>
          </div>
          <div className="fg"><label className="flabel">Originator</label><input className="finput" placeholder="Dispecher" value={cfg.PLAYMOBILE_ORIGINATOR} onChange={s('PLAYMOBILE_ORIGINATOR')}/></div>
        </div>
      )}

      {/* Twilio */}
      {cfg.SMS_PROVIDER === 'twilio' && (
        <div className="card">
          <div className="card-hd"><div className="card-title">🌍 Twilio</div><a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>console.twilio.com →</a></div>
          <div className="fg" style={{ marginBottom: 10 }}><label className="flabel">Account SID *</label><input className="finput" placeholder="ACxxxxxxxx..." value={cfg.TWILIO_ACCOUNT_SID} onChange={s('TWILIO_ACCOUNT_SID')} style={{ fontFamily: 'monospace' }}/></div>
          <div className="fg" style={{ marginBottom: 10 }}><label className="flabel">Auth Token *</label><PwdField value={cfg.TWILIO_AUTH_TOKEN} onChange={s('TWILIO_AUTH_TOKEN')}/></div>
          <div className="fg"><label className="flabel">From (Twilio raqam)</label><input className="finput" placeholder="+12345678901" value={cfg.TWILIO_FROM} onChange={s('TWILIO_FROM')} style={{ fontFamily: 'monospace' }}/></div>
        </div>
      )}

      {/* test */}
      {cfg.SMS_PROVIDER !== 'none' && (
        <div className="card">
          <div className="card-hd"><div className="card-title">🧪 Test SMS</div></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="fg" style={{ flex: 1, minWidth: 180 }}>
              <label className="flabel">Test raqam</label>
              <input className="finput" placeholder="+998901234567" value={phone} onChange={e => setPhone(e.target.value)} style={{ fontFamily: 'monospace' }}/>
            </div>
            <button className="btn btn-primary" onClick={doTest} disabled={test || cfg.SMS_ENABLED !== 'true'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {test ? '⏳' : <><MdSend size={14}/> Test</>}
            </button>
          </div>
          {cfg.SMS_ENABLED !== 'true' && <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 6 }}>⚠️ Test uchun "Avtomatik SMS yoqilgan" ni ON qiling</div>}
          <ResultBox res={res}/>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={doSave} disabled={save} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {save ? '⏳ Saqlanmoqda...' : <><MdSave size={14}/> Saqlash</>}
        </button>
      </div>
    </div>
  )
}

/* ── MAIN ── */
const INIT_PRICES = [
  { _id:'p1', item:"Ko'ylak", price:8000,  unit:'dona' },
  { _id:'p2', item:'Shim',    price:10000, unit:'dona' },
  { _id:'p3', item:"Ko'rpa",  price:25000, unit:'dona' },
  { _id:'p4', item:'Gilam',   price:15000, unit:'kv.m' },
  { _id:'p5', item:'Parda',   price:12000, unit:'dona' },
]
const ROLES_LIST = [
  { role:'Super Admin', perms:['Hammasi'] },
  { role:'Dispecher',   perms:['Buyurtmalar','Mijozlar','Hisobot'] },
  { role:'Ishchi',      perms:["O'z topshiriqlari"] },
  { role:'Shafyor',     perms:["O'z topshiriqlari",'Status yangilash'] },
]
const TABS = [
  { id:'telegram', label:'Telegram Bot',    icon:<TgLogo size={13}/> },
  { id:'sms-api',  label:'SMS Provayderlar', icon:'📡' },
  { id:'sms-tmpl', label:'SMS Shablonlar',   icon:'📝' },
  { id:'prices',   label:'Narxlar',           icon:'💲' },
  { id:'roles',    label:'Rollar',             icon:'🔐' },
  { id:'general',  label:'Umumiy',             icon:'⚙️' },
]

export default function Settings() {
  const { t } = useLang()
  const [tab,    setTab]    = useState('telegram')
  const [mobile, setMobile] = useState(isMob())
  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const [prices, setPrices] = useState(INIT_PRICES)
  const [modal,  setModal]  = useState(null)
  const [pform,  setPform]  = useState({})
  const [co,     setCo]     = useState('Tartib CRM')
  const [ph,     setPh]     = useState('+998 90 123 45 67')
  const [ad,     setAd]     = useState('Toshkent sh.')

  function savePrice() {
  const { t } = useLang()
    if (!pform.item || !pform.price) { toast("Maydonlarni to'ldiring!", 'err'); return }
    if (modal==='create') { setPrices(p => [...p, { _id:'p'+Date.now(), ...pform }]); toast("Narx qo'shildi ✅",'ok') }
    else { setPrices(p => p.map(x => x._id===pform._id ? {...x,...pform} : x)); toast('Yangilandi','ok') }
    setModal(null)
  }

  const TABS_MOBILE = [
    { id:'telegram', label:'Telegram Bot', icon:'✈️', color:'#229ED9' },
    { id:'sms-api',  label:'SMS Provayder', icon:'📱', color:'#22c55e' },
    { id:'sms-tmpl', label:'SMS Shablonlar', icon:'📝', color:'#f59e0b' },
    { id:'prices',   label:'Narxlar',        icon:'💰', color:'#8b5cf6' },
    { id:'roles',    label:'Rollar',         icon:'👥', color:'#3B82F6' },
    { id:'company',  label:'Kompaniya',      icon:'🏢', color:'#f97316' },
  ]

  if (mobile) return (
    <ErrorBoundary>
      <div style={{paddingBottom:90}}>

        {/* Tab pills */}
        <div style={{
          display:'flex',gap:6,overflowX:'auto',
          padding:'10px 16px 6px',scrollbarWidth:'none',
          position:'sticky',top:52,zIndex:50,
          background:'var(--bg)',borderBottom:'1px solid var(--border)',
        }}>
          {TABS_MOBILE.map(t=>{
            const isAct = tab===t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                flexShrink:0,display:'flex',alignItems:'center',gap:5,
                padding:'6px 12px',borderRadius:99,cursor:'pointer',
                background:isAct?`${t.color}20`:'var(--bg2)',
                border:`1px solid ${isAct?t.color+'60':'var(--border)'}`,
                color:isAct?t.color:'var(--text3)',
                fontSize:12,fontWeight:700,
                WebkitTapHighlightColor:'transparent',
              }}>
                {t.icon} {t.label}
              </button>
            )
          })}
          <style>{`::-webkit-scrollbar{display:none}`}</style>
        </div>

        {/* Active section header */}
        {(()=>{
          const t = TABS_MOBILE.find(x=>x.id===tab)
          return (
            <div style={{
              margin:'12px 16px 8px',
              padding:'12px 14px',
              background:`${t.color}10`,
              border:`1px solid ${t.color}25`,
              borderRadius:14,
              display:'flex',alignItems:'center',gap:10,
            }}>
              <span style={{fontSize:22}}>{t.icon}</span>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{t.label}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>
                  {tab==='telegram' && 'Bot token va admin ID sozlang'}
                  {tab==='sms-api'  && 'SMS provayderni tanlang va sozlang'}
                  {tab==='sms-tmpl' && 'Avtomatik xabarlar matnini tahrirlang'}
                  {tab==='prices'   && 'Gilam yuvish narxlarini belgilang'}
                  {tab==='roles'    && 'Foydalanuvchi huquqlarini sozlang'}
                  {tab==='company'  && 'Kompaniya ma\'lumotlarini kiriting'}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Content */}
        <div style={{padding:'0 16px'}}>
          {tab==='telegram' && <TelegramTab/>}
          {tab==='sms-api'  && <SmsApiTab/>}

          {tab==='sms-tmpl' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {label:'📥 Olib kelish',   def:'Salom, {ism}! Buyurtma #{raqam} qabul qilindi. Shafyor yo\'lda. Tartib CRM'},
                {label:'📦 Yetkazish',     def:'Salom, {ism}! Buyurtma #{raqam} tayyor, yetkazilmoqda. Tartib CRM'},
                {label:'🔄 Holat',         def:'Salom, {ism}! Buyurtma #{raqam} holati: {status}. Tartib CRM'},
                {label:'📍 GPS so\'rash',  def:'Salom, {ism}! Joylashuvingizni yuboring.'},
              ].map((t,i)=>(
                <div key={i} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 14px'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:7}}>{t.label}</div>
                  <textarea defaultValue={t.def} rows={2} style={{
                    width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',
                    borderRadius:9,padding:'8px 10px',color:'var(--text)',
                    fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',
                  }}/>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>
                    Mavjud: {'{ism}'} {'{raqam}'} {'{status}'}
                  </div>
                </div>
              ))}
              <button className="btn btn-primary" style={{marginTop:4}}
                onClick={()=>toast('Shablonlar saqlandi ✅','ok')}>
                💾 Saqlash
              </button>
            </div>
          )}

          {tab==='prices' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {prices.map(p=>(
                <div key={p._id} style={{
                  background:'var(--bg2)',border:'1px solid var(--border)',
                  borderRadius:14,padding:'12px 14px',
                  display:'flex',alignItems:'center',gap:12,
                }}>
                  <div style={{
                    width:40,height:40,borderRadius:12,flexShrink:0,
                    background:'rgba(139,92,246,.12)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                  }}>💰</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{p.item || p.name}</div>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{p.unit}</div>
                  </div>
                  <div style={{
                    fontWeight:800,fontFamily:'monospace',
                    color:'#8b5cf6',fontSize:14,
                    background:'rgba(139,92,246,.1)',
                    padding:'4px 10px',borderRadius:8,
                  }}>{(p.price||0).toLocaleString()}</div>
                  <button onClick={()=>{setPform({...p});setModal('edit')}} style={{
                    width:32,height:32,borderRadius:9,cursor:'pointer',
                    background:'rgba(59,130,246,.1)',color:'#3B82F6',
                    border:'1px solid rgba(59,130,246,.2)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                  }}>✏️</button>
                </div>
              ))}
              <button className="btn btn-primary" style={{marginTop:4}}
                onClick={()=>{setPform({item:'',price:'',unit:'kv.m'});setModal('create')}}>
                + Narx qo'shish
              </button>
            </div>
          )}

          {tab==='company' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {label:'🏢 Kompaniya nomi', value:co, set:setCo, ph:'Tartib CRM'},
                {label:'📱 Telefon', value:ph, set:setPh, ph:'+998 90 123 45 67'},
                {label:'📍 Manzil', value:ad, set:setAd, ph:'Toshkent sh.'},
              ].map((f,i)=>(
                <div key={i} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
                  <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                    {f.label}
                  </div>
                  <input value={f.value} onChange={e=>f.set(e.target.value)}
                    placeholder={f.ph} style={{
                      width:'100%',padding:'12px 14px',background:'none',
                      border:'none',outline:'none',color:'var(--text)',
                      fontSize:15,fontFamily:'inherit',
                    }}/>
                </div>
              ))}
              <button className="btn btn-primary" style={{marginTop:4}}
                onClick={()=>toast('Saqlandi ✅','ok')}>
                💾 Saqlash
              </button>
            </div>
          )}

          {tab==='roles' && (
            <div style={{
              background:'var(--bg2)',border:'1px solid var(--border)',
              borderRadius:14,overflow:'hidden',
            }}>
              {[
                {role:'Super Admin',perms:['Hammasi'],c:'#f85149'},
                {role:'Admin',perms:['Buyurtma','Moliya','Xodim'],c:'#3B82F6'},
                {role:'Ishchi',perms:["O'z topshirig'i"],c:'#22c55e'},
                {role:'Shafyor',perms:['Transport'],c:'#f59e0b'},
              ].map((r,i,arr)=>(
                <div key={r.role} style={{
                  padding:'12px 14px',
                  borderBottom:i<arr.length-1?'1px solid var(--border)':'none',
                  display:'flex',alignItems:'center',gap:12,
                }}>
                  <div style={{
                    width:36,height:36,borderRadius:10,flexShrink:0,
                    background:`${r.c}18`,color:r.c,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:800,fontSize:16,
                  }}>👤</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{r.role}</div>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{r.perms.join(' · ')}</div>
                  </div>
                  <span style={{
                    fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:99,
                    background:`${r.c}15`,color:r.c,
                  }}>Aktiv</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price modal */}
        <Modal open={!!modal} onClose={()=>setModal(null)}
          title={modal==='create'?"💰 Narx qo'shish":"✏️ Narx tahrirlash"} size="sm"
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={savePrice}>{t.save}</button></>}>
          <div className="fg"><label className="flabel">Mahsulot nomi *</label>
            <input className="finput" value={pform.item||''} onChange={e=>setPform(p=>({...p,item:e.target.value}))}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Narx *</label>
              <input className="finput" type="number" value={pform.price||''} onChange={e=>setPform(p=>({...p,price:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Birlik</label>
              <select className="fselect" value={pform.unit||'kv.m'} onChange={e=>setPform(p=>({...p,unit:e.target.value}))}>
                <option>kv.m</option><option>dona</option><option>kg</option>
              </select></div>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  )

  return (
    <ErrorBoundary>
      <div className="settings-wrap">
        <div className="ph"><div><div className="ph-title">⚙️ Sozlamalar</div><div className="ph-sub">Tizim parametrlari</div></div></div>
        <div className="settings-layout">
          <div className="settings-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`stab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
                <span style={{ display:'flex', alignItems:'center', flexShrink:0 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="settings-content">
            {tab==='telegram' && <div style={{animation:'fadeIn .2s both'}}><TelegramTab/></div>}
            {tab==='sms-api'  && <div style={{animation:'fadeIn .2s both'}}><SmsApiTab/></div>}

            {tab==='sms-tmpl' && (
              <div className="card" style={{animation:'fadeIn .2s both'}}>
                <div className="card-hd"><div className="card-title">📝 SMS Shablonlar</div></div>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[
                    { label:"📥 Olib kelish xabari",    def:"Salom, {ism}! Buyurtmangiz #{raqam} qabul qilindi. Shafyorimiz tez orada keladi. Tartib CRM" },
                    { label:"📦 Yetkazib berish xabari", def:"Salom, {ism}! Buyurtmangiz #{raqam} tayyor, yetkazilmoqda. Tartib CRM" },
                    { label:"🔄 Holat xabarnomasi",      def:"Salom, {ism}! Buyurtmangiz #{raqam} holati: {status}. Tartib CRM" },
                    { label:"📍 GPS manzil so'rash",     def:"Salom, {ism}! Iltimos joylashuvingizni yuboring." },
                  ].map((t,i) => (
                    <div key={i} className="fg">
                      <label className="flabel">{t.label}</label>
                      <textarea className="ftextarea" rows={2} defaultValue={t.def}/>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>
                        {"{ism}"} {"{raqam}"} {"{status}"}
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={() => toast('Shablonlar saqlandi ✅','ok')}>
                    <MdSave size={15}/> Saqlash
                  </button>
                </div>
              </div>
            )}

            {tab==='prices' && (
              <div className="card" style={{animation:'fadeIn .2s both'}}>
                <div className="card-hd">
                  <div className="card-title">💲 Narxlar jadvali</div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setPform({item:'',price:'',unit:'dona'}); setModal('create') }}>
                    <MdAdd size={14}/> Qo'shish
                  </button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {prices.map(p => (
                    <div key={p._id} className="price-row">
                      <span className="price-row-name">{p.item}</span>
                      <span className="price-row-val mono">{p.price.toLocaleString()} so'm / {p.unit}</span>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setPform({...p}); setModal('edit') }}><MdEdit size={14}/></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={() => { setPrices(x => x.filter(r => r._id!==p._id)); toast("O'chirildi",'inf') }}><MdDelete size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==='roles' && (
              <div className="card" style={{animation:'fadeIn .2s both'}}>
                <div className="card-hd"><div className="card-title">🔐 Rollar</div></div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {ROLES_LIST.map(r => (
                    <div key={r.role} className="role-row">
                      <div>
                        <div style={{fontWeight:700,marginBottom:5}}>{r.role}</div>
                        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                          {r.perms.map(p => <span key={p} className="badge b-blue">{p}</span>)}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm"><MdEdit size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==='general' && (
              <div className="card" style={{animation:'fadeIn .2s both'}}>
                <div className="card-hd"><div className="card-title">⚙️ Umumiy</div></div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div className="fg"><label className="flabel">Kompaniya nomi</label><input className="finput" value={co} onChange={e=>setCo(e.target.value)}/></div>
                  <div className="fg"><label className="flabel">Telefon</label><input className="finput" value={ph} onChange={e=>setPh(e.target.value)}/></div>
                  <div className="fg"><label className="flabel">Manzil</label><input className="finput" value={ad} onChange={e=>setAd(e.target.value)}/></div>
                  <div className="fg"><label className="flabel">Valyuta</label><select className="fselect"><option>UZS</option><option>USD</option></select></div>
                  <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={() => toast('Saqlandi ✅','ok')}><MdSave size={15}/> Saqlash</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)} title={modal==='create'?'Yangi narx':'Tahrirlash'} size="sm"
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>{t.cancel}</button><button className="btn btn-primary" onClick={savePrice}>{t.save}</button></>}>
          <div className="fg"><label className="flabel">Xizmat nomi *</label><input className="finput" value={pform.item||''} onChange={e=>setPform(p=>({...p,item:e.target.value}))}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Narx *</label><input className="finput" type="number" value={pform.price||''} onChange={e=>setPform(p=>({...p,price:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Birlik</label><select className="fselect" value={pform.unit||'dona'} onChange={e=>setPform(p=>({...p,unit:e.target.value}))}><option value="dona">dona</option><option value="kv.m">kv.m</option></select></div>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  )
}
