import { Menu, Save } from 'lucide-react'

export default function Topbar({ saved, onSave, onMenu }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">IIT<span>DH</span></div>
        <div>
          <div className="brand-title">Indian Institute of Technology Dharwad</div>
          <div className="brand-subtitle">Faculty Welfare · Annual Performance Appraisal</div>
        </div>
      </div>
      <div className="top-actions">
        <span className={`save-state ${saved ? 'saved' : 'unsaved'}`}><span className="dot" /> {saved ? 'Draft saved' : 'Unsaved changes'}</span>
        <button className="icon-btn mobile-menu" onClick={onMenu} aria-label="Menu"><Menu size={19} /></button>
        <button className="outline-btn" onClick={onSave}><Save size={16} /> Save draft</button>
      </div>
    </header>
  )
}
