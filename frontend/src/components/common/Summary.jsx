export function Summary({ label, value }) { return <div><span>{label}</span><strong>{value || '—'}</strong></div> }
export function SummaryBlock({ title, value }) { return <div className="summary-block"><span>{title}</span><p>{value || 'Not provided.'}</p></div> }
export function Metric({ value, label }) { return <div className="metric"><strong>{value}</strong><span>{label}</span></div> }
