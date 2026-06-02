import { useState, useEffect, useMemo } from 'react'
import { api, fmt, botApi } from '../../services/api.js'
import { Modal, Confirm, toast } from '../../components/ui/UI.jsx'
import './OrderDetail.css'

/* ── Constants ── */
const ETAPLAR = [
  { key: 'qabul',      label: 'Qabul',      icon: '📥' },
  { key: 'yuvish',     label: 'Yuvish',      icon: '🫧' },
  { key: 'quritish',   label: 'Quritish',    icon: '💨' },
  { key: 'bezak',      label: 'Bezak',       icon: '✨' },
  { key: 'yetkazish',  label: 'Yetkazish',   icon: '🚚' },
  { key: 'tugallandi', label: 'Tugallandi',   icon: '✅' },
]
const ETAP_NEXT = {
  qabul:'yuvish', yuvish:'quritish', quritish:'bezak',
  bezak:'yetkazish', yetkazish:'tugallandi', tugallandi:'tugallandi',
}
const ITEM_TYPES = [
  { key:'gilam',  label:'Gilam',    unit:'sqm',  icon:'🟫' },
  { key:'kurpa',  label:"Ko'rpa",   unit:'dona', icon:'🛏️' },
  { key:'adyol',  label:'Adyol',    unit:'dona', icon:'🧸' },
  { key:'yostiq', label:'Yostiq',   unit:'dona', icon:'💤' },
  { key:'parda',  label:'Parda',    unit:'dona', icon:'🪟' },
  { key:'kiyim',  label:'Kiyim',    unit:'dona', icon:'👕' },
  { key:'boshqa', label:'Boshqa',   unit:'dona', icon:'📦' },
]

/* Telegram link builder */
function tgLink(phone, itemName, stage) {
  const clean = (phone||'').replace(/\D/g,'')
  const stageLabel = ETAPLAR.find(e=>e.key===stage)?.label || stage
  const msg = encodeURIComponent(
    `Assalomu alaykum! Buyurtmangiz "${itemName}" mahsuloti hozir "${stageLabel}" bosqichida.\nBatafsil: +998901234567`
  )
  return `https://t.me/+${clean}?text=${msg}`
}

/* Stage badge */
function StageBadge({ stage }) {
  const e = ETAPLAR.find(x => x.key === stage) || { label: stage, icon: '?' }
  return (
    <span className={`stage-badge stage-${stage}`}>
      {e.icon} {e.label}
    </span>
  )
}

/* TG SVG */
function TgIcon() {
  return (
    <svg style={{width:12,height:12,flexShrink:0}} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.012 9.48c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.52-4.443c.534-.194 1.001.13.596.163z"/>
    </svg>
  )
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function OrderDetail({ order, onBack }) {
  const [items,    setItems]    = useState([])
  const [workers,  setWorkers]  = useState([])
  const [prices,   setPrices]   = useState([])
  const [loading,  setLoading]  = useState(true)

  /* New item form */
  const [newItem, setNewItem] = useState({
    itemType: 'gilam', name: '', unit: 'sqm',
    width: '', length: '', qty: 1, pricePerUnit: '', description: ''
  })

  /* Modals */
  const [assignModal, setAssignModal] = useState(null)  // item to assign
  const [selWorker,   setSelWorker]   = useState(null)
  const [delItemId,   setDelItemId]   = useState(null)
  const [editItem,    setEditItem]    = useState(null)

  useEffect(() => {
    loadAll()
  }, [order._id])

  async function loadAll() {
    setLoading(true)
    try {
      const [itsRes, wsRes, psRes] = await Promise.allSettled([
        api.getOrderItems(order._id),
        api.getEmployees(),
        api.getPrices(),
      ])
      // Normalize — always array
      const norm = r => {
        if (!r || r.status !== 'fulfilled') return []
        const v = r.value
        if (Array.isArray(v)) return v
        if (Array.isArray(v?.data)) return v.data
        return []
      }
      setItems(norm(itsRes))
      setWorkers(norm(wsRes).filter(w => w.status === 'active'))
      setPrices(norm(psRes))
    } catch(e) {
      console.error('loadAll error:', e)
    } finally {
      setLoading(false)
    }
  }

  /* Auto-fill price when itemType changes */
  function handleItemTypeChange(e) {
    const type  = e.target.value
    const found = ITEM_TYPES.find(t => t.key === type)
    const price = prices.find(p => p.itemType === type)
    setNewItem(p => ({
      ...p,
      itemType:     type,
      name:         found?.label || '',
      unit:         found?.unit  || 'dona',
      pricePerUnit: price?.price || '',
    }))
  }

  /* Computed: preview price */
  const previewPrice = useMemo(() => {
    if (newItem.unit === 'sqm') {
      const sqm = parseFloat(newItem.width||0) * parseFloat(newItem.length||0)
      return Math.round(sqm * (parseFloat(newItem.pricePerUnit)||0))
    }
    return Math.round((parseInt(newItem.qty)||1) * (parseFloat(newItem.pricePerUnit)||0))
  }, [newItem])

  const [addingItem, setAddingItem] = useState(false)

  /* Add item */
  async function addItem() {
    if (addingItem) return  // prevent double click
    if (!newItem.name || !newItem.pricePerUnit) {
      toast("Mahsulot nomi va narxni kiriting!", 'err'); return
    }
    if (newItem.unit === 'sqm' && (!newItem.width || !newItem.length)) {
      toast("Gilam o'lchamini kiriting (eni × uzunligi)!", 'err'); return
    }

    const payload = {
      orderId:      order._id,
      orderNumber:  order.number,
      ...newItem,
      width:        parseFloat(newItem.width)  || null,
      length:       parseFloat(newItem.length) || null,
      qty:          parseInt(newItem.qty)      || 1,
      pricePerUnit: parseFloat(newItem.pricePerUnit) || 0,
    }

    // Compute sqm and totalPrice locally for immediate display
    const sqm        = payload.unit === 'sqm' ? Math.round(parseFloat(payload.width||0) * parseFloat(payload.length||0) * 100) / 100 : 0
    const totalPrice = payload.unit === 'sqm'
      ? Math.round(sqm * (payload.pricePerUnit||0))
      : Math.round((payload.qty||1) * (payload.pricePerUnit||0))

    // Optimistic: add immediately to local list
    const tempId  = '_tmp_' + Date.now()
    const tempItem = { _id: tempId, ...payload, sqm, totalPrice, stage:'qabul', assignments:[], tgNotified:false, _pending:true }
    setItems(p => [tempItem, ...p])
    setNewItem({ itemType:'gilam', name:'', unit:'sqm', width:'', length:'', qty:1, pricePerUnit:'', description:'' })

    setAddingItem(true)
    try {
      const rec = await api.createOrderItem(payload)
      const saved = rec?.data || rec
      if (saved && saved._id) {
        // Replace temp with real
        setItems(p => p.map(i => i._id === tempId ? saved : i))
        toast(`"${saved.name}" mahsulot qo'shildi ✅`, 'ok')
      } else {
        // Offline: keep temp item, show pending badge
        toast(`"${payload.name}" saqlandi (internet kelganda yuboriladi)`, 'inf')
      }
    } catch(e) {
      // Remove temp on error
      setItems(p => p.filter(i => i._id !== tempId))
      setNewItem(payload)  // restore form
      toast(e.message || 'Xato yuz berdi', 'err')
    } finally {
      setAddingItem(false)
    }
  }

  /* Delete item */
  async function doDeleteItem() {
    await api.deleteOrderItem(delItemId)
    setItems(p => p.filter(i => i._id !== delItemId))
    setDelItemId(null)
    toast("Mahsulot o'chirildi", 'inf')
  }

  /* Assign worker */
  async function confirmAssign() {
    if (!selWorker) { toast("Ishchini tanlang", 'err'); return }
    const res = await api.assignWorker(assignModal._id, selWorker, assignModal.stage)
    if (res) {
      setItems(p => p.map(i => i._id === assignModal._id ? res.item : i))
      toast(`${res.worker.name} ga biriktirildi ✅`, 'ok')

      // TG xabar yuborish
      try {
        await botApi.sendItem(assignModal._id, selWorker)
        toast(`📨 ${res.worker.name} ga Telegram xabar yuborildi`, 'ok')
      } catch {
        toast('⚠️ TG xabar yuborishda xato (bot ishlamayapti?)', 'err')
      }

      setAssignModal(null)
      setSelWorker(null)
    }
  }

  /* Advance stage */
  async function advanceStage(item) {
    const res = await api.advanceStage(item._id)
    if (res) {
      setItems(p => p.map(i => i._id === item._id ? res.item : i))
      const nextLabel = ETAPLAR.find(e=>e.key===res.nextStage)?.label || res.nextStage
      toast(`"${item.name}" → ${nextLabel} bosqichiga o'tdi`, 'ok')
    }
  }

  /* Stage counts for pipeline */
  const stageCounts = useMemo(() => {
    const c = {}
    ETAPLAR.forEach(e => { c[e.key] = 0 })
    items.forEach(i => { if (c[i.stage] !== undefined) c[i.stage]++ })
    return c
  }, [items])

  /* Current order stage (dominant) */
  const dominantStage = useMemo(() => {
    if (!items.length) return 'qabul'
    const counts = {}
    items.forEach(i => { counts[i.stage] = (counts[i.stage]||0)+1 })
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'qabul'
  }, [items])

  const totalPrice = items.reduce((s, i) => s + (i.totalPrice||0), 0)

  return (
    <div className="od-wrap">

      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Orqaga</button>
      </div>

      {/* Order header */}
      <div className="od-header">
        <div className="od-header-left">
          <div className="od-order-num">{order.number}</div>
          <div className="od-customer">{order.customer}</div>
          <div className="od-phone-row">
            <a href={tgLink(order.phone, order.number, dominantStage)}
              target="_blank" rel="noopener noreferrer" className="tg-btn">
              <TgIcon /> {order.phone}
            </a>
          </div>
          {order.address && <div className="od-address">📍 {order.address}</div>}
          {order.description && (
            <div className="od-desc">📋 {order.description}</div>
          )}
        </div>
        <div className="od-header-right">
          <div className="od-total-box">
            <div className="od-total-label">Jami narx</div>
            <div className="od-total-val">{fmt.currency(totalPrice)}</div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {items.length > 0 && items.some(i=>i.stage==='qabul') && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setAssignModal({ _id:'__bulk__', stage:'yuvish', name:'Barcha mahsulotlar' })}
              >
                👷 Hammaga biriktirish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="od-pipeline">
        {ETAPLAR.map(e => {
          const count   = stageCounts[e.key] || 0
          const isDone  = ETAPLAR.findIndex(x=>x.key===e.key) < ETAPLAR.findIndex(x=>x.key===dominantStage)
          const isCur   = e.key === dominantStage
          return (
            <div key={e.key} className={`od-stage ${isDone?'done':''} ${isCur?'current':''}`}>
              <span className="od-stage-icon">{e.icon}</span>
              {e.label}
              {count > 0 && <span className="od-stage-count">{count}</span>}
            </div>
          )
        })}
      </div>

      {/* Add item form */}
      <div className="od-add-section">
        <div className="od-add-title">➕ Mahsulot qo'shish</div>
        <div className="od-add-grid">
          {/* Item type */}
          <div className="fg">
            <label className="flabel">Mahsulot turi</label>
            <select className="fselect" value={newItem.itemType} onChange={handleItemTypeChange}>
              {ITEM_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          {/* Size or qty */}
          {newItem.unit === 'sqm' ? (
            <>
              <div className="fg">
                <label className="flabel">Eni (m)</label>
                <input className="finput" type="number" step="0.1" min="0" placeholder="2.5"
                  value={newItem.width} onChange={e => setNewItem(p=>({...p,width:e.target.value}))} />
              </div>
              <div className="fg">
                <label className="flabel">Uzunligi (m)</label>
                <input className="finput" type="number" step="0.1" min="0" placeholder="3.0"
                  value={newItem.length} onChange={e => setNewItem(p=>({...p,length:e.target.value}))} />
              </div>
            </>
          ) : (
            <div className="fg">
              <label className="flabel">Soni (dona)</label>
              <input className="finput" type="number" min="1" value={newItem.qty}
                onChange={e => setNewItem(p=>({...p,qty:e.target.value}))} />
            </div>
          )}

          {/* Price */}
          <div className="fg">
            <label className="flabel">
              Narx (1 {newItem.unit === 'sqm' ? 'kv.m' : 'dona'})
            </label>
            <input className="finput" type="number" min="0" placeholder="15000"
              value={newItem.pricePerUnit}
              onChange={e => setNewItem(p=>({...p,pricePerUnit:e.target.value}))} />
          </div>

          {/* Preview price */}
          <div className="fg">
            <label className="flabel">Jami narx</label>
            <div className="od-add-total">{fmt.currency(previewPrice)}</div>
          </div>

          {/* Add button */}
          <div className="fg">
            <label className="flabel">&nbsp;</label>
            <button className="btn btn-primary" onClick={addItem} disabled={addingItem}
              style={{opacity:addingItem?0.7:1,minWidth:90}}>
              {addingItem ? '⏳' : '➕ Qo\'shish'}
            </button>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="od-items-section">
        <div className="od-items-header">
          <div className="od-items-title">
            📦 Mahsulotlar — {items.length} ta
          </div>
          {items.length > 0 && (
            <div style={{ fontSize:12, color:'var(--text2)' }}>
              Jami: <strong style={{ color:'var(--green)', fontFamily:'monospace' }}>{fmt.currency(totalPrice)}</strong>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--text3)' }}>⏳ Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            <div>Hali mahsulot qo'shilmagan</div>
            <div style={{ fontSize:11, marginTop:4 }}>Yuqoridagi formadan mahsulot qo'shing</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="od-items-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mahsulot</th>
                  <th>O'lcham</th>
                  <th>Narx</th>
                  <th>Jami</th>
                  <th>Bosqich</th>
                  <th>Ishchi</th>
                  <th>TG</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const curAssign   = item.assignments?.find(a => a.stage === item.stage && !a.doneAt)
                  const nextStage   = ETAP_NEXT[item.stage]
                  const isDone      = item.stage === 'tugallandi'
                  const workerPhone = curAssign?.workerPhone

                  return (
                    <tr key={item._id}>
                      {/* # */}
                      <td style={{ color:'var(--text3)', fontFamily:'monospace', fontSize:11 }}>{idx+1}</td>

                      {/* Name */}
                      <td>
                        <div style={{ fontWeight:600 }}>
                          {ITEM_TYPES.find(t=>t.key===item.itemType)?.icon} {item.name}
                        </div>
                        {item.description && (
                          <div style={{ fontSize:11, color:'var(--text2)' }}>{item.description}</div>
                        )}
                      </td>

                      {/* Size */}
                      <td>
                        {item.unit === 'sqm' ? (
                          <span className="mono">
                            {item.width}×{item.length} = <strong>{item.sqm} m²</strong>
                          </span>
                        ) : (
                          <span className="mono">{item.qty} dona</span>
                        )}
                      </td>

                      {/* Price per unit */}
                      <td>
                        <span className="mono" style={{ fontSize:12 }}>
                          {fmt.currency(item.pricePerUnit)}
                          <span style={{ color:'var(--text3)', fontSize:10 }}>
                            /{item.unit==='sqm'?'kv.m':'dona'}
                          </span>
                        </span>
                      </td>

                      {/* Total */}
                      <td>
                        <span className="mono" style={{ fontWeight:800, color:'var(--green)' }}>
                          {fmt.currency(item.totalPrice)}
                        </span>
                      </td>

                      {/* Stage */}
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <StageBadge stage={item.stage} />
                          {!isDone && nextStage && nextStage !== item.stage && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize:10, padding:'2px 6px' }}
                              onClick={() => advanceStage(item)}
                            >
                              → {ETAPLAR.find(e=>e.key===nextStage)?.label}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Worker */}
                      <td>
                        {curAssign ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                            <span style={{ fontWeight:600, fontSize:12 }}>{curAssign.workerName}</span>
                            <span style={{ fontSize:10, color:'var(--text2)' }}>
                              {ETAPLAR.find(e=>e.key===curAssign.stage)?.label}
                            </span>
                          </div>
                        ) : !isDone ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize:11, color:'var(--yellow)', borderColor:'var(--yellowbg)', background:'var(--yellowbg)' }}
                            onClick={() => { setAssignModal(item); setSelWorker(null) }}
                          >
                            ⚡ Biriktirish
                          </button>
                        ) : (
                          <span style={{ color:'var(--green)', fontSize:11 }}>✅ Tugadi</span>
                        )}
                      </td>

                      {/* TG notify */}
                      <td>
                        {workerPhone ? (
                          <a
                            href={tgLink(workerPhone, item.name, item.stage)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tg-btn"
                            title="Ishchiga TG xabar"
                            style={{ fontSize:10 }}
                          >
                            <TgIcon /> Xabar
                          </a>
                        ) : item.tgNotified ? (
                          <span className="od-notify-done">✅ Yuborildi</span>
                        ) : (
                          <span style={{ color:'var(--text3)', fontSize:11 }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display:'flex', gap:3 }}>
                          {!isDone && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Ishchi biriktirish"
                              onClick={() => { setAssignModal(item); setSelWorker(null) }}
                            >👷</button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color:'var(--red)' }}
                            title="O'chirish"
                            onClick={() => setDelItemId(item._id)}
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="od-summary">
          <div className="od-summary-row">
            <div className="od-summary-item">
              <span className="od-summary-label">Mahsulotlar</span>
              <span className="od-summary-value" style={{ color:'var(--accent)' }}>{items.length} ta</span>
            </div>
            <div className="od-summary-item">
              <span className="od-summary-label">Tugallandi</span>
              <span className="od-summary-value" style={{ color:'var(--green)' }}>
                {items.filter(i=>i.stage==='tugallandi').length} ta
              </span>
            </div>
            <div className="od-summary-item">
              <span className="od-summary-label">Jami kv.m</span>
              <span className="od-summary-value">
                {items.filter(i=>i.unit==='sqm').reduce((s,i)=>s+(i.sqm||0),0).toFixed(1)} m²
              </span>
            </div>
            <div className="od-summary-item">
              <span className="od-summary-label">Jami dona</span>
              <span className="od-summary-value">
                {items.filter(i=>i.unit==='dona').reduce((s,i)=>s+(i.qty||0),0)} ta
              </span>
            </div>
          </div>
          <div className="od-summary-item" style={{ textAlign:'right' }}>
            <span className="od-summary-label">Jami hisob</span>
            <span className="od-summary-value" style={{ color:'var(--green)', fontSize:22 }}>
              {fmt.currency(totalPrice)}
            </span>
          </div>
        </div>
      )}

      {/* ── Assign Worker Modal ── */}
      <Modal
        open={!!assignModal}
        onClose={() => { setAssignModal(null); setSelWorker(null) }}
        title={`👷 Ishchi biriktirish — ${assignModal?.name || ''}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setAssignModal(null); setSelWorker(null) }}>Bekor</button>
            <button className="btn btn-primary" onClick={confirmAssign} disabled={!selWorker}>
              ✅ Biriktirish
            </button>
          </>
        }
      >
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>
          Bosqich: <StageBadge stage={assignModal?.stage || 'yuvish'} />
        </div>
        <div className="assign-worker-list">
          {workers
            .filter(w => w.role === 'Ishchi')
            .map(w => (
              <div
                key={w._id}
                className={`assign-worker-item ${selWorker === w._id ? 'sel' : ''}`}
                onClick={() => setSelWorker(w._id)}
              >
                <div className="assign-worker-avatar">{w.name?.[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{w.name}</div>
                  <div className="assign-worker-section">Bo'lim: {w.section}</div>
                </div>
                <div style={{ fontSize:11, color:'var(--text2)' }}>
                  {fmt.currency(w.balance)} to'plangan
                </div>
              </div>
            ))
          }
        </div>
        <div style={{ marginTop:10, padding:'8px 12px', background:'var(--accentbg)', borderRadius:'var(--r)', fontSize:12, color:'var(--text2)' }}>
          💡 Biriktirish bilan ishchiga TG xabar yuboriladi
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Confirm
        open={!!delItemId}
        onClose={() => setDelItemId(null)}
        onOk={doDeleteItem}
        title="Mahsulotni o'chirish"
        msg="Bu mahsulotni buyurtmadan o'chirishni xohlaysizmi?"
        danger
      />
    </div>
  )
}
