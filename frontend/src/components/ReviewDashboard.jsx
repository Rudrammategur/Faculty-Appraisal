import { paginateReviews } from '../utils/reviewPagination'
import '../styles/review-pagination.css'
import '../styles/dashboard-actions.css'
import '../styles/return-flow.css'
import { prepareSupervision } from '../utils/reviewPresentation'
import '../styles/portal-banner.css'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Search, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react'
import ApplicationView from './ApplicationView'
import PortalNavigation from './PortalNavigation'
import { stageLabel, workflowTime } from './WorkflowSummary'
import {
  getPendingReviews, getReviewedApplications, getReviewDetails, getReviewSource, takeReviewAction, reviewerDocumentUrl,
} from '../api/approvalApi'
import '../styles/review-workspace.css'
const date = value => value?.split('-').reverse().join('.') || '—'
export default function ReviewDashboard({ onBack, onNavigate, permissions = {} }) {
  const [pending, setPending] = useState([])
  const [reviewed, setReviewed] = useState([])
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [record, setRecord] = useState(null)
  const [comments, setComments] = useState('')
  const [decision, setDecision] = useState('forward')
  const [returnTo, setReturnTo] = useState('FACULTY')
  const [instructions, setInstructions] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [detailError, setDetailError] = useState('')
  const [sourceErrors, setSourceErrors] = useState([])
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [retry, setRetry] = useState(0)
  const [detailRetry, setDetailRetry] = useState(0)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [listPage,setListPage] = useState(1)
  useEffect(()=>{setListPage(1)},[tab,search,year])
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    setListLoading(true)
    Promise.allSettled([getPendingReviews(controller.signal), getReviewedApplications(controller.signal)])
      .then(results => {
        if (controller.signal.aborted) return
        const nextErrors = {}
        if (results[0].status === 'fulfilled') setPending(results[0].value)
        else nextErrors.pending = results[0].reason.message
        if (results[1].status === 'fulfilled') setReviewed(results[1].value)
        else nextErrors.reviewed = results[1].reason.message
        setErrors(nextErrors); setListLoading(false)
      })
    return () => controller.abort()
  }, [retry])
  useEffect(() => {
    if (!selected) { setRecord(null); return }
    const controller = new AbortController()
    setDetailLoading(true); setDetailError(''); setSourceErrors([]); setActionError(''); setRecord(null)
    async function load() {
      try {
        const details = await getReviewDetails(selected.appraisalId, controller.signal)
        const kinds = ['profile', 'teaching', 'projects', 'phd', 'research']
        const results = await Promise.allSettled(kinds.map(kind => getReviewSource(selected.appraisalId, kind, controller.signal)))
        if (controller.signal.aborted) return
        const problems = results.flatMap((item, index) => item.status === 'rejected' ? [`${kinds[index]}: ${item.reason.message}`] : [])
        const data = Object.fromEntries(results.map((item, index) => [kinds[index], item.status === 'fulfilled' ? item.value.data : null]))
        const rows = details.formData.rows || {}
        setSourceErrors(problems)
        setRecord({
          ...details, form: {
            ...(data.profile || { name: details.applicant.name, employeeId: details.applicant.employeeId, department: details.applicant.departmentName }),
            ...details.formData,
            period: `${date(details.period.reportingFrom)} – ${date(details.period.reportingTo)}`,
            rows: {
              ...rows, teaching: data.teaching || [],
              sponsored: data.research?.sponsored || [], consultancy: data.research?.consultancy || [],
              projects: prepareSupervision(data.projects || [], rows.projects, 'projects'),
              phd: prepareSupervision(data.phd || [], rows.phd, 'phd')
            },
          }
        })
      } catch (error) { if (!controller.signal.aborted) setDetailError(error.message) }
      finally { if (!controller.signal.aborted) setDetailLoading(false) }
    }
    load(); return () => controller.abort()
  }, [selected, detailRetry])
  useEffect(() => {
    const guard = event => { if (comments.trim() || instructions.trim()) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [comments, instructions])
  function leave(callback) {
    if (saving) return
    if ((comments.trim() || instructions.trim()) && !window.confirm('Leave without saving your review?')) return
    setComments(''); setInstructions(''); setActionError(''); callback()
  }
  function open(item) {
    setSelected(item); setComments(''); setInstructions(''); setDecision('forward'); setReturnTo('FACULTY'); setMessage(''); setActionError('')
  }
  const actionable = Boolean(selected && record && selected.mode === 'pending' &&
    record.steps.some(step => step.workflowId === selected.workflowId && step.status === 'Pending'))
  async function act() {
    if (lock.current || !actionable || (decision === 'forward' && (sourceErrors.length || !comments.trim())) || (decision === 'return' && !instructions.trim())) return
    lock.current = true; setSaving(true); setActionError('')
    try {
      await takeReviewAction(selected.appraisalId, {
        workflowId: selected.workflowId, action: decision === 'return' ? 'return' : selected.stage === 'DIRECTOR' ? 'approve' : 'recommend', comments: decision === 'return' ? '' : comments, returnTo, instructions: decision === 'return' ? instructions : '',
      })
      setMessage(decision === 'return' ? 'Application returned for correction. The return is recorded in Reviewed by Me.' : selected.stage === 'DIRECTOR' ? 'Application approved successfully.' : 'Recommendation saved. The application has moved to the next reviewer.')
      setComments(''); setInstructions(''); setSelected(null); setRecord(null); setTab('pending'); setRetry(value => value + 1)
    } catch (error) { setActionError(error.message) }
    finally { lock.current = false; setSaving(false) }
  }
  const rows = tab === 'pending' ? pending : reviewed
  const matching = rows.filter(item => (!year || String(item.academicYearId) === year) &&
    [item.applicantName, item.departmentName, item.academicYear, item.status, stageLabel(item.stage)]
      .join(' ').toLowerCase().includes(search.toLowerCase().trim()))
  const pagination=paginateReviews(matching,listPage)
  const years = [...new Map([...pending, ...reviewed].map(item => [String(item.academicYearId), item.academicYear])).entries()]
  const reviewPanel = actionable ? <section className="review-decision">
    <div className="review-section-heading"><p className="review-eyebrow">{stageLabel(selected.stage)} review</p>
      <h2>Your Comments & Decision</h2><p>Your comments will be recorded with your name and action date.</p></div>
    <div className="return-decision-toggle" role="group" aria-label="Review decision">
      <button type="button" aria-pressed={decision === 'forward'} disabled={saving} onClick={() => setDecision('forward')}>{selected.stage === 'DIRECTOR' ? 'Approve' : 'Recommend and Forward'}</button>
      {/* Temporarily hidden<button type="button" aria-pressed={decision==='return'} disabled={saving} onClick={()=>setDecision('return')}>Return for Correction</button>*/}
    </div>
    {decision === 'return' && <div className="return-fields">
      <label htmlFor="return-recipient">Return to</label>
      <select id="return-recipient" disabled={saving} value={returnTo} onChange={event => setReturnTo(event.target.value)}>
        <option value="FACULTY">Faculty applicant</option>
        {['DEAN_FW', 'DIRECTOR'].includes(selected.stage) && <option value="HOD">Department HOD</option>}
        {selected.stage === 'DIRECTOR' && <option value="DEAN_FW">Dean FW</option>}
      </select>
      <label htmlFor="return-instructions">Return comments <span aria-hidden="true">*</span></label>
      <textarea id="return-instructions" rows={7} disabled={saving} required value={instructions}
        onChange={event => setInstructions(event.target.value)} placeholder="Explain the corrections required…" />
      <p className="review-return-note">{returnTo === 'FACULTY'
        ? 'The applicant will see these instructions. After editing and resubmission, review starts again with the HOD.'
        : 'The selected reviewer will review again, followed by the remaining stages in order.'}</p>
    </div>}
    {decision === 'forward' && <>
      <label htmlFor="review-comments">Private reviewer comments *</label>
      <textarea id="review-comments" rows={12} value={comments} disabled={saving}
        onChange={event => setComments(event.target.value)} placeholder="Enter your detailed assessment and recommendation…" required />
      <div className="review-decision-note"><span>{comments.length.toLocaleString()} characters</span></div>
    </>}
    {actionError && <p className="review-alert" role="alert">{actionError}</p>}
    {!!sourceErrors.length && decision === 'forward' && <p className="review-alert" role="alert">Load all application details successfully before recording your decision.</p>}
    <div className="review-decision-footer">
      <p>{decision === 'return' ? 'The application will move back with your correction instructions.' : selected.stage === 'DIRECTOR' ? 'Approval completes this application.' : 'Your recommendation forwards the application to the next stage.'}</p>
      <button type="button" className="review-primary" disabled={saving || (decision === 'forward' && (!!sourceErrors.length || !comments.trim())) || (decision === 'return' && !instructions.trim())} onClick={act}>
        <CheckCircle2 size={18} />{saving ? 'Saving…' : decision === 'return' ? 'Return Application' : selected.stage === 'DIRECTOR' ? 'Approve Application' : 'Recommend and Forward'}
      </button>
    </div>
  </section> : null
  return <div className="review-workspace">
    <header className="review-portal-header portal-banner">
      <img src={`${import.meta.env.BASE_URL}iitdh-logo.png`} alt="IIT Dharwad" />
      <div><p>Faculty Welfare (FW) Section</p><strong>Faculty Annual Appraisal Portal</strong></div>
      {onBack && <button type="button" className="outline-btn" disabled={saving} onClick={() => leave(onBack)}><ArrowLeft size={16} />Back</button>}
    </header>
    <PortalNavigation page="reviews" canApply={permissions.canApply} canReview canManage={permissions.canManage}
      onNavigate={target => leave(() => target === 'reviews' ? (setSelected(null), setRetry(value => value + 1)) : onNavigate?.(target))} />
    {selected ? <div className="review-content">
      {detailError && <div className="review-alert" role="alert"><p>{detailError}</p><button type="button" className="outline-btn" onClick={() => setDetailRetry(value => value + 1)}>Retry application</button></div>}
      {!!sourceErrors.length && <div className="review-alert" role="alert"><strong>Some application details could not load.</strong><ul>{sourceErrors.map(item => <li key={item}>{item}</li>)}</ul><button type="button" className="outline-btn" onClick={() => setDetailRetry(value => value + 1)}>Retry details</button></div>}
      {detailLoading ? <p role="status" className="review-loading">Loading application details…</p> : record ?
        <ApplicationView key={selected.workflowId} embedded reviewer form={record.form}
          application={record} history={record.history} steps={record.steps} reviewPanel={reviewPanel}
          documentUrl={docId => reviewerDocumentUrl(record.appraisalId, docId)}
          onBack={() => leave(() => setSelected(null))} /> : <button type="button" className="outline-btn" onClick={() => leave(() => setSelected(null))}>Back to Review List</button>}
    </div> : <main className="review-content">
      <div className="review-page-heading"><div><h1>Forwarding, Appraisal &amp; Follow-up</h1><p>Process faculty appraisals and track your recommendations, approvals and returns.</p></div>
        <button type="button" className="outline-btn appraisal-refresh-icon" aria-label="Refresh appraisals" title="Refresh appraisals" disabled={listLoading} onClick={() => setRetry(value => value + 1)}><RefreshCw size={19} className={listLoading ? 'appraisal-refresh-spinning' : ''} /></button></div>
      {message && <div className="review-success" role="status"><CheckCircle2 size={20} /><span>{message}</span>
        <button type="button" onClick={() => { setTab('reviewed'); setSearch(''); setYear('') }}>View in Reviewed by Me <ArrowRight size={14} /></button></div>}
      <section className="review-list-card">
        <div className="review-list-tabs" role="tablist" aria-label="Review lists">
          {[['pending', 'Pending', pending.length], ['reviewed', 'Reviewed by Me', reviewed.length]].map(([id, label, count]) => <button type="button" key={id}
            role="tab" id={`review-${id}-tab`} aria-selected={tab === id} aria-controls="review-list-panel"
            onClick={() => setTab(id)}>{label}<span>{errors[id] ? '—' : count}</span></button>)}
        </div>
        <div className="review-filters"><label className="review-search"><Search size={18} /><input aria-label="Search review applications" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search faculty or department…" /></label>
          <select aria-label="Filter by academic year" value={year} onChange={event => setYear(event.target.value)}><option value="">All academic years</option>{years.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          <span>{matching.length} application{matching.length === 1 ? '' : 's'}</span>
        </div>
        <div id="review-list-panel" role="tabpanel" aria-labelledby={`review-${tab}-tab`}>
          {listLoading ? <p role="status" className="review-empty">Loading applications…</p> : errors[tab] ? <div className="review-alert" role="alert"><p>{errors[tab]}</p><button type="button" className="outline-btn" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : !matching.length ? <div className="review-empty">
            <h2>{search || year ? 'No matching applications' : tab === 'pending' ? 'You are all caught up' : 'No completed reviews yet'}</h2>
            <p>{search || year ? 'Change your search or academic year filter.' : tab === 'pending' ? 'Applications assigned to you will appear here.' : 'Applications you recommend or approve will remain here for tracking.'}</p>
          </div> : <><div className="review-table-scroll"><table className="review-list-table">
            <thead><tr><th>Faculty & Department</th><th>Academic Year</th><th>Submitted On</th>
              <th>Current Status</th><th>Pending With</th><th>Action</th></tr></thead>
            <tbody>{pagination.rows.map(item => <tr key={item.workflowId}>
              <td><strong>{item.applicantName || '—'}</strong><small>{item.departmentName || '—'}</small></td>
              <td>{item.academicYear}</td><td>{workflowTime(item.submittedAt)}</td>
              <td><span className={`review-status ${item.status === 'Approved' ? 'review-status-approved' : ''}`}>{item.status}</span></td>
              <td>
                {item.status === 'Approved'
                  ? 'Completed'
                  : item.status === 'Returned to Faculty'
                    ? 'Faculty'
                    : ({
                      FACULTY: 'Faculty',
                      HOD: 'Department HOD',
                      DEAN_FW: 'Dean FW',
                      DIRECTOR: 'Director',
                    }[tab === 'pending' ? item.stage : item.pendingStage] || '—')}
              </td>
              <td><button type="button" className="review-row-button" onClick={() => open({ ...item, mode: tab })}>{tab === 'pending' ? 'Review' : 'View'}<ArrowRight size={15} /></button></td>
            </tr>)}</tbody>
          </table></div>
          {matching.length>10 && <nav className="review-pagination" aria-label={`${tab==='pending'?'Pending':'Reviewed'} applications pagination`}>
            <span>{pagination.start+1}–{Math.min(pagination.start+10,matching.length)} of {matching.length} applications</span>
            <div><button type="button" className="outline-btn" disabled={pagination.page===1} onClick={()=>setListPage(pagination.page-1)}>Previous</button>
            <span aria-live="polite">Page {pagination.page} of {pagination.pages}</span>
            <button type="button" className="outline-btn" disabled={pagination.page===pagination.pages} onClick={()=>setListPage(pagination.page+1)}>Next</button></div>
          </nav>}
          </>}
        </div>
      </section>
    </main>}
  </div>
}
