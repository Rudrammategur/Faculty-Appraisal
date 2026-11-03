import { useState } from 'react'
import './review-compact.css'
import SectionDocument from '../components/common/SectionDocument'
import TeachingSemesterTable from '../components/common/TeachingSemesterTable'

const isFilled = (v) => v !== null && v !== undefined && String(v).trim() !== ''

const cleanRows = (rows) => (Array.isArray(rows) ? rows : []).filter(row =>
  row && Object.entries(row).some(([key, value]) =>
    !['id', 'slNo', 'serial', 'period'].includes(key) && isFilled(value) &&
    !['From DB', 'Select', 'Select status'].includes(String(value))
  )
)

const rowGroups = [
  ['Teaching Load', 'teaching'], ['B.Tech / M.Tech Project Supervision', 'projects'],
  ['Ph.D. Research Supervision', 'phd'], ['Refereed Journal Papers', 'journals'],
  ['Refereed Conference Papers', 'conferences'], ['Books / Manuals', 'books'],
  ['Technical Reports', 'reports'], ['Awards / Prizes / Medals', 'awards'],
  ['Sponsored Research Projects', 'sponsored'], ['Institute Consultancy Projects', 'consultancy'],
  ['Continuing Education & Special Lectures', 'lectures'],
  ['Department / Centre Levels', 'departmentLevels', 'deptRoles'],
  ['Institute Levels', 'instituteLevels', 'instituteRoles'],
  ['Products / Processes / Patents', 'patents'],
]

const fields = {
  profile: [
    ['Name of the Faculty', 'name'],
    ['Employee ID', 'employeeId'],
    ['Designation', 'designation'],
    ['Department / Centre / Programme / School', 'department'],
  ],
  instructional: [
    ['Course particulars', 'courseParticulars'],
    ['Innovations, if any', 'teachingInnovations'],
    ['Other Instructional Tasks', 'otherInstructional'],
  ],
  rd: [['Expected Research Activity', 'expectedResearch'], ['Expected Outreach Activity', 'expectedOutreach'], ['Expected Professional Activity', 'expectedProfessional'], ['Other Extension Tasks', 'otherExtensionTasks']],
  self: [['Other Work', 'otherWork'], ['Self Appraisal', 'selfAppraisal']],
  future: [['Comments / Suggestions', 'futureWork']],
  otherDepartmentWork: [
    ['Summary of Work in Other Dept./Centre', 'otherDepartmentWork'],
  ],
}

const sections = [
  { title: 'I. Instructional Element', field: 'instructional', tables: ['teaching', 'projects'] },
  { title: 'II. Academic Research & Publication', field: 'research', tables: ['phd', 'journals', 'conferences', 'books', 'reports', 'awards'] },
  { title: 'III. Sponsored R&D, Consultancy & Extension', field: 'rd', tables: ['sponsored', 'consultancy', 'patents', 'lectures'] },
  { title: 'IV. Management & Institutional Development', tables: ['departmentLevels', 'instituteLevels'] },
  { title: 'V. Miscellaneous Including Self Appraisal', field: 'self' },
  { title: 'VI. Comments / Suggestions for Future Work', field: 'future' },
  {
    title: 'VII. Separate Summary of Work in Other Dept./Centre',
    field: 'otherDepartmentWork',
  },
]

const friendly = (key) => ({
  co: 'Co-supervisor', reg: 'Registration Year / Status', people: 'Investigators / Consultants',
  amount: 'Amount', title: 'Title', status: 'Status', fromDate: 'From Date',
  toDate: 'To Date', activities: 'Activities Performed', course: 'Course',
  evaluated: 'Students Evaluated', students: 'Students', load: 'Weekly LTPC Load',
  agency: 'Funding Agency', venue: 'Journal / Venue', issuer: 'Issued By',
  cosupervisor: 'Co-supervisor', month: 'Month / Year', committee: 'Committee / Lab / Facility',
})[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())

function TablePreview({ title, rows }) {
  const visible = cleanRows(rows)
  if (!visible.length) return null

  const columns = [...new Set(visible.flatMap(row => Object.keys(row).filter(k =>
    !['id', 'slNo', 'serial'].includes(k) && row[k] !== undefined &&
    (typeof row[k] === 'string' || typeof row[k] === 'number')
  )))]
  if (!columns.length) return null

  return <div className="review-group">
    <h4>{title}</h4>
    <div className="review-table-scroll"><table className="review-data-table">
      <thead><tr><th>Sl. No.</th>{columns.map(c => <th key={c}>{friendly(c)}</th>)}</tr></thead>
      <tbody>{visible.map((row, i) => <tr key={i}>
        <td>{i + 1}</td>{columns.map(c => <td key={c}>{isFilled(row[c]) ? String(row[c]) : '—'}</td>)}
      </tr>)}</tbody>
    </table></div>
  </div>
}

export default function Review({ form }) {
  const [expanded, setExpanded] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const toggle = index => setExpanded(old => old.includes(index)
    ? old.filter(x => x !== index) : [...old, index])

  const profileValues = fields.profile.filter(([, key]) => isFilled(form?.[key]))

  return <div className="review-compact">
    <h2>Review & Submit</h2>
    <div className="review-accordion">
      <div className="review-section review-profile">
        <h3 className="review-profile-heading">Faculty Basic Details</h3>
        <div className="review-panel review-profile-panel">
          {profileValues.length > 0
            ? <dl className="review-values review-profile-grid">
              {profileValues.map(([label, key]) =>
                <div className="review-value" key={key}>
                  <dt>{label}</dt><dd>{String(form[key])}</dd>
                </div>
              )}
            </dl>
            : <p className="review-empty">No details entered.</p>}
        </div>
      </div>

      {sections.map((section, index) => {
        const values = (fields[section.field] || []).filter(([, key]) => isFilled(form?.[key]))
        const tables = (section.tables || []).map(key => {
          const group = rowGroups.find(x => x[1] === key)
          const rows = form?.rows?.[key] || (group?.[2] ? form?.rows?.[group[2]] : [])
          return {
            tableKey: key,
            title: group?.[0] || friendly(key),
            rows,
          }
        }).filter(x => cleanRows(x.rows).length)
        const docKey = ['instructional', 'research', 'rd', 'institutional', 'self', 'futureWork', 'otherDepartmentWork'][index]
        const document = form?.documents?.[docKey]
        const hasContent = values.length > 0 || tables.length > 0
        const opened = expanded.includes(index)

        return <div className="review-section" key={section.title}>
          <button type="button" className="review-toggle" onClick={() => toggle(index)} aria-expanded={opened}>
            <span>{section.title}</span><span className="review-chevron">{opened ? '−' : '+'}</span>
          </button>
          {opened && <div className="review-panel">
            {!hasContent && <p className="review-empty">No details entered.</p>}
            {values.length > 0 && <dl className="review-values">{values.map(([label, key]) =>
              <div className="review-value" key={key}><dt>{label}</dt><dd>{String(form[key])}</dd></div>
            )}</dl>}
            {tables.map(table =>
              table.tableKey === 'teaching' ? (
                <div className="review-group" key={table.tableKey}>
                  <h4>{table.title}</h4>
                  <TeachingSemesterTable rows={table.rows} />
                </div>
              ) : (
                <TablePreview key={table.tableKey} {...table} />
              )
            )}
            <SectionDocument file={document} readOnly />
          </div>}
        </div>
      })}
    </div>
    <label className="review-confirm">
      <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
      {' '}I have reviewed the entered information.
    </label>
  </div>
}
