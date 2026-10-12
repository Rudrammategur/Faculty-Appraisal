export function AutoField({ label, value, hint }) {
  return (
    <div className="field">
      <label>{label}<span className="auto-tag"></span></label>
      <div className="readonly-field">{value || 'Not available'}</div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function TextField({ label, value, onChange, type = 'text', placeholder, required, hint }) {
  return (
    <div className="field">
      <label>{label}{required && <em>*</em>}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function TextArea({ label, value, onChange, max = 1000, placeholder, hint }) {
  const count = (value || '').length
  return (
    <div className="field full">
      <label>{label}</label>
      <textarea value={value || ''} maxLength={max} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <div className="textarea-meta"><span>{hint || `Maximum ${max} characters`}</span><span>{count}/{max}</span></div>
    </div>
  )
}
