import { useState, useEffect, useMemo } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdTrendingUp, MdTrendingDown,
  MdBalance, MdPieChart, MdFileDownload, MdCalendarToday,
  MdRefresh, MdSearch, MdFilterList, MdArrowBack, MdArrowForward,
  MdPictureAsPdf, MdGridOn, MdPerson, MdWarning, MdCheckCircle
} from 'react-icons/md'
import { api, fmt } from '../../services/api.js'
import { useCRUD } from '../../hooks/useCRUD.js'
import { Modal, Confirm, Sbadge, Table, Paging, PH, toast, Loader, SkeletonKPI } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Finance.css'

const CATS_KIRIM  = ['Buyurtma','Uy xizmati','Avans qaytarish','Boshqa kirim']
const CATS_CHIQIM = ['Kimyoviy moddalar','Kommunal (svet/suv/gaz)','Arenda','Transport xarajat','Bank xizmati','Maosh','Jihozlar','Boshqa chiqim']
const ALL_CATS    = [...CATS_KIRIM,...CATS_CHIQIM]

function norm(r){ return Array.isArray(r)?r:Array.isArray(r?.data)?r.data:[] }

/* ── Month navigation ── */
function monthLabel(m) {
  const [y,mo] = m.split('-')
  const names  = ['','Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
  return `${names[parseInt(mo)]} ${y}`
}
function prevMonth(m) {
  const d = new Date(m+'-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7)
}
function nextMonth(m) {
  const d = new Date(m+'-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7)
}

const TODAY     = new Date().toISOString().slice(0,10)
const THIS_MONTH= new Date().toISOString().slice(0,7)
const EMPTY     = { type:'kirim', description:'', amount:'', category:'Buyurtma', date:TODAY, by:'Admin' }

/* ── Export to CSV (Excel compatible) ── */
function exportToCSV(rows, month) {
  const headers = ['Sana','Turi','Tavsif','Kategoriya','Miqdor','Kim']
  const lines   = [
    headers.join(';'),
    ...rows.map(r => [
      r.date||'', r.type||'', (r.description||'').replace(/;/g,','),
      r.category||'', r.amount||0, r.by||''
    ].join(';'))
  ]
  const blob = new Blob(['\uFEFF'+lines.join('\n')], { type:'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `moliya-${month}.csv`; a.click()
  URL.revokeObjectURL(url)
}

/* ── Export to HTML (printable as PDF) ── */
function exportToPDF(rows, month, summary) {
  const html = `<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#111}
  h1{font-size:20px;margin-bottom:4px}
  h2{font-size:14px;color:#555;margin-bottom:16px}
  .summary{display:flex;gap:24px;margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:8px}
  .sum-item{text-align:center}
  .sum-val{font-size:18px;font-weight:bold}
  .sum-lbl{font-size:11px;color:#888}
  .green{color:#2e7d32} .red{color:#c62828} .blue{color:#1565c0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1565c0;color:white;padding:8px 6px;text-align:left}
  td{padding:6px;border-bottom:1px solid #eee}
  tr:nth-child(even){background:#f9f9f9}
  .kirim{color:#2e7d32;font-weight:bold} .chiqim{color:#c62828;font-weight:bold}
  .footer{margin-top:20px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:8px}
</style>
</head>
<body>
<h1>CleanPro Himchishtka CRM — Moliyaviy Hisobot</h1>
<h2>${monthLabel(month)} oyi</h2>
<div class="summary">
  <div class="sum-item"><div class="sum-val green">${summary.kirim.toLocaleString()} so'm</div><div class="sum-lbl">Jami kirim</div></div>
  <div class="sum-item"><div class="sum-val red">${summary.chiqim.toLocaleString()} so'm</div><div class="sum-lbl">Jami chiqim</div></div>
  <div class="sum-item"><div class="sum-val ${summary.foyda>=0?'green':'red'}">${summary.foyda.toLocaleString()} so'm</div><div class="sum-lbl">Foyda</div></div>
  <div class="sum-item"><div class="sum-val blue">${rows.length} ta</div><div class="sum-lbl">Tranzaksiyalar</div></div>
</div>
<table>
<thead><tr><th>Sana</th><th>Turi</th><th>Tavsif</th><th>Kategoriya</th><th>Miqdor</th><th>Kim</th></tr></thead>
<tbody>
${rows.map(r=>`<tr><td>${r.date||''}</td><td class="${r.type}">${r.type==='kirim'?'↑ Kirim':'↓ Chiqim'}</td><td>${r.description||''}</td><td>${r.category||''}</td><td class="${r.type}">${r.type==='kirim'?'+':'-'}${(r.amount||0).toLocaleString()} so'm</td><td>${r.by||''}</td></tr>`).join('')}
</tbody>
</table>
<div class="footer">Hisobot sanasi: ${new Date().toLocaleDateString('uz-UZ')} · CleanPro Himchishtka CRM</div>
</body></html>`

  const blob = new Blob([html], { type:'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  setTimeout(() => w?.print(), 500)
}

export default function Finance() {
  const crud    = useCRUD({ getAll:api.getFinance, create:api.createFinance, update:api.updateFinance, remove:api.deleteFinance }, ['description','category'])
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [delId,    setDelId]    = useState(null)
  const [view,     setView]     = useState('list')  // list | report
  const [month,    setMonth]    = useState(THIS_MONTH)
  const [typeF,    setTypeF]    = useState('')
  const [catF,     setCatF]     = useState('')
  const [srch,     setSrch]     = useState('')
  const [salData,  setSalData]  = useState([])
  const [orders,   setOrders]   = useState([])
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}))

  useEffect(() => {
    if (view === 'report') loadReportData()
  }, [view, month])

  async function loadReportData() {
    try {
      const [salR, ordR] = await Promise.allSettled([
        api.getSalarySummary(month),
        api.getOrders(),
      ])
      setSalData(norm(salR.value))
      setOrders(norm(ordR.value))
    } catch {}
  }

  /* Filter current data */
  const allFin    = crud.data || []
  const monthFin  = useMemo(() => allFin.filter(f => f.date?.startsWith(month)), [allFin, month])

  const filtered  = useMemo(() => {
    let rows = monthFin
    if (typeF)  rows = rows.filter(f=>f.type===typeF)
    if (catF)   rows = rows.filter(f=>f.category===catF)
    if (srch)   rows = rows.filter(f=>(f.description||'').toLowerCase().includes(srch.toLowerCase()))
    return rows
  }, [monthFin, typeF, catF, srch])

  const kirim  = monthFin.filter(f=>f.type==='kirim') .reduce((s,f)=>s+(f.amount||0),0)
  const chiqim = monthFin.filter(f=>f.type==='chiqim').reduce((s,f)=>s+(f.amount||0),0)
  const foyda  = kirim - chiqim
  const allBal = allFin.reduce((s,f)=>f.type==='kirim'?s+(f.amount||0):s-(f.amount||0),0)

  /* Category breakdown for month */
  const catBreak = useMemo(() => {
    const m={}
    monthFin.forEach(f=>{ const k=f.category||'Boshqa'; if(!m[k])m[k]={kirim:0,chiqim:0}; m[k][f.type]=(m[k][f.type]||0)+(f.amount||0) })
    return Object.entries(m).sort((a,b)=>(b[1].kirim+b[1].chiqim)-(a[1].kirim+a[1].chiqim))
  },[monthFin])

  /* Debt orders for month */
  const debtOrders = useMemo(()=>
    orders.filter(o=>o.status==='tugallandi'&&(o.debt>0||(o.total>0&&!o.paid))).slice(0,10)
  ,[orders])

  async function save() {
    if (!form.description||!form.amount){toast('Tavsif va miqdor!','err');return}
    if (modal==='create') await crud.create(form)
    else await crud.update(form._id, form)
    setModal(null)
  }

  /* TABLE COLS */
  const COLS = [
    { k:'date',        l:'Sana',      r:v=><span className="mono" style={{fontSize:11}}>{v}</span> },
    { k:'type',        l:'Turi',       r:v=><span className="badge" style={{background:v==='kirim'?'var(--greenbg)':'var(--redbg)',color:v==='kirim'?'var(--green)':'var(--red)',fontSize:11}}>{v==='kirim'?<MdTrendingUp size={11}/>:<MdTrendingDown size={11}/>} {v==='kirim'?'Kirim':'Chiqim'}</span> },
    { k:'description', l:'Tavsif',    r:v=><span style={{fontSize:12}}>{v}</span> },
    { k:'category',    l:'Kategoriya', r:v=><span className="badge b-gray" style={{fontSize:10}}>{v}</span> },
    { k:'amount',      l:'Miqdor',    r:(v,r)=><span className="mono" style={{fontWeight:700,color:r.type==='kirim'?'var(--green)':'var(--red)'}}>{r.type==='kirim'?'+':'-'}{fmt.currency(v)}</span> },
    { k:'by',          l:'Kim',       r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v}</span> },
    { k:'_a', l:'', r:(_,row)=>(
      <div className="row-actions" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...row});setModal('edit')}}><MdEdit size={13}/></button>
        <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} onClick={()=>setDelId(row._id)}><MdDelete size={13}/></button>
      </div>
    )},
  ]

  /* ── REPORT VIEW ── */
  if (view === 'report') {
    return (
      <ErrorBoundary>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setView('list')}><MdArrowBack size={14}/> Orqaga</button>
            <h2 style={{fontSize:18,fontWeight:800,flex:1}}>📊 Oylik Hisobot</h2>
            {/* Month nav */}
            <div style={{display:'flex',alignItems:'center',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'2px 4px'}}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setMonth(prevMonth(month))}><MdArrowBack size={14}/></button>
              <span style={{padding:'4px 10px',fontWeight:700,fontSize:13,minWidth:140,textAlign:'center'}}>{monthLabel(month)}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setMonth(nextMonth(month))} disabled={month>=THIS_MONTH}><MdArrowForward size={14}/></button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>exportToCSV(monthFin,month)} style={{display:'flex',alignItems:'center',gap:5}}>
              <MdGridOn size={14}/> Excel (CSV)
            </button>
            <button className="btn btn-primary btn-sm" onClick={()=>exportToPDF(monthFin,month,{kirim,chiqim,foyda})} style={{display:'flex',alignItems:'center',gap:5}}>
              <MdPictureAsPdf size={14}/> PDF chop etish
            </button>
          </div>

          {/* Summary */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[
              {lbl:'Jami kirim',  val:fmt.currency(kirim),  c:'var(--green)', icon:<MdTrendingUp size={18}/>},
              {lbl:'Jami chiqim', val:fmt.currency(chiqim), c:'var(--red)',   icon:<MdTrendingDown size={18}/>},
              {lbl:'Foyda',       val:fmt.currency(foyda),  c:foyda>=0?'var(--green)':'var(--red)', icon:<MdBalance size={18}/>},
              {lbl:'Umumiy balans',val:fmt.currency(allBal), c:'var(--accent)',icon:<MdPieChart size={18}/>},
            ].map(k=>(
              <div key={k.lbl} className="kpi-card">
                <div className="kpi-hd"><div className="kpi-icon" style={{background:k.c+'22',color:k.c}}>{k.icon}</div></div>
                <div style={{fontWeight:800,fontSize:16,fontFamily:'monospace',color:k.c,marginTop:4}}>{k.val}</div>
                <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{k.lbl}</div>
              </div>
            ))}
          </div>

          <div className="g2">
            {/* Kategoriya breakdown */}
            <div className="card">
              <div className="card-hd"><div className="card-title"><MdPieChart size={14} style={{verticalAlign:'middle',marginRight:5}}/>Kategoriya bo'yicha</div></div>
              {catBreak.length===0 ? <div style={{color:'var(--text3)',fontSize:12,padding:8}}>Bu oyda tranzaksiya yo'q</div>
              : catBreak.map(([cat,data])=>{
                const total = data.kirim + data.chiqim
                const maxT  = Math.max(...catBreak.map(([,d])=>d.kirim+d.chiqim))
                return (
                  <div key={cat} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                      <span style={{fontWeight:600}}>{cat}</span>
                      <div style={{display:'flex',gap:10}}>
                        {data.kirim>0  && <span style={{color:'var(--green)',fontFamily:'monospace',fontSize:11}}>+{fmt.currency(data.kirim)}</span>}
                        {data.chiqim>0 && <span style={{color:'var(--red)',fontFamily:'monospace',fontSize:11}}>-{fmt.currency(data.chiqim)}</span>}
                      </div>
                    </div>
                    <div style={{height:6,background:'var(--bg4)',borderRadius:99,overflow:'hidden'}}>
                      {data.kirim>0  && <div style={{height:'100%',width:(data.kirim/maxT*100)+'%',background:'var(--green)',borderRadius:99}}/>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mijozlar qarzlari */}
            <div className="card">
              <div className="card-hd"><div className="card-title"><MdWarning size={14} style={{verticalAlign:'middle',marginRight:5,color:'var(--yellow)'}}/>Qarzdor mijozlar</div></div>
              {debtOrders.length===0
                ? <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--green)',fontSize:12,padding:8}}><MdCheckCircle size={14}/> Qarzdor mijoz yo'q</div>
                : debtOrders.map(o=>(
                  <div key={o._id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                    <MdPerson size={14} style={{color:'var(--text3)',flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:12}}>{o.customer}</div>
                      <div style={{fontSize:10,color:'var(--text2)'}}>{o.number}</div>
                    </div>
                    <span style={{fontWeight:800,fontFamily:'monospace',color:'var(--red)',fontSize:12}}>{fmt.currency(o.debt||o.total)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Maosh to'lovlari bu oyda */}
          {salData.length > 0 && (
            <div className="card" style={{marginTop:14}}>
              <div className="card-hd">
                <div className="card-title">👷 Xodimlar maoshi — {monthLabel(month)}</div>
                <button className="btn btn-ghost btn-sm" onClick={()=>exportToCSV(
                  salData.map(e=>({date:month,type:'chiqim',description:e.name,category:'Maosh',amount:e.oylik+e.avans,by:'Admin'})),
                  month+'-salary'
                )}>
                  <MdGridOn size={13}/> CSV
                </button>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:'var(--bg3)'}}>
                      {['Xodim','Rol','Maosh turi','Kutilgan','Avans','Oylik','Jarima','Bonus','Qoldi','Balans'].map(h=>(
                        <th key={h} style={{padding:'7px 8px',textAlign:'left',fontWeight:700,fontSize:10,color:'var(--text2)',letterSpacing:'.4px',textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salData.map(e=>(
                      <tr key={e._id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'7px 8px',fontWeight:600}}>{e.name}</td>
                        <td style={{padding:'7px 8px'}}><span className="badge b-blue" style={{fontSize:10}}>{e.role}</span></td>
                        <td style={{padding:'7px 8px',fontSize:11,color:'var(--text2)'}}>{e.salaryType||'Oylik'}</td>
                        <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--accent)'}}>{fmt.currency(e.expected)}</td>
                        <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--yellow)'}}>{e.avans>0?fmt.currency(e.avans):'—'}</td>
                        <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--green)'}}>{e.oylik>0?fmt.currency(e.oylik):'—'}</td>
                        <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--red)'}}>{e.jarima>0?fmt.currency(e.jarima):'—'}</td>
                        <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--purple)'}}>{e.bonus>0?fmt.currency(e.bonus):'—'}</td>
                        <td style={{padding:'7px 8px'}}>
                          <span style={{fontFamily:'monospace',fontWeight:700,color:e.remaining>0?'var(--green)':'var(--red)'}}>{fmt.currency(Math.abs(e.remaining))}</span>
                          <span style={{fontSize:9,color:'var(--text3)',marginLeft:3}}>{e.remaining>0?'qoldi':'oshiqcha'}</span>
                        </td>
                        <td style={{padding:'7px 8px'}}>
                          <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--yellow)'}}>{fmt.currency(e.currentBalance)}</span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{background:'var(--bg3)',fontWeight:700}}>
                      <td colSpan={3} style={{padding:'7px 8px',fontSize:11}}>JAMI</td>
                      <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--accent)'}}>{fmt.currency(salData.reduce((s,e)=>s+(e.expected||0),0))}</td>
                      <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--yellow)'}}>{fmt.currency(salData.reduce((s,e)=>s+(e.avans||0),0))}</td>
                      <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--green)'}}>{fmt.currency(salData.reduce((s,e)=>s+(e.oylik||0),0))}</td>
                      <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--red)'}}>{fmt.currency(salData.reduce((s,e)=>s+(e.jarima||0),0))}</td>
                      <td style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--purple)'}}>{fmt.currency(salData.reduce((s,e)=>s+(e.bonus||0),0))}</td>
                      <td colSpan={2} style={{padding:'7px 8px',fontFamily:'monospace',color:'var(--green)'}}>{fmt.currency(salData.reduce((s,e)=>s+(e.remaining||0),0))} qoldi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full transactions */}
          <div className="card" style={{marginTop:14,padding:0}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontWeight:700,fontSize:13,flex:1}}>📋 Tranzaksiyalar ({monthFin.length} ta)</div>
            </div>
            <Table cols={COLS} rows={filtered} loading={crud.loading}/>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  /* ── LIST VIEW ── */
  return (
    <ErrorBoundary>
      <div className="finance-wrap">
        <PH title="💰 Moliya — Pul Oqimi" sub={`${monthLabel(month)} · ${monthFin.length} ta tranzaksiya`}
          actions={<>
            <button className="btn btn-ghost btn-sm" onClick={()=>setView('report')} style={{display:'flex',alignItems:'center',gap:5}}>
              <MdPieChart size={14}/> Oylik hisobot
            </button>
            <button className="btn btn-success" onClick={()=>{setForm({...EMPTY,type:'kirim'});setModal('create')}}>
              <MdTrendingUp size={14}/> Kirim
            </button>
            <button className="btn btn-danger" onClick={()=>{setForm({...EMPTY,type:'chiqim'});setModal('create')}}>
              <MdTrendingDown size={14}/> Chiqim
            </button>
          </>}
        />

        {/* Month nav */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'2px 4px'}}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setMonth(prevMonth(month))}><MdArrowBack size={14}/></button>
            <span style={{padding:'4px 12px',fontWeight:700,fontSize:13,minWidth:140,textAlign:'center'}}>{monthLabel(month)}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setMonth(nextMonth(month))} disabled={month>=THIS_MONTH}><MdArrowForward size={14}/></button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setMonth(THIS_MONTH)}>
            <MdCalendarToday size={13}/> Bu oy
          </button>
          <div style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm" onClick={()=>exportToCSV(filtered,month)}>
            <MdGridOn size={13}/> CSV/Excel
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>exportToPDF(filtered,month,{kirim,chiqim,foyda})}>
            <MdPictureAsPdf size={13}/> PDF
          </button>
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          {[
            {lbl:'Kirim',  val:fmt.currency(kirim),  c:'var(--green)', icon:<MdTrendingUp size={18}/>},
            {lbl:'Chiqim', val:fmt.currency(chiqim), c:'var(--red)',   icon:<MdTrendingDown size={18}/>},
            {lbl:'Foyda',  val:fmt.currency(foyda),  c:foyda>=0?'var(--green)':'var(--red)', icon:<MdBalance size={18}/>},
            {lbl:'Balans', val:fmt.currency(allBal), c:'var(--accent)',icon:<MdPieChart size={18}/>},
          ].map(k=>(
            <div key={k.lbl} className="kpi-card">
              <div className="kpi-hd"><div className="kpi-icon" style={{background:k.c+'22',color:k.c}}>{k.icon}</div></div>
              <div style={{fontWeight:800,fontSize:15,fontFamily:'monospace',color:k.c,marginTop:4}}>{k.val}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="fbar" style={{marginBottom:12}}>
          <div style={{position:'relative',flex:1}}>
            <MdSearch size={16} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}}/>
            <input className="finput" style={{paddingLeft:32}} placeholder="Tavsif qidirish..."
              value={srch} onChange={e=>setSrch(e.target.value)}/>
          </div>
          <select className="fselect" value={typeF} onChange={e=>setTypeF(e.target.value)}>
            <option value="">Barcha tur</option>
            <option value="kirim">Kirim</option>
            <option value="chiqim">Chiqim</option>
          </select>
          <select className="fselect" value={catF} onChange={e=>setCatF(e.target.value)}>
            <option value="">Barcha kategoriya</option>
            {ALL_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={filtered} loading={crud.loading}/>
        </div>

        {/* Create/Edit modal */}
        <Modal open={modal==='create'||modal==='edit'} onClose={()=>setModal(null)}
          title={form.type==='kirim'?'💰 Kirim':'💸 Chiqim'}
          footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>Bekor</button><button className={`btn ${form.type==='kirim'?'btn-success':'btn-danger'}`} onClick={save}>Saqlash</button></>}>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['kirim','chiqim'].map(t=>(
              <button key={t} className={`btn btn-sm ${form.type===t?(t==='kirim'?'btn-success':'btn-danger'):'btn-ghost'}`}
                onClick={()=>setForm(p=>({...p,type:t,category:t==='kirim'?'Buyurtma':'Kimyoviy moddalar'}))}>
                {t==='kirim'?<><MdTrendingUp size={13}/> Kirim</>:<><MdTrendingDown size={13}/> Chiqim</>}
              </button>
            ))}
          </div>
          <div className="fg"><label className="flabel">Kategoriya</label>
            <select className="fselect" value={form.category} onChange={set('category')}>
              {(form.type==='kirim'?CATS_KIRIM:CATS_CHIQIM).map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg"><label className="flabel">Tavsif *</label><input className="finput" value={form.description} onChange={set('description')}/></div>
          <div className="fgrid2">
            <div className="fg"><label className="flabel">Miqdor (so'm) *</label><input className="finput" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:+e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Sana</label><input className="finput" type="date" value={form.date} onChange={set('date')}/></div>
          </div>
        </Modal>

        <Confirm open={!!delId} onClose={()=>setDelId(null)}
          onOk={async()=>{await crud.remove(delId);setDelId(null)}} title="O'chirish" msg="O'chirishni xohlaysizmi?" danger/>
      </div>
    </ErrorBoundary>
  )
}
