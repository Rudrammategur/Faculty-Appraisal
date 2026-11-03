import DynamicTable from './DynamicTable'
import './SupervisionTable.css'

export default function SupervisionTable({
    type,
    rows = [],
    onChange,
    loading,
    error,
    onRetry,
}) {
    const isPhd = type === 'phd'
    const safeRows = Array.isArray(rows) ? rows : []

    if (loading) {
        return <p role="status">Loading supervision details…</p>
    }

    if (error) {
        return (
            <div role="alert">
                <p>{error}</p>
                <button type="button" className="outline-btn" onClick={onRetry}>
                    Retry
                </button>
            </div>
        )
    }

    if (!safeRows.length) {
        return (
            <p style={{
                margin: 0,
                padding: '16px 20px',
                color: '#697386',
                fontSize: 13,
            }}>
                No supervision details available.
            </p>
        )
    }

    const titleCell = (row, setRow) => (
        <td>
            <textarea
                rows={2}
                maxLength={500}
                value={row.title ?? ''}
                onChange={event => setRow({ title: event.target.value })}
                placeholder="Project title"
                aria-label={`Project title for ${row.studentName}`}
                style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <small>{(row.title ?? '').length}/500</small>
        </td>
    )

    const studentCell = row => (
        <td>
            <div className="db-value-cell">
                {(isPhd ? row.student : row.students) || '—'}
            </div>
        </td>
    )

    return (
        <div className={`supervision-table ${isPhd ? 'supervision-phd' : 'supervision-projects'}`}>
            <DynamicTable
                showActions={false}
                columns={
                    isPhd
                        ? [
                            'Sl. No.',
                            'Name of Student',
                            <span>
                                Registration Year and status
                                <br />
                                (FT/PT)
                            </span>,
                            'Project Title',
                            'Status',
                            'Co-Supervisor (if any)',
                            'Remarks',
                        ]
                        : [
                            'Level',
                            'Title of Project',
                            'Name of Student',
                            'Registration Year',
                            'Status',
                            'Co-Supervisor (if any)',
                            'Remarks',
                        ]
                }
                rows={safeRows}
                onChange={onChange}
                renderRow={(row, index, setRow) => (
                    <>
                        {isPhd ? (
                            <>
                                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                {studentCell(row)}
                                <td>
                                    <div className="db-value-cell">{row.reg || '—'}</div>
                                </td>
                                {titleCell(row, setRow)}
                            </>
                        ) : (
                            <>
                                <td>
                                    <div className="db-value-cell">{row.level || '—'}</div>
                                </td>
                                {titleCell(row, setRow)}
                                {studentCell(row)}
                                <td>
                                    <div className="db-value-cell">{row.year || '—'}</div>
                                </td>
                            </>
                        )}

                        <td>
                            <select
                                value={row.status || 'Ongoing'}
                                onChange={event => setRow({ status: event.target.value })}
                                aria-label={`Supervision status for ${row.studentName}`}
                            >
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </td>

                        <td>
                            <input
                                type="text"
                                value={(isPhd ? row.co : row.cosupervisor) ?? ''}
                                onChange={event =>
                                    setRow({
                                        [isPhd ? 'co' : 'cosupervisor']: event.target.value,
                                    })
                                }
                                placeholder="If any"
                                aria-label={`Co-supervisor for ${row.studentName}`}
                            />
                        </td>

                        <td>
                            <textarea
                                rows={2}
                                value={row.remarks ?? ''}
                                onChange={event => setRow({ remarks: event.target.value })}
                                placeholder="Remarks"
                                aria-label={`Remarks for ${row.studentName}`}
                            />
                        </td>
                    </>
                )}
            />
        </div>
    )
}