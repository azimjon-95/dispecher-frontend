import { MdFileDownload, MdCheckCircle, MdCancel, MdAttachMoney } from 'react-icons/md'
import { useCRUD } from '../../hooks/useCRUD.js'
import { api, fmt } from '../../services/api.js'
import { Sbadge, Table, Paging, PH, ExportBtn } from '../../components/ui/UI.jsx'
import { ErrorBoundary } from '../../components/ui/UI.jsx'
import './Archive.css'

export default function Archive() {
  const crud = useCRUD(
    { getAll:api.getArchive, create:()=>Promise.resolve({}), update:()=>Promise.resolve({}), remove:()=>Promise.resolve({}) },
    ['number','customer']
  )

  const done   = crud.data.filter(a=>a.status==='tugallandi'||a.status==='yetkazildi')
  const bekor  = crud.data.filter(a=>a.status==='bekor')
  const totalR = done.reduce((s,a)=>s+(a.total||0),0)

  const COLS = [
    { k:'number',   l:'Raqam',      r:v=><span className="mono" style={{color:'var(--accent)',fontWeight:700}}>{v}</span> },
    { k:'customer', l:'Mijoz' },
    { k:'driver',   l:'Shafyor',    r:v=>v&&v!=='—'?v:<span style={{color:'var(--text3)'}}>—</span> },
    { k:'total',    l:'Narx',       r:v=><span className="mono" style={{fontWeight:700}}>{fmt.currency(v)}</span> },
    { k:'status',   l:'Holat',      r:v=><Sbadge s={v}/> },
    { k:'date',     l:'Sana',       r:v=><span style={{fontSize:11,color:'var(--text2)'}}>{v}</span> },
    { k:'closedAt', l:'Yakunlandi', r:v=><span style={{fontSize:11,color:'var(--text3)'}}>{v}</span> },
  ]

  return (
    <ErrorBoundary>
      <div className="archive-wrap">
        <PH title="📋 Tarix / Arxiv" sub="Tugallangan buyurtmalar"
          actions={<ExportBtn data={crud.filtered} name="arxiv"/>}
        />

        <div className="kpi-grid" style={{marginBottom:16}}>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--greenbg)'}}>
                <MdCheckCircle size={20} style={{color:'var(--green)'}}/>
              </div>
            </div>
            <div className="kpi-val">{done.length}</div>
            <div className="kpi-lbl">Yakunlandi</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--redbg)'}}>
                <MdCancel size={20} style={{color:'var(--red)'}}/>
              </div>
            </div>
            <div className="kpi-val">{bekor.length}</div>
            <div className="kpi-lbl">Bekor qilingan</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-hd">
              <div className="kpi-icon" style={{background:'var(--accentbg)'}}>
                <MdAttachMoney size={20} style={{color:'var(--accent)'}}/>
              </div>
            </div>
            <div className="kpi-val" style={{fontSize:16}}>{fmt.currency(totalR)}</div>
            <div className="kpi-lbl">Jami daromad</div>
          </div>
        </div>

        <div className="fbar">
          <input className="finput fsearch" placeholder="🔍 Raqam yoki mijoz..."
            value={crud.search} onChange={e=>crud.onSearch(e.target.value)}/>
          <select className="fselect" value={crud.filters.status||''} onChange={e=>crud.setFilter('status',e.target.value)}>
            <option value="">Barcha holat</option>
            <option value="tugallandi">Tugallandi</option>
            <option value="yetkazildi">Yetkazildi</option>
            <option value="bekor">Bekor</option>
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
