import '../../styles/portal-banner.css'
import '../../styles/form-dashboard-cleanup.css'
import { ArrowLeft, Menu, Save } from 'lucide-react'

export default function Topbar({
  saved,
  onSave,
  onMenu,
  onDashboard,
  period,
  showFormActions = true,
  isDashboard = false,
}) {
  if (!isDashboard) return <header className="appraisal-form-toolbar" aria-label="Appraisal form actions">
    <h1 className="appraisal-form-toolbar-title">
  Annual Faculty Self-Appraisal Form (AFSAF)
</h1>
    <div className="appraisal-form-toolbar-actions">
      {onMenu && <button type="button" className="icon-btn mobile-menu" onClick={onMenu} aria-label="Open section navigation"><Menu size={19}/></button>}
      <button type="button" className="outline-btn" onClick={onDashboard}><ArrowLeft size={16}/>Back</button>
      {showFormActions && <button type="button" className="outline-btn appraisal-form-save" onClick={onSave}><Save size={16}/>Save draft</button>}
    </div>
  </header>
  return (
    <header className="topbar appraisal-topbar portal-banner">
      <div className="brand">
        <img
          src={`${import.meta.env.BASE_URL}iitdh-logo.png`}
          alt="IIT Dharwad"
          className="topbar-logo"
        />
      </div>

      <div className="topbar-heading">
        <div className="brand-subtitle">
          Faculty Welfare (FW) Section
        </div>

        <div className="topbar-title">
          {isDashboard
            ? 'Faculty Annual Self-Appraisal Portal'
            : 'Annual Faculty Self-Appraisal Form (AFSAF)'}
        </div>

        {!isDashboard && (
          <div className="brand-subtitle">
            Period: {period || 'Not selected'}
          </div>
        )}
      </div>

      {!showFormActions && !isDashboard && onDashboard && <button type="button" className="outline-btn portal-banner-back" onClick={onDashboard}><ArrowLeft size={16}/>Back</button>}
      {showFormActions && (
        <div className="top-actions">
          <button
            type="button"
            className="icon-btn mobile-menu"
            onClick={onMenu}
            aria-label="Menu"
          >
            <Menu size={19} />
          </button>

          <span className={`save-state ${saved ? 'saved' : 'unsaved'}`}>
            <span className="dot" />
            {saved ? 'Draft saved' : 'Unsaved changes'}
          </span>

          <button type="button" className="outline-btn" onClick={onSave}>
            <Save size={16} />
            Save draft
          </button>

          <button
            type="button"
            className="back-to-dashboard"
            onClick={onDashboard}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
    </header>
  )
}