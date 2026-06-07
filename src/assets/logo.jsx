/**
 * Tartib CRM — Logo Component
 * SVG dan inline React component
 */

/* ── Faqat icon (3x3 grid) ── */
export function LogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="240" cy="240" r="230" fill="#0B1A3E"/>
      <circle cx="240" cy="240" r="228" fill="none" stroke="#3B82F6" strokeWidth="2" opacity="0.3"/>
      {/* Row 1 */}
      <rect x="118" y="118" width="70" height="70" rx="11" fill="#3B82F6"/>
      <rect x="205" y="118" width="70" height="70" rx="11" fill="white" opacity="0.15"/>
      <rect x="292" y="118" width="70" height="70" rx="11" fill="white" opacity="0.15"/>
      {/* Row 2 */}
      <rect x="118" y="205" width="70" height="70" rx="11" fill="#06B6D4"/>
      <rect x="205" y="205" width="70" height="70" rx="11" fill="#3B82F6"/>
      <rect x="292" y="205" width="70" height="70" rx="11" fill="white" opacity="0.15"/>
      {/* Row 3 */}
      <rect x="118" y="292" width="70" height="70" rx="11" fill="white" opacity="0.15"/>
      <rect x="205" y="292" width="70" height="70" rx="11" fill="#06B6D4"/>
      <rect x="292" y="292" width="70" height="70" rx="11" fill="#3B82F6"/>
      {/* H lines */}
      <line x1="188" y1="153" x2="205" y2="153" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="275" y1="153" x2="292" y2="153" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="188" y1="240" x2="205" y2="240" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="275" y1="240" x2="292" y2="240" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="188" y1="327" x2="205" y2="327" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="275" y1="327" x2="292" y2="327" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      {/* V lines */}
      <line x1="153" y1="188" x2="153" y2="205" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="240" y1="188" x2="240" y2="205" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="327" y1="188" x2="327" y2="205" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="153" y1="275" x2="153" y2="292" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="240" y1="275" x2="240" y2="292" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="327" y1="275" x2="327" y2="292" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
    </svg>
  )
}

/* ── Icon + Text (Sidebar uchun) ── */
export function Logo({ size = 36, collapsed = false, textColor = '#e6edf3' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
      <LogoIcon size={size}/>
      {!collapsed && (
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: size * 0.42, fontWeight: 800, color: textColor,
            lineHeight: 1.1, letterSpacing: '-0.3px', whiteSpace: 'nowrap',
          }}>
            Tartib CRM
          </div>
          <div style={{
            fontSize: size * 0.24, fontWeight: 500, color: '#3B82F6',
            letterSpacing: '1px', textTransform: 'uppercase', marginTop: 1,
            whiteSpace: 'nowrap',
          }}>
            Boshqaruv tizimi
          </div>
        </div>
      )}
    </div>
  )
}

/* ── To'liq SVG (Login sahifasi uchun) ── */
export function LogoFull({ size = 200 }) {
  const scale = size / 680
  return (
    <svg width={size} height={size * (560/680)} viewBox="0 0 680 560"
      fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {/* Circle bg */}
      <circle cx="340" cy="240" r="230" fill="#0B1A3E"/>
      <circle cx="340" cy="240" r="228" fill="none" stroke="#3B82F6" strokeWidth="2" opacity="0.3"/>
      {/* Row 1 */}
      <rect x="218" y="108" width="60" height="60" rx="10" fill="#3B82F6"/>
      <rect x="310" y="108" width="60" height="60" rx="10" fill="white" opacity="0.15"/>
      <rect x="402" y="108" width="60" height="60" rx="10" fill="white" opacity="0.15"/>
      {/* Row 2 */}
      <rect x="218" y="186" width="60" height="60" rx="10" fill="#06B6D4"/>
      <rect x="310" y="186" width="60" height="60" rx="10" fill="#3B82F6"/>
      <rect x="402" y="186" width="60" height="60" rx="10" fill="white" opacity="0.15"/>
      {/* Row 3 */}
      <rect x="218" y="264" width="60" height="60" rx="10" fill="white" opacity="0.15"/>
      <rect x="310" y="264" width="60" height="60" rx="10" fill="#06B6D4"/>
      <rect x="402" y="264" width="60" height="60" rx="10" fill="#3B82F6"/>
      {/* H connectors */}
      <line x1="278" y1="138" x2="310" y2="138" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="370" y1="138" x2="402" y2="138" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="278" y1="216" x2="310" y2="216" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="370" y1="216" x2="402" y2="216" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="278" y1="294" x2="310" y2="294" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="370" y1="294" x2="402" y2="294" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      {/* V connectors */}
      <line x1="248" y1="168" x2="248" y2="186" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="340" y1="168" x2="340" y2="186" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="432" y1="168" x2="432" y2="186" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="248" y1="246" x2="248" y2="264" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      <line x1="340" y1="246" x2="340" y2="264" stroke="#3B82F6" strokeWidth="2.5" opacity="0.5"/>
      <line x1="432" y1="246" x2="432" y2="264" stroke="#06B6D4" strokeWidth="2.5" opacity="0.5"/>
      {/* TARTIB */}
      <text x="340" y="420" textAnchor="middle"
        fontFamily="'Arial Black', sans-serif" fontSize="72" fontWeight="900" fill="white">
        TARTIB
      </text>
      {/* CRM */}
      <text x="340" y="462" textAnchor="middle"
        fontFamily="Arial, sans-serif" fontSize="24" fontWeight="400" fill="#3B82F6">
        CRM
      </text>
      {/* Bottom line */}
      <line x1="240" y1="478" x2="440" y2="478" stroke="#3B82F6" strokeWidth="1" opacity="0.4"/>
    </svg>
  )
}

export default Logo
