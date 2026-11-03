import { CircleHelp, Check, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function Sidebar({ sections, active, onSelect, mobileOpen, period, collapsed = false, onToggleCollapse }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-collapse-row">
        <button type="button" className="sidebar-collapse-button" onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          aria-expanded={!collapsed}>
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          {!collapsed && <span></span>}
        </button>
      </div>
      <nav className="section-nav">
        {sections.map((item, index) => {
          const Icon = item.icon
          const done = index < active
          return (
            <button type="button" key={item.id}
              className={`nav-item ${index === active ? 'active' : ''}`}
              onClick={() => onSelect(index)} title={collapsed ? item.label : undefined}
              aria-label={item.label} aria-current={index === active ? 'step' : undefined}>
              <span className={`nav-icon ${done ? 'done' : ''}`}>
                 <Icon size={20} />
              </span>
              <span className="nav-copy"><strong>{item.label}</strong><small>{item.short}</small></span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-help"><CircleHelp size={17} /><div><strong>Need help?</strong><span>Use the guidance beside each section.</span></div></div>
    </aside>
  )
}
