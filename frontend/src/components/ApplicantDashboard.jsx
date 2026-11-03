import { useState } from 'react'
import { paginateApplications } from '../utils/appraisalPagination'
import '../styles/form-dashboard-cleanup.css'
import { RefreshCw } from 'lucide-react'
import { workflowTime } from './WorkflowSummary'
import '../styles/dashboard-actions.css'
const periodFor = item => item.reportingFrom && item.reportingTo
    ? `${item.reportingFrom.split('-').reverse().join('.')} – ${item.reportingTo.split('-').reverse().join('.')}` : item.academicYear || '—'
export default function ApplicantDashboard({
    period, hasApplication, application = null, canStart = true, windowNote = '', onOpen,
    applications = [], listLoading = false, listError = '', onRefresh, onOpenApplication, onCurrentCycle,
}) {
    const [page, setPage] = useState(1)
    const rows = [...applications]
    if (application?.appraisalId && !rows.some(item => item.appraisalId === application.appraisalId)) rows.unshift({ ...application, displayPeriod: period })
    if (hasApplication && !application) rows.unshift({ appraisalId: '', status: 'Draft', displayPeriod: period })
    const pagination = paginateApplications(rows, page)
    return <main className="applicant-dashboard">
        <div className="dashboard-heading"><div><h1>My Appraisals</h1></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{onCurrentCycle && <button type="button" className="outline-btn" onClick={onCurrentCycle}>Current Cycle</button>}<button type="button" className="outline-btn appraisal-refresh-icon" onClick={onRefresh} disabled={listLoading} aria-label="Refresh appraisals" title="Refresh appraisals"><RefreshCw size={19} className={listLoading ? 'appraisal-refresh-spinning' : ''} /></button>
                {!hasApplication && <button type="button" className="outline-btn" disabled={!canStart} onClick={onOpen}>Start Appraisal</button>}</div>
        </div>
        {windowNote && <p role="status">{windowNote}</p>}
        <section className="dashboard-card">
            <div className="dashboard-card-heading"><h2>My Applications</h2></div>
            {listError ? <div role="alert"><p>{listError}</p><button type="button" className="outline-btn" onClick={onRefresh}>Retry</button></div> : listLoading ? <p role="status">Loading applications…</p> : rows.length ? <div className="dashboard-table-scroll"><table className="dashboard-table">
                <thead><tr>{['Academic Year / Period', 'Submitted On', 'Status', 'Pending With', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>{pagination.rows.map(item => {
                    const returned = item.status === 'Returned to Faculty'
                    const draft = item.status === 'Draft'
                    return <tr key={item.appraisalId}>
                        <td>{item.displayPeriod || periodFor(item)}</td><td>{workflowTime(item.submittedAt)}</td><td><span className="dashboard-status">{item.status}</span></td>
                        <td>
                            {returned || draft
                                ? 'Faculty'
                                : item.status === 'Approved'
                                    ? 'Completed'
                                    : ({
                                        FACULTY: 'Faculty',
                                        HOD: 'HOD',
                                        DEAN_FW: 'Dean FW',
                                        DIRECTOR: 'Director',
                                    }[item.pendingStage] || '—')}
                        </td>
                        <td><button type="button" className="outline-btn" onClick={() => item.appraisalId ? onOpenApplication?.(item) : onOpen?.()}>{returned ? 'Edit & Resubmit' : draft ? 'Continue' : 'View'}</button></td>
                    </tr>
                })}</tbody>
            </table></div> : <div className="dashboard-empty"><p>You have not started any appraisals yet.</p><span>Click Start Appraisal to begin.</span></div>}
            {!listLoading && !listError && rows.length > 10 && <nav className="appraisal-pagination" aria-label="My applications pagination">
                <span>{pagination.start + 1}–{Math.min(pagination.start + 10, rows.length)} of {rows.length} applications</span>
                <div><button type="button" className="outline-btn" disabled={pagination.page === 1} onClick={() => setPage(pagination.page - 1)}>Previous</button>
                    <span aria-live="polite">Page {pagination.page} of {pagination.pages}</span>
                    <button type="button" className="outline-btn" disabled={pagination.page === pagination.pages} onClick={() => setPage(pagination.page + 1)}>Next</button></div>
            </nav>}
        </section>
    </main>
}
