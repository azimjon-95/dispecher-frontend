import { useState, useEffect } from 'react'
import {
  MdClose, MdCheck, MdError, MdInfo,
  MdFileDownload, MdInbox, MdSearchOff
} from 'react-icons/md'
import './UI.css'

/* ════════════════════════════════
   ERROR BOUNDARY (React class)
════════════════════════════════ */
import React from 'react'
export class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('ErrorBoundary:', e, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:32, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
          <div style={{ fontWeight:700, fontSize:16, color:'var(--red)', marginBottom:8 }}>
            Xato yuz berdi
          </div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16, fontFamily:'monospace' }}>
            {this.state.error.message}
          </div>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Qayta urinish
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ════════════════════════════════
   MODAL
════════════════════════════════ */

/* ══════════════════════════════════════════
   TARTIB CRM — MARKAZIY LOADER
   Butun oyna emas, faqat o'z joyida
══════════════════════════════════════════ */

/* Kichik inline loader — jadval, karta, bo'lim uchun */
export function Loader({ size = 'md', text = '' }) {
  const sz = { sm: 28, md: 44, lg: 64 }[size] || 44
  const sq = Math.round(sz * 0.28)
  const gap = Math.round(sq * 0.35)
  const rx  = Math.round(sq * 0.2)

  // 3x3 grid pozitsiyalari
  const cells = [
    { x:0,   y:0,   fill:'#3B82F6', delay:0    },
    { x:1,   y:0,   fill:'#ffffff', delay:0.08, opacity:0.15 },
    { x:2,   y:0,   fill:'#ffffff', delay:0.16, opacity:0.15 },
    { x:0,   y:1,   fill:'#06B6D4', delay:0.12 },
    { x:1,   y:1,   fill:'#3B82F6', delay:0.20 },
    { x:2,   y:1,   fill:'#ffffff', delay:0.28, opacity:0.15 },
    { x:0,   y:2,   fill:'#ffffff', delay:0.24, opacity:0.15 },
    { x:1,   y:2,   fill:'#06B6D4', delay:0.32 },
    { x:2,   y:2,   fill:'#3B82F6', delay:0.40 },
  ]

  const total = sz
  const step  = sq + gap

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:10, padding:'20px 0',
    }}>
      <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`} fill="none">
        <style>{`
          @keyframes tartib-pulse {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.35; transform:scale(0.82); }
          }
        `}</style>
        {cells.map((cell, i) => (
          <rect key={i}
            x={cell.x * step + 1}
            y={cell.y * step + 1}
            width={sq} height={sq} rx={rx}
            fill={cell.fill}
            opacity={cell.opacity || 1}
            style={{
              animation: `tartib-pulse 1.4s ease-in-out ${cell.delay}s infinite`,
              transformOrigin: `${cell.x * step + 1 + sq/2}px ${cell.y * step + 1 + sq/2}px`,
            }}
          />
        ))}
      </svg>
      {text && (
        <span style={{
          fontSize: size==='sm' ? 11 : size==='lg' ? 14 : 12,
          color:'var(--text3)', fontWeight:500, letterSpacing:'.3px',
        }}>
          {text}
        </span>
      )}
    </div>
  )
}

/* Skeleton — bitta satr uchun */
export function SkeletonRow({ cols = 4, rows = 5 }) {
  return (
    <div style={{ padding:'0 2px' }}>
      {[...Array(rows)].map((_,i) => (
        <div key={i} style={{ display:'flex', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
          {[...Array(cols)].map((_,j) => (
            <div key={j} className="skel" style={{
              height:13, flex: j===0 ? '0 0 80px' : 1,
              borderRadius:4, animationDelay: `${(i*cols+j)*30}ms`
            }}/>
          ))}
        </div>
      ))}
    </div>
  )
}

/* Skeleton — karta uchun */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
      <div className="skel" style={{ height:14, width:'60%', borderRadius:4 }}/>
      {[...Array(lines-1)].map((_,i) => (
        <div key={i} className="skel" style={{ height:11, width: i===lines-2 ? '40%':'85%', borderRadius:4, animationDelay:`${i*60}ms` }}/>
      ))}
    </div>
  )
}

/* Skeleton — KPI karta uchun */
export function SkeletonKPI() {
  return (
    <div className="kpi-card" style={{ gap:8 }}>
      <div className="skel" style={{ width:36, height:36, borderRadius:8 }}/>
      <div className="skel" style={{ width:'70%', height:18, borderRadius:4 }}/>
      <div className="skel" style={{ width:'50%', height:11, borderRadius:4 }}/>
    </div>
  )
}

export function Modal({ open, onClose, title, size = '', children, footer }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : ''}`}>
        <div className="modal-hd">
          <span className="modal-ttl">{title}</span>
          <button className="modal-x" onClick={onClose}><MdClose size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  )
}

/* ════════════════════════════════
   CONFIRM
════════════════════════════════ */
export function Confirm({ open, onClose, onOk, title, msg, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Bekor qilish</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onOk}>Tasdiqlash</button>
      </>}
    >
      <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.6 }}>{msg}</p>
    </Modal>
  )
}

/* ════════════════════════════════
   TOAST
════════════════════════════════ */
let _tid = 0
const _listeners = []
export function toast(msg, type = 'inf') {
  const id = ++_tid
  _listeners.forEach(fn => fn({ id, msg, type }))
}

export function ToastContainer() {
  const [list, setList] = useState([])
  useEffect(() => {
    const h = t => {
      setList(l => [...l, t])
      setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), 3400)
    }
    _listeners.push(h)
    return () => { const i = _listeners.indexOf(h); if(i>=0) _listeners.splice(i,1) }
  }, [])
  const ICON = { ok:<MdCheck size={16}/>, err:<MdError size={16}/>, inf:<MdInfo size={16}/> }
  return (
    <div className="toast-wrap">
      {list.map(t => (
        <div key={t.id} className={`toast t-${t.type}`}>
          {ICON[t.type] || ICON.inf} {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════
   STATUS BADGE
════════════════════════════════ */
const STS_MAP = {
  yangi:       ['b-blue',   'Yangi'],
  jarayonda:   ['b-yellow', 'Jarayonda'],
  tayyor:      ['b-purple', 'Tayyor'],
  yetkazildi:  ['b-green',  'Yetkazildi'],
  tugallandi:  ['b-green',  'Tugallandi'],
  bekor:       ['b-red',    'Bekor'],
  faol:        ['b-green',  'Faol'],
  band:        ['b-orange', 'Band'],
  dam:         ['b-gray',   'Dam olmoqda'],
  active:      ['b-green',  'Faol'],
  inactive:    ['b-gray',   'Nofaol'],
  kirim:       ['b-green',  'Kirim'],
  chiqim:      ['b-red',    'Chiqim'],
  // order statuses
  qabul_qilindi: ['b-yellow', 'Qabul qilindi'],
  yuvishda:    ['b-blue',   'Yuvishda'],
  qurishda:    ['b-yellow', 'Quritishda'],
  bezakda:     ['b-purple', 'Bezakda'],
  yetkazishda: ['b-orange', 'Yetkazishda'],
}
export function Sbadge({ s }) {
  const [cls, lbl] = STS_MAP[s?.toLowerCase()] || ['b-gray', s || '—']
  return <span className={`badge ${cls}`}>{lbl}</span>
}

/* ════════════════════════════════
   DATA TABLE
════════════════════════════════ */
export function Table({ cols, rows, loading, onRow, selIds, onSel }) {
  const safeRows = Array.isArray(rows) ? rows : []
  const allSel   = safeRows.length > 0 && selIds?.length === safeRows.length

  if (loading) return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr>{cols.map(c => <th key={c.k}>{c.l}</th>)}</tr></thead>
        <tbody>
          {[...Array(6)].map((_,i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c.k}>
                  <div className="skel" style={{
                    height:13, width: c.k==='_a'?'60%':'80%',
                    borderRadius:4, animationDelay:`${(i*cols.length)*25}ms`
                  }}/>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:'flex',justifyContent:'center',padding:'16px 0',borderTop:'1px solid var(--border)'}}>
        <Loader size="sm" text="Yuklanmoqda..."/>
      </div>
    </div>
  )

  if (!safeRows.length) return (
    <div className="tbl-wrap">
      <div className="empty">
        <MdSearchOff size={40} className="empty-ico" style={{opacity:.35}} />
        <div className="empty-ttl">Ma'lumot topilmadi</div>
        <div className="empty-sub">Filter yoki qidiruvni o'zgartiring</div>
      </div>
    </div>
  )

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {onSel && (
              <th>
                <input type="checkbox" className="chk" checked={allSel}
                  onChange={e => onSel(e.target.checked ? safeRows.map(r => r._id) : [])} />
              </th>
            )}
            {cols.map(c => <th key={c.k}>{c.l}</th>)}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, i) => (
            <tr key={row?._id || i}
              className={selIds?.includes(row._id) ? 'selected' : ''}
              onClick={() => onRow?.(row)}
              style={{ cursor: onRow ? 'pointer' : 'default' }}
            >
              {onSel && (
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="chk"
                    checked={selIds?.includes(row._id)}
                    onChange={e => onSel(e.target.checked
                      ? [...selIds, row._id]
                      : selIds.filter(x => x !== row._id)
                    )} />
                </td>
              )}
              {cols.map(c => (
                <td key={c.k}>{c.r ? c.r(row[c.k], row) : (row[c.k] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ════════════════════════════════
   PAGINATION
════════════════════════════════ */
export function Paging({ page, total, size, onChange }) {
  const pages = Math.ceil(total / size) || 1
  const s = (page - 1) * size + 1
  const e = Math.min(page * size, total)
  const nums = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) nums.push(i)
    else if (nums[nums.length - 1] !== '...') nums.push('...')
  }
  if (!total) return null
  return (
    <div className="pag">
      <span className="pag-info">{total} ta dan {s}–{e}</span>
      <div className="pag-btns">
        <button className="pag-btn" onClick={() => onChange(page-1)} disabled={page===1}>‹</button>
        {nums.map((n,i) => n==='...'
          ? <span key={i} className="pag-btn" style={{cursor:'default'}}>…</span>
          : <button key={n} className={`pag-btn ${n===page?'active':''}`} onClick={() => onChange(n)}>{n}</button>
        )}
        <button className="pag-btn" onClick={() => onChange(page+1)} disabled={page>=pages}>›</button>
      </div>
    </div>
  )
}

/* ════════════════════════════════
   PAGE HEADER
════════════════════════════════ */
export function PH({ title, sub, actions }) {
  return (
    <div className="ph">
      <div>
        <div className="ph-title">{title}</div>
        {sub && <div className="ph-sub">{sub}</div>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  )
}

/* ════════════════════════════════
   CSV EXPORT BUTTON
════════════════════════════════ */
export function ExportBtn({ data, name }) {
  const go = () => {
    if (!Array.isArray(data) || !data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows    = data.map(d => Object.values(d).map(v => `"${v??''}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([headers+'\n'+rows], { type:'text/csv' }))
    a.download = (name||'export') + '.csv'
    a.click()
    toast('CSV eksport qilindi ✅', 'ok')
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={go}>
      <MdFileDownload size={15} /> Export
    </button>
  )
}
