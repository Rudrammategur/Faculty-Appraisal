import { CircleHelp, Check } from 'lucide-react'

export default function Sidebar({ sections, active, onSelect, mobileOpen, period }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="period-card">
        <div className="eyebrow">APPRAISAL PERIOD</div>
        <div className="period">{period}</div>
        <span className="status-pill"><span className="status-dot" /> In progress</span>
      </div>
      <nav className="section-nav">
        {sections.map((item, index) => {
          const Icon = item.icon
          const done = index < active
          return (
            <button key={item.id} className={`nav-item ${index === active ? 'active' : ''}`} onClick={() => onSelect(index)}>
              <span className={`nav-icon ${done ? 'done' : ''}`}>{done ? <Check size={15} /> : <Icon size={17} />}</span>
              <span className="nav-copy"><strong>{item.label}</strong><small>{item.short}</small></span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-help"><CircleHelp size={17} /><div><strong>Need help?</strong><span>Use the guidance beside each section.</span></div></div>
    </aside>
  )
}
