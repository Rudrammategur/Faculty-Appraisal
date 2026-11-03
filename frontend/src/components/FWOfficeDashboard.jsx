import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Plus } from 'lucide-react'
import { getFwAcademicYears, getFwCycles, saveFwCycle } from '../api/fwOfficeApi'
import '../styles/fw-office.css'
import '../styles/fw-period.css'
import '../styles/portal-banner.css'

const date = value => value ? value.split('-').reverse().join('.') : '—'
const stateLabel = item => !item.isPublished ? 'Not active' : item.state === 'Scheduled' ? 'Upcoming' : item.state

export default function FWOfficeDashboard({ onBack }) {
  const [years, setYears] = useState([])
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [year, setYear] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    Promise.all([
      getFwAcademicYears(controller.signal),
      getFwCycles(controller.signal),
    ]).then(([available, saved]) => {
      if (!controller.signal.aborted) {
        setYears(available)
        setCycles(saved)
      }
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.message)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    const guard = event => {
      if (editing && (year || from || to)) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [editing, year, from, to])

  const configured = new Set(cycles.map(item => Number(item.academicYearId)))
  const available = years.filter(item => !configured.has(Number(item.academicYearId)))

  function cancel() {
    if (saving) return
    setEditing(false)
    setSelected(null)
    setReason('')
    setYear('')
    setFrom('')
    setTo('')
    setError('')
  }

  function back() {
    if (editing && (year || from || to) &&
        !window.confirm('Leave without saving this period?')) return
    onBack?.()
  }

  async function save(event) {
    event.preventDefault()
    if (lock.current) return
    if (!year || !from || !to || to < from) {
      setError('Select an academic year and valid From and To dates.')
      return
    }
    lock.current = true
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await saveFwCycle(Number(year), {
        openingDate: from,
        closingDate: to,
        version: selected?.version ?? null,
        reason,
        publish: true,
      })
      setCycles(previous => [
        { ...result.settings, academicYear: result.academicYear.academicYear, reportingFrom: result.academicYear.reportingFrom, reportingTo: result.academicYear.reportingTo },
        ...previous.filter(item => Number(item.academicYearId) !== Number(year)),
      ].sort((a, b) => Number(b.academicYearId) - Number(a.academicYearId)))
      setEditing(false)
      setYear('')
      setFrom('')
      setTo('')
      setMessage('Application dates saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  return (
    <main className="fw-office">
      <header className="fw-header portal-banner">
        <img src={`${import.meta.env.BASE_URL}iitdh-logo.png`} alt="IIT Dharwad" />
        <div><p>Faculty Welfare Office</p><h1>Appraisal Periods</h1></div>
        {onBack && <button type="button" className="outline-btn portal-banner-back" onClick={onBack}><ArrowLeft size={18}/>Back</button>}
      </header>

      <div className="fw-content fw-period-content">
        <div className="fw-period-heading">
          <h2><CalendarDays size={23} />Appraisal Periods</h2>
          {!editing && !loading && (
            <button type="button" className="fw-primary"
              disabled={!available.length}
              onClick={() => { setSelected(null); setYear(''); setFrom(''); setTo(''); setReason(''); setEditing(true); setError(''); setMessage('') }}>
              <Plus size={17} />Set Appraisal Period
            </button>
          )}
        </div>

        {error && <div className="fw-alert" role="alert">
          <p>{error}</p>
          {!editing && <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button>}
        </div>}
        {message && <p className="fw-success" role="status">{message}</p>}

        {editing && (
          <section className="fw-card">
            <h3>{selected ? 'Modify Application Dates' : 'Set Up Appraisal Cycle'}</h3>
            <form className="fw-form" onSubmit={save}>
              <label htmlFor="period-year">Academic year
                <select id="period-year" value={year} required disabled={saving || Boolean(selected)}
                  onChange={event => setYear(event.target.value)}>
                  <option value="">Select academic year</option>
                  {(selected ? years.filter(item => Number(item.academicYearId) === Number(year)) : available).map(item => <option key={item.academicYearId} value={item.academicYearId}>
                    {item.academicYear}
                  </option>)}
                </select>
              </label>
              <p className="fw-muted">Appraisal period: {year ? (() => {
                const item = years.find(item => Number(item.academicYearId) === Number(year))
                if (!item) return '—'
                return `${date(item.reportingFrom)} – ${date(item.reportingTo)}`
              })() : 'Select an academic year'}</p>
              <div className="fw-grid">
                <label htmlFor="period-from">Applications open on
                  <input id="period-from" type="date" required min="1900-01-01"
                    max={to || '9998-12-31'} value={from} disabled={saving}
                    onChange={event => setFrom(event.target.value)} />
                </label>
                <label htmlFor="period-to">Applications close on
                  <input id="period-to" type="date" required min={from || '1900-01-01'}
                    max="9998-12-31" value={to} disabled={saving}
                    onChange={event => setTo(event.target.value)} />
                </label>
              </div>
              <p className="fw-muted">Faculty can edit and submit during these dates, including the full To date in IST. The appraisal period stays fixed to 1 August–31 July of the selected academic year.</p>
               {selected && <label>Reason for change
                <textarea rows={2} required maxLength={500} value={reason} disabled={saving}
                  onChange={event => setReason(event.target.value)} />
              </label>}
              <div className="fw-period-buttons">
                <button type="button" className="outline-btn" disabled={saving} onClick={cancel}>Cancel</button>
                <button type="submit" className="fw-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </section>
        )}

        <section className="fw-card">
          {loading ? <p role="status">Loading appraisal periods…</p> :
            cycles.length ? <div className="fw-period-scroll">
              <table className="fw-period-table">
                <thead><tr><th>Academic year</th><th>Appraisal period</th><th>Application dates</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{cycles.map(item => <tr key={item.academicYearId}>
                  <td>{item.academicYear}</td>
                  <td>{date(item.reportingFrom)} – {date(item.reportingTo)}</td>
                  <td>{date(item.openingDate)} – {date(item.closingDate)}</td>
                  <td><span className={`fw-state fw-state-${item.state?.toLowerCase()}`}>{stateLabel(item)}</span></td>
                  <td><button type="button" className="outline-btn" disabled={editing || saving}
                    onClick={() => {
                      setSelected(item); setYear(String(item.academicYearId))
                      setFrom(item.openingDate); setTo(item.closingDate); setReason('')
                      setEditing(true); setError(''); setMessage('')
                    }}>Modify</button></td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="fw-muted">No appraisal periods have been set.</p>}
        </section>
      </div>
    </main>
  )
}
