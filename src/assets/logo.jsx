export function Logo({ size = 36, showText = false, textColor = '#e6edf3' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
        <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#lg1)"/>
        <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#lg2)" opacity="0.4"/>
        <path d="M12 65 Q24 50 36 65 Q48 80 60 65 Q72 50 84 65 Q92 73 96 68" stroke="white" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.95"/>
        <path d="M12 52 Q24 37 36 52 Q48 67 60 52 Q72 37 84 52 Q92 60 96 55" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7"/>
        <path d="M12 39 Q24 24 36 39 Q48 54 60 39 Q72 24 84 39" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d="M76 8 C76 8 66 20 66 27 C66 33.6 70.5 38 76 38 C81.5 38 86 33.6 86 27 C86 20 76 8 76 8Z" fill="white" opacity="0.92"/>
        <ellipse cx="73" cy="28" rx="4" ry="5" fill="url(#lg1)" opacity="0.5"/>
        <path d="M22 14 L24 20 L30 22 L24 24 L22 30 L20 24 L14 22 L20 20Z" fill="white" opacity="0.85"/>
        <defs>
          <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1565C0"/><stop offset="100%" stopColor="#0D47A1"/></linearGradient>
          <linearGradient id="lg2" x1="0%" y1="0%" x2="60%" y2="100%"><stop offset="0%" stopColor="#42A5F5" stopOpacity="0.5"/><stop offset="100%" stopColor="#0D47A1" stopOpacity="0"/></linearGradient>
        </defs>
      </svg>
      {showText && (
        <div>
          <div style={{fontSize:size*0.38,fontWeight:800,color:textColor,lineHeight:1.1,letterSpacing:'-0.3px'}}>CleanPro</div>
          <div style={{fontSize:size*0.22,fontWeight:600,color:'#6e7681',letterSpacing:'1.2px',textTransform:'uppercase'}}>Himchishtka CRM</div>
        </div>
      )}
    </div>
  )
}
export default Logo
