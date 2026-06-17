import { useState, useEffect, useMemo } from 'react'
import { MdFileDownload, MdCheckCircle, MdCancel, MdAttachMoney, MdChevronRight } from 'react-icons/md'
import { useCRUD } from '../../hooks/useCRUD.js'
import { api, fmt } from '../../services/api.js'
import { Sbadge, Table, Paging, PH, ExportBtn, ErrorBoundary } from '../../components/ui/UI.jsx'
import './Archive.css'
import { useLang } from '../../i18n/index.jsx'

const isMob = () => window.innerWidth <= 768

export default function Archive() {
  const { t } = useLang()
  const crud   = useCRUD(
    { getAll:api.getArchive, create:()=>Promise.resolve({}), update:()=>Promise.resolve({}), remove:()=>Promise.resolve({}) },
    ['number','customer']
  )
  const [mobile, setMobile] = useState(isMob())
  const [srch,   setSrch]   = useState('')
  const [statusF,setStatusF]= useState('')

  useEffect(() => {
    const fn = () => setMobile(isMob())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const done   = crud.data.filter(a=>a.status==='tugallandi'||a.status==='yetkazildi')
  const bekor  = crud.data.filter(a=>a.status==='bekor')
  const totalR = done.reduce((s,a)=>s+(a.total||0),0)

  const filtered = useMemo(()=>{
    let r = crud.data
    if (statusF) r = r.filter(a=>a.status===statusF)
    if (srch)    r = r.filter(a=>(a.number||'').includes(srch)||(a.customer||'').toLowerCase().includes(srch.toLowerCase()))
    return r
  },[crud.data,statusF,srch])

  const COLS = [
    { k:'number',   l:'Raqam',      r:v=><span className="mono" style={{color:'var(--accent)',fontWeight:700}}>{v}</span> },
    { k:'customer', l:'Mijoz' },
    { k:'driver',   l:'Shafyor',    r:v=>v&&v!=='—'?v:<span style={{color:'var(--text3)'}}>—</span> },
    { k:'total',    l:'Narx',       r:v=><span className="mono" style={{fontWeight:700}}>{fmt.currency(v)}</span> },
    { k:'status',   l:'Holat',      r:v=><Sbadge s={v}/> },
    { k:'date',     l:'Sana',       r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v}</span> },
  ]

  /* ── MOBILE ── */
  if (mobile) return (
    <ErrorBoundary>
      <div style={{paddingBottom:90}}>
        {/* Hero */}
        <div style={{background:'linear-gradient(160deg,#1a1005 0%,#0d1117 100%)',padding:'14px 16px 18px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:150,height:150,borderRadius:'50%',background:'rgba(234,179,8,.08)',filter:'blur(30px)',pointerEvents:'none'}}/>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>
            📋 Tarix / Arxiv
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[
              {lbl:'Yakunlandi',   val:done.length,           c:'#22c55e', emoji:'✅'},
              {lbl:t.cancel||'Bekor',        val:bekor.length,          c:'#f85149', emoji:'❌'},
              {lbl:'Jami daromad', val:fmt.currency(totalR),  c:'#f59e0b', emoji:'💰', small:true},
            ].map(s=>(
              <div key={s.lbl} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'10px'}}>
                <div style={{fontSize:16,marginBottom:4}}>{s.emoji}</div>
                <div style={{fontWeight:900,color:s.c,fontFamily:'monospace',fontSize:s.small?12:20,lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,.35)',marginTop:3}}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status pills */}
        <div style={{display:'flex',gap:6,padding:'10px 16px 6px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[{k:'',l:t.all||'Barchasi'},{k:'tugallandi',l:'✅ Tugallandi'},{k:'bekor',l:'❌ Bekor'}].map(t=>(
            <button key={t.k} onClick={()=>setStatusF(t.k)} style={{
              flexShrink:0,padding:'6px 14px',borderRadius:99,cursor:'pointer',
              background:statusF===t.k?'rgba(34,197,94,.15)':'var(--bg2)',
              border:`1px solid ${statusF===t.k?'rgba(34,197,94,.4)':'var(--border)'}`,
              color:statusF===t.k?'#22c55e':'var(--text3)',fontSize:12,fontWeight:700,
              WebkitTapHighlightColor:'transparent',
            }}>{t.l}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{padding:'4px 16px 10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'8px 12px'}}>
            <span style={{fontSize:15,flexShrink:0}}>🔍</span>
            <input placeholder="Raqam yoki mijoz..." value={srch} onChange={e=>setSrch(e.target.value)}
              style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--text)',fontSize:14,fontFamily:'inherit'}}/>
            {srch&&<button onClick={()=>setSrch('')} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:16}}>✕</button>}
          </div>
        </div>

        {/* Count */}
        <div style={{padding:'0 16px 8px',fontSize:12,color:'var(--text3)'}}>{filtered.length} ta buyurtma</div>

        {/* Cards */}
        <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:8}}>
          {crud.loading ? (
            [...Array(3)].map((_,i)=>(
              <div key={i} style={{height:80,borderRadius:14,background:'var(--bg2)',animation:'mobSkel 1.4s ease-in-out infinite',animationDelay:i*80+'ms'}}/>
            ))
          ) : filtered.length===0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
              <div style={{fontSize:36,marginBottom:8}}>📭</div>
              <div>Topilmadi</div>
            </div>
          ) : filtered.map(a=>(
            <div key={a._id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 14px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,
                background:a.status==='tugallandi'?'#22c55e':'#f85149',borderRadius:'14px 0 0 14px'}}/>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontFamily:'monospace',fontWeight:800,fontSize:13,color:'var(--accent)'}}>{a.number}</span>
                    <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,
                      background:a.status==='tugallandi'?'rgba(34,197,94,.12)':'rgba(248,81,73,.12)',
                      color:a.status==='tugallandi'?'#22c55e':'#f85149',fontWeight:700}}>
                      {a.status==='tugallandi'?'✅ Tugallandi':'❌ Bekor'}
                    </span>
                  </div>
                  <div style={{fontWeight:700,fontSize:14,marginTop:3}}>{a.customer}</div>
                  {a.driver&&<div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>🚗 {a.driver}</div>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:800,fontFamily:'monospace',fontSize:15,color:'#22c55e'}}>{fmt.currency(a.total)}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{a.date||a.closedAt}</div>
                </div>
              </div>
              {a.itemSummary&&<div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:4}}>📋 {a.itemSummary}</div>}
            </div>
          ))}
        </div>
        <style>{`@keyframes mobSkel{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      </div>
    </ErrorBoundary>
  )

  /* ── DESKTOP ── */
  return (
    <ErrorBoundary>
      <div className="archive-wrap">
        <PH title="📋 Tarix / Arxiv" sub="Tugallangan buyurtmalar"
          actions={<ExportBtn data={crud.filtered} name="arxiv"/>}
        />
        <div className="kpi-grid" style={{marginBottom:16}}>
          <div className="kpi-card"><div className="kpi-hd"><div className="kpi-icon" style={{background:'var(--greenbg)'}}><MdCheckCircle size={20} style={{color:'var(--green)'}}/></div></div><div className="kpi-val">{done.length}</div><div className="kpi-lbl">Yakunlandi</div></div>
          <div className="kpi-card"><div className="kpi-hd"><div className="kpi-icon" style={{background:'var(--redbg)'}}><MdCancel size={20} style={{color:'var(--red)'}}/></div></div><div className="kpi-val">{bekor.length}</div><div className="kpi-lbl">Bekor qilingan</div></div>
          <div className="kpi-card"><div className="kpi-hd"><div className="kpi-icon" style={{background:'var(--accentbg)'}}><MdAttachMoney size={20} style={{color:'var(--accent)'}}/></div></div><div className="kpi-val" style={{fontSize:16}}>{fmt.currency(totalR)}</div><div className="kpi-lbl">Jami daromad</div></div>
        </div>
        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Raqam yoki mijoz..." value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.status||''} onChange={e=>crud.setFilter('status',e.target.value)}>
            <option value="">Barcha holat</option>
            <option value="tugallandi">Tugallandi</option>
            <option value="bekor">{t.cancel}</option>
          </select>
          <input type="date" className="finput" style={{width:145}} onChange={e=>crud.setFilter('date',e.target.value)}/>
        </div>
        <div className="card" style={{padding:0}}>
          <Table cols={COLS} rows={crud.paginated} loading={crud.loading}/>
          <Paging page={crud.page} total={crud.total} size={crud.pageSize} onChange={crud.setPage}/>
        </div>
      </div>
    </ErrorBoundary>
  )
}
