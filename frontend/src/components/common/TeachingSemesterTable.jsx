import { Fragment } from 'react'
import { ExternalLink } from 'lucide-react'
import DynamicTable from './DynamicTable'
import './TeachingSemesterTable.css'

const headings = ['Course Type', 'Course Code & Title', 'L, T, P, C', 'No. of Students Evaluated', 'Feedback']
function level(row) {
  const value = String(row.ugpgLevel ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (['UG', 'UNDERGRADUATE'].includes(value)) return 'UG'
  if (['PG', 'POSTGRADUATE', 'PREPHD', 'PREPHDCOURSE', 'PGINCLUDINGPREPHDCOURSE'].includes(value)) return 'PG'
  return 'OTHER'
}
function semester(row) {
  const period = String(row.academicPeriodName ?? '').trim()
  if (/^Autumn\b/i.test(period)) return 1
  if (/^Spring\b/i.test(period)) return 2
  return null
}
function Cells({ row, divider = false, empty = false }) {
  if (!row) return <td className={divider ? 'ts-divider ts-empty' : 'ts-empty'} colSpan={5}>{empty ? 'No courses found' : '—'}</td>
  return <>
    <td className={divider ? 'ts-divider ts-center' : 'ts-center'}>{row.courseType || '—'}</td>
    <td className="ts-course">{row.courseCode ? <><strong>{row.courseCode}</strong><span>{row.courseName}</span></> : row.course || '—'}</td>
    <td className="ts-center">{row.ltpc ?? [row.l, row.t, row.p, row.c].map(v => v ?? '—').join(', ')}</td>
    <td className="ts-center">{row.registeredStudents ?? '—'}</td>
    <td className="ts-center">{row.feedbackUrl ? <a className="feedback-link" href={row.feedbackUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open feedback for ${row.course || row.courseCode}`} title="Open course feedback"><ExternalLink size={18} /></a> : '—'}</td>
  </>
}
export default function TeachingSemesterTable({ rows = [] }) {
  console.table(
    rows.map(row => ({
      period: row.academicPeriodName,
      course: row.courseCode,
      type: row.courseType,
      segment: row.segment,
      timetable: row.timeTableId,
    }))
  )
  const groups = [['UG', 'UG'], ['PG', 'P.G. (including Pre-Ph.D. Course)']]
  if (rows.some(r => level(r) === 'OTHER' && semester(r))) groups.push(['OTHER', 'Unclassified level'])
  const unmatched = rows.filter(r => !semester(r))
  const title = (order, fallback) => [...new Set(rows.filter(r => semester(r) === order).map(r => r.academicPeriodName))].join(' / ') || fallback
  const body = groups.map(([key, label]) => {
    const autumnRows = rows.filter(
      row => level(row) === key &&
        /^Autumn\b/i.test(
          String(row.academicPeriodName ?? '').trim()
        )
    )

    const springRows = rows.filter(
      row => level(row) === key &&
        /^Spring\b/i.test(
          String(row.academicPeriodName ?? '').trim()
        )
    )

    const count = Math.max(
      autumnRows.length,
      springRows.length,
      1
    )

    return Array.from({ length: count }, (_, index) => (
      <tr key={`${key}-${index}`}>
        {index === 0 && (
          <th
            className="ts-level"
            rowSpan={count}
            scope="row"
          >
            {label}
          </th>
        )}

        {/* Left: I Semester — Autumn */}
        <Cells
          row={autumnRows[index]}
          empty={autumnRows.length === 0 && index === 0}
        />

        {/* Right: II Semester — Spring */}
        <Cells
          row={springRows[index]}
          divider
          empty={springRows.length === 0 && index === 0}
        />
      </tr>
    ))
  })
  return <>
    <DynamicTable className="teaching-semester-table" showActions={false}
      colGroup={
        <colgroup>
          <col style={{ width: '12%' }} />

          {[1, 2].map(n => (
            <Fragment key={n}>
              <col style={{ width: '6%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '5%' }} />
            </Fragment>
          ))}
        </colgroup>
      }
      headerRows={<><tr><th rowSpan={2} scope="col">Level</th><th colSpan={5} scope="colgroup">Semester I — {title(1, 'Autumn')}</th><th colSpan={5} scope="colgroup" className="ts-divider">Semester II — {title(2, 'Spring')}</th></tr><tr>{[1, 2].map(n => headings.map((text, i) => <th key={`${n}-${i}`} scope="col" className={n === 2 && i === 0 ? 'ts-divider' : ''}>{text}</th>))}</tr></>}
      bodyRows={body} />
    {unmatched.length > 0 && <div className="ts-unclassified"><strong>Other periods — classification needs verification</strong><ul>{unmatched.map((r, i) => <li key={i}>{r.course || `${r.courseCode} — ${r.courseName}`} · {r.academicPeriodName || 'Period unavailable'} · {r.ugpgLevel || 'Level unavailable'} · LTPC: {r.ltpc || '—'} · Students: {r.registeredStudents ?? '—'} {r.feedbackUrl && <a href={r.feedbackUrl} target="_blank" rel="noopener noreferrer">Feedback</a>}</li>)}</ul></div>}
  </>
}
