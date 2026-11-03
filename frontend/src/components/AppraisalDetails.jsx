import MappedDocumentUpload from './common/MappedDocuments'
import { useEffect, useState } from 'react'
import TeachingSemesterTable from './common/TeachingSemesterTable'
import RowDocumentUpload from './common/RowDocumentUpload'
import '../styles/appraisal-preview-sections.css'
const TABLES = {
  "teaching": {
    "title": "a) Teaching Load",
    "columns": [
      [
        "courseType",
        "Course Type"
      ],
      [
        "course",
        "Course Code & Title"
      ],
      [
        "academicPeriodName",
        "Academic Period"
      ],
      [
        "registeredStudents",
        "Students Registered"
      ],
      [
        "studentsUGPG",
        "UG / PG Students"
      ],
      [
        "weeklyLoad",
        "Weekly LTP Load"
      ],
      [
        "feedbackUrl",
        "Feedback"
      ]
    ]
  },
  "projects": {
    "title": "b) B.Tech & M.Tech Project Supervision",
    "columns": [
      [
        "level",
        "Level"
      ],
      [
        "title",
        "Project Title"
      ],
      [
        "students",
        "Students"
      ],
      [
        "year",
        "Registration Year"
      ],
      [
        "status",
        "Status"
      ],
      [
        "cosupervisor",
        "Co-supervisor"
      ],
      [
        "remarks",
        "Remarks"
      ]
    ]
  },
  "phd": {
    "title": "a) Ph.D. Research Supervision",
    "columns": [
      [
        "student",
        "Student"
      ],
      [
        "reg",
        "Registration Year & FT/PT"
      ],
      [
        "title",
        "Project Title"
      ],
      [
        "status",
        "Status"
      ],
      [
        "co",
        "Co-supervisor"
      ],
      [
        "remarks",
        "Remarks"
      ]
    ]
  },
  "journals": {
    "title": "b(i) Refereed Journal Papers",
    "columns": [
      [
        "authors",
        "Authors"
      ],
      [
        "title",
        "Paper Title"
      ],
      [
        "venue",
        "Journal"
      ],
      [
        "volume",
        "Volume"
      ],
      [
        "year",
        "Year"
      ],
      [
        "pages",
        "Pages"
      ]
    ]
  },
  "conferences": {
    "title": "b(ii) Refereed Conference Papers",
    "columns": [
      [
        "authors",
        "Authors"
      ],
      [
        "title",
        "Paper Title"
      ],
      [
        "venue",
        "Conference"
      ],
      [
        "place",
        "Place"
      ],
      [
        "year",
        "Year"
      ],
      [
        "pages",
        "Pages"
      ]
    ]
  },
  "books": {
    "title": "b(iii) Books, Monographs — Authored / Edited",
    "columns": [
      [
        "title",
        "Title"
      ],
      [
        "publisher",
        "Publisher & Year"
      ],
      [
        "authors",
        "Authors"
      ],
      [
        "remarks",
        "Authored / Edited"
      ]
    ]
  },
  "reports": {
    "title": "b(iv) Technical Reports (External & Internal)",
    "columns": [
      [
        "title",
        "Report Title"
      ],
      [
        "particulars",
        "Particulars"
      ],
      [
        "authors",
        "Authors"
      ],
      [
        "remarks",
        "External / Internal"
      ]
    ]
  },
  "awards": {
    "title": "b(v) Awards, Prizes and Medals",
    "columns": [
      [
        "name",
        "Award"
      ],
      [
        "issuer",
        "Issued By"
      ],
      [
        "place",
        "Place"
      ],
      [
        "month",
        "Month / Year"
      ],
      [
        "evidence",
        "Supporting Document"
      ]
    ]
  },
  "sponsored": {
    "title": "a(i) Sponsored Research Projects",
    "columns": [
      [
        "projectCode",
        "Project Code"
      ],
      [
        "title",
        "Project Title"
      ],
      [
        "agency",
        "Funding Agency"
      ],
      [
        "amount",
        "Financial Outlay"
      ],
      [
        "period",
        "Start & Duration"
      ],
      [
        "people",
        "Principal Investigator"
      ],
      [
        "status",
        "Status"
      ]
    ]
  },
  "consultancy": {
    "title": "a(ii) Institute Consultancy Projects",
    "columns": [
      [
        "projectCode",
        "Project Code"
      ],
      [
        "title",
        "Project Title"
      ],
      [
        "client",
        "Client"
      ],
      [
        "amount",
        "Total Amount"
      ],
      [
        "period",
        "Start & Duration"
      ],
      [
        "people",
        "Principal Investigator"
      ],
      [
        "status",
        "Status"
      ]
    ]
  },
  "technologyTransfer": {
    "title": "b) Products / Processes / Technology Transfer / Patents",
    "columns": [
      [
        "particulars",
        "Particulars"
      ],
      [
        "publicationGrantDate",
        "Publication / Grant Date"
      ],
      [
        "issuedBy",
        "Issued By"
      ],
      [
        "monthYear",
        "Month / Year"
      ]
    ]
  },
  "specialLectures": {
    "title": "c) Continuing Education & Special Lectures",
    "columns": [
      [
        "title",
        "Lecture Title"
      ],
      [
        "date",
        "Date"
      ],
      [
        "place",
        "Place"
      ],
      [
        "programme",
        "Programme"
      ],
      [
        "information",
        "Other Information"
      ]
    ]
  },
  "departmentLevels": {
    "title": "a) Department / Centre Levels",
    "columns": [
      [
        "responsibility",
        "Responsibility"
      ],
      [
        "activities",
        "Activities Performed"
      ],
      [
        "fromDate",
        "From"
      ],
      [
        "toDate",
        "To"
      ],
      [
        "supportingDocument",
        "Supporting Document"
      ]
    ]
  },
  "instituteLevels": {
    "title": "b) Institute Levels",
    "columns": [
      [
        "responsibility",
        "Responsibility"
      ],
      [
        "activities",
        "Activities Performed"
      ],
      [
        "fromDate",
        "From"
      ],
      [
        "toDate",
        "To"
      ],
      [
        "supportingDocument",
        "Supporting Document"
      ]
    ]
  }
}
const SECTIONS = [[
  'instructional',
  'I. Instructional Element',
  ['teaching', 'projects'],
  [
    ['courseParticulars', 'Course Particulars'],
    ['teachingInnovations', 'Teaching Innovations'],
    ['otherInstructional', 'Other Instructional Tasks'],
  ],
], ["research", "II. Academic Research & Publication", ["phd", "journals", "conferences", "books", "reports", "awards"], []], ["rd", "III. Sponsored R&D, Consultancy & Extension", ["sponsored", "consultancy", "technologyTransfer", "specialLectures"], [["sponsoredProjectRemarks", "Sponsored Project Remarks"], ["consultancyProjectRemarks", "Consultancy Project Remarks"], ["expectedResearch", "Expected Research Activity"], ["expectedOutreach", "Expected Outreach Activity"], ["expectedProfessional", "Expected Professional Activity"], ["otherExtensionTasks", "Other Extension Tasks"]]], ["institutional", "IV. Management & Institutional Development", ["departmentLevels", "instituteLevels"], []], ["self", "V. Miscellaneous Including Self Appraisal", [], [["otherWork", "Other Work"], ["selfAppraisal", "Self Appraisal"]]], ["futureWork", "VI. Comments / Suggestions", [], [["futureWork", "Comments / Suggestions"]]], ["otherDepartmentWork", "VII. Separate Summary of Work in Other Dept./Centre", [], [["otherDepartmentWork", "Summary of Work"]]]]

const filled = value => value !== null && value !== undefined &&
  (typeof value === 'object' ? Boolean(value.name || value.originalName) : String(value).trim() !== '')
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '—'
function safeUrl(value) {
  if (typeof value !== 'string') return ''
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
export function DocumentLink({ file }) {
  const [localUrl, setLocalUrl] = useState('')
  useEffect(() => {
    if (!(file instanceof Blob)) { setLocalUrl(''); return }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  if (!file) return <span>—</span>
  const name = file.name || file.originalName || 'Supporting document'
  const href = file instanceof Blob ? localUrl : safeUrl(file.downloadUrl)
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{name}</a> : <span>{name}</span>
}
function EntryTable({ tableKey, rows, documentUrl }) {
  if (tableKey === 'teaching') {
    const teachingRows = (Array.isArray(rows) ? rows : [])
      .filter(row => row && (row.courseCode || row.course))

    return (
      <div className="av-group">
        <h3>{TABLES.teaching.title}</h3>

        {teachingRows.length > 0 ? (
          <TeachingSemesterTable rows={teachingRows} />
        ) : (
          <p className="av-muted">No teaching records available.</p>
        )}
      </div>
    )
  }
  const { title, columns:baseColumns } = TABLES[tableKey]
  const publication=['journals','conferences','books','reports','awards','technologyTransfer','specialLectures'].includes(tableKey)
  const columns=publication?[...baseColumns.filter(([field])=>!['evidence','supportingDocument'].includes(field)),['mappedDocument','Supporting Document']]:baseColumns
  const responsibilityTable = ['departmentLevels', 'instituteLevels'].includes(tableKey)
  const visible = (Array.isArray(rows) ? rows : []).filter(row => row && (
    columns.some(([key]) => filled(row[key])) ||
    (publication && row.id) || (responsibilityTable && row.id && row.hasSupportingDocument)
  ))
  return <div className="av-group"><h3>{title}</h3>
    {tableKey === 'phd' && <p className="av-muted">FT = Full Time · PT = Part Time</p>}
    {!visible.length ? <p className="av-muted">No entries provided.</p> :
      <div className="av-table-scroll"><table><thead><tr><th>Sl. No.</th>{columns.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
        <tbody>{visible.map((row, index) => <tr key={index}><td>{index + 1}</td>{columns.map(([key]) => <td key={key}>
          {publication && key === 'mappedDocument' ? <MappedDocumentUpload target={tableKey} rowId={row.id} label={false}/> : responsibilityTable && key === 'supportingDocument' && row.id && row.hasSupportingDocument
            ? <RowDocumentUpload responsibilityId={row.id} hasSupportingDocument readOnly viewUrl={documentUrl?.(row.id)} />
            : ['supportingDocument', 'evidence'].includes(key) ? <DocumentLink file={row[key]} /> : key === 'feedbackUrl' ? (safeUrl(row[key]) ? <a href={safeUrl(row[key])} target="_blank" rel="noopener noreferrer">Course feedback</a> : '—') : (filled(row[key]) ? text(row[key]) : '—')}
        </td>)}</tr>)}</tbody></table></div>}
  </div>
}
function Narrative({ form, field, label }) {
  return <div className="av-group"><h3>{label}</h3><p className="av-response">{filled(form[field]) ? text(form[field]) : 'No details provided.'}</p><MappedDocumentUpload target={field} preview/></div>
}

function ProjectPreview({ form, tableKey, remarksKey }) {
  const rows = form.rows?.[tableKey]
  const hasProjects = Array.isArray(rows) && rows.some(row => row && (filled(row.title) || filled(row.projectCode)))
  return <>
    <EntryTable tableKey={tableKey} rows={rows} />
    {hasProjects && <div className="av-group" style={{ marginTop: 8 }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 'inherit' }}>Remarks</h4>
      <p className="av-response">{filled(form[remarksKey]) ? text(form[remarksKey]) : 'No remarks provided.'}</p>
    </div>}
  </>
}

function SectionContent({ id, tables, fields, form, documentUrl }) {
  if (id === 'rd') return <>
    <ProjectPreview form={form} tableKey="sponsored" remarksKey="sponsoredProjectRemarks" />
    <ProjectPreview form={form} tableKey="consultancy" remarksKey="consultancyProjectRemarks" />
    <Narrative form={form} field="expectedResearch" label="a(iii) Expected Research Activity" />
    <Narrative form={form} field="expectedOutreach" label="a(iv) Expected Outreach Activity" />
    <Narrative form={form} field="expectedProfessional" label="a(v) Expected Professional Activity" />
    <EntryTable tableKey="technologyTransfer" rows={form.rows?.technologyTransfer} />
    <EntryTable tableKey="specialLectures" rows={form.rows?.specialLectures} />
    <Narrative form={form} field="otherExtensionTasks" label="d) Other Extension Tasks" />
  </>
  if (id === 'instructional') return <>
    <EntryTable tableKey="teaching" rows={form.rows?.teaching} />
    <Narrative form={form} field="courseParticulars" label="Course Particulars" />
    <Narrative form={form} field="teachingInnovations" label="Innovations, if any" />
    <EntryTable tableKey="projects" rows={form.rows?.projects} />
    <Narrative form={form} field="otherInstructional" label="c) Other Instructional Tasks" />
  </>
  return <>
    {tables.map(key => <EntryTable key={key} tableKey={key} rows={form.rows?.[key]} documentUrl={documentUrl} />)}
    {fields.map(([key, label]) => <Narrative key={key} form={form} field={key} label={label} />)}
  </>
}

export default function AppraisalDetails({ form = {}, collapsible = false, documentUrl }) {
  const [expanded, setExpanded] = useState(['instructional'])
  const toggle = id => setExpanded(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])
  return <>
    <section className="av-section"><h2>Faculty Details</h2><dl className="av-profile">
      {[['name', 'Name'], ['employeeId', 'Employee ID'], ['designation', 'Designation'], ['department', 'Department']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{form[key] || '—'}</dd></div>)}
    </dl></section>
    {SECTIONS.map(([id, title, tables, fields]) => {
      const source = id==='instructional'?form.documents?.[id]:null
      const documents = Array.isArray(source) ? source : source ? [source] : []
      const opened = !collapsible || expanded.includes(id)
      return <section className={`av-section ${collapsible ? 'av-fold-section' : ''}`} key={id}>
        <h2>{collapsible ? <button
          type="button"
          id={`preview-heading-${id}`}
          className="av-section-toggle"
          aria-expanded={opened}
          aria-controls={`preview-section-${id}`}
          onClick={() => toggle(id)}
        ><span>{title}</span><span className="av-section-chevron" aria-hidden="true">{opened ? '−' : '+'}</span></button> : title}</h2>
        <div id={`preview-section-${id}`} className="av-section-body" hidden={!opened} aria-labelledby={collapsible ? `preview-heading-${id}` : undefined}>
          <SectionContent id={id} tables={tables} fields={fields} form={form} documentUrl={documentUrl} />
          {documents.length > 0 && <div className="av-group"><h3>Supporting Documents</h3><ul>{documents.map((file, i) => <li key={i}><DocumentLink file={file} /></li>)}</ul></div>}
        </div>
      </section>
    })}
  </>
}
