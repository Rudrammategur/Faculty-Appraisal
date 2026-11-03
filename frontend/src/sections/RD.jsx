import { publicationFields } from '../utils/publicationCompleteness'
import '../styles/publication-completion.css'
import MappedDocumentUpload from '../components/common/MappedDocuments'
import { BriefcaseBusiness } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import DynamicTable from '../components/common/DynamicTable'
import './RD.css'

function ActivityField({ value, onChange, label, maxLength = 1000, placeholder = 'Enter details, if any…' }) {
  return <div className="instructional-textarea">
    <label>{label}<textarea rows={4} maxLength={maxLength} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>
    <div className="textarea-meta"><span>Maximum {maxLength} characters</span><span>{(value || '').length}/{maxLength}</span></div>
  </div>
}
const display = value => value === '' || value === undefined || value === null ? '—' : String(value)

function ProjectList({ rows, consultancy, loading, error, onRetry }) {
  if (loading) return <p role="status">Loading project details…</p>
  if (error) return <div role="alert"><p>{error}</p><button type="button" className="outline-btn" onClick={onRetry}>Retry</button></div>
  if (!rows.length) return <p className="section-description">No {consultancy ? 'consultancy' : 'sponsored research'} projects found for this faculty in the appraisal period.</p>
  const headings = ['Sl. No.', 'Project Code & Title', consultancy ? 'Client' : 'Funding Agency', consultancy ? 'Total Amount' : 'Financial Outlay', 'Start Date & Duration', 'Principal Investigator', 'Status']
  return <div className="rd-project-scroll">
    <table className="rd-project-table">
      <caption className="rd-visually-hidden">{consultancy ? 'Consultancy projects' : 'Sponsored research projects'}</caption>
      <colgroup>{[4, 24, 16, 11, 14, 16, 15].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr>{headings.map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.sourceProjectId || index}>
        <td className="rd-project-number">{index + 1}</td>
        <td><strong className="rd-project-code">{display(row.projectCode)}</strong><div>{display(row.title)}</div></td>
        <td>{display(consultancy ? row.client : row.agency)}</td>
        <td>{display(row.amount)}</td>
        <td>{display(row.period)}</td>
        <td>{display(row.people)}</td>
        <td><span className="rd-project-status">{display(row.status)}</span></td>
      </tr>)}</tbody>
    </table>
  </div>
}

export default function RD({ form, update, updateRows, projectsLoading = false, projectsError = '', projectWarnings = [], onRetryProjects }) {
  const gridHeaders=(group,labels)=>{
    const started=(form.rows?.[group] || []).some(row=>Object.keys(publicationFields[group].fields).some(field=>String(row[field] ?? '').trim()))
    return labels.map((label,index)=><span key={index}>{label}{started && index>0 && index<labels.length-1 && <span className="publication-required-marker" aria-hidden="true"> *</span>}</span>)
  }
  const input = (row, setRow, key, maxLength, placeholder) => <input value={row[key] ?? ''} maxLength={maxLength} placeholder={placeholder} onChange={event => setRow({ [key]: event.target.value })} />
  return <>
    <PageHeader title="III. SPONSORED R&D, CONSULTANCY & EXTENSION PROJECTS" icon={BriefcaseBusiness} />
    {projectWarnings.length > 0 && <div role="status" className="section-description">{projectWarnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
    <p className="section-description">Project details are fetched from ERP and are read-only. CSR projects are excluded pending FW confirmation. Enter overall remarks below each project list.</p>
    <SectionCard title="a(i) Sponsored Research Projects">
      <ProjectList rows={Array.isArray(form.rows?.sponsored) ? form.rows.sponsored : []} loading={projectsLoading} error={projectsError} onRetry={onRetryProjects} />
      {!projectsLoading && !projectsError && form.rows?.sponsored?.length > 0 && <ActivityField maxLength={500} label="Sponsored project remarks" value={form.sponsoredProjectRemarks} onChange={value => update('sponsoredProjectRemarks', value)} />}
    </SectionCard>
    <SectionCard title="a(ii) Institute Consultancy Projects">
      <ProjectList consultancy rows={Array.isArray(form.rows?.consultancy) ? form.rows.consultancy : []} loading={projectsLoading} error={projectsError} onRetry={onRetryProjects} />
      {!projectsLoading && !projectsError && form.rows?.consultancy?.length > 0 && <ActivityField maxLength={500} label="Consultancy project remarks" value={form.consultancyProjectRemarks} onChange={value => update('consultancyProjectRemarks', value)} />}
    </SectionCard>
    {[
      ['a(iii) Expected Research Activity', 'expectedResearch'],
      ['a(iv) Expected Outreach Activity', 'expectedOutreach'],
      ['a(v) Expected Professional Activity', 'expectedProfessional'],
    ].map(([label, key]) => <SectionCard key={key} title={label}><ActivityField label={label.slice(label.indexOf(')') + 1).trim()} value={form[key]} onChange={value => update(key, value)} /><MappedDocumentUpload target={key}/></SectionCard>)}
    <SectionCard title="b) Products/Processes Development and Technology Transfer / Patent Filed/Granted" description="Give particulars with names of group numbers involved.">
      <DynamicTable
        columns={gridHeaders('technologyTransfer',['Sl. No.', 'Particulars', 'Date of Publication / Grant', 'Issued By', 'Month-Year', 'Supporting Document (optional)'])}
        rows={form.rows?.technologyTransfer?.length ? form.rows.technologyTransfer : [{}]}
        onChange={rows => updateRows('technologyTransfer', rows)}
        renderRow={(row, index, setRow) => <>
          <td>{index + 1}</td>
          <td><textarea rows={2} maxLength={10000} value={row.particulars ?? ''} onChange={event => setRow({ particulars: event.target.value })} aria-label="Product or patent particulars" /></td>
          <td><input type="date" value={row.publicationGrantDate ?? ''} onChange={event => setRow({ publicationGrantDate: event.target.value })} aria-label="Publication or grant date" /></td>
          <td>{input(row, setRow, 'issuedBy', 200, 'Issued by')}</td>
          <td><input type="month" value={row.monthYear ?? ''} onChange={event => setRow({ monthYear: event.target.value })} aria-label="Month and year" /></td>
          <td><MappedDocumentUpload target="technologyTransfer" rowId={row.id ?? null} rowIndex={index} label={false}/></td>
        </>}
      />
    </SectionCard>
    <SectionCard title="c) Continuing Education & Special Lectures">
      <DynamicTable
        columns={gridHeaders('specialLectures',['Sl. No.', 'Title of Lecture / Lecture Series', 'Date, Place and Programme', 'Other Relevant Information', 'Supporting Document (optional)'])}
        rows={form.rows?.specialLectures?.length ? form.rows.specialLectures : [{}]}
        onChange={rows => updateRows('specialLectures', rows)}
        renderRow={(row, index, setRow) => <>
          <td>{index + 1}</td>
          <td>{input(row, setRow, 'title', 500, 'Lecture title')}</td>
          <td>
            <input type="date" value={row.date ?? ''} onChange={event => setRow({ date: event.target.value })} aria-label="Lecture date" />
            {input(row, setRow, 'place', 200, 'Place')}
            {input(row, setRow, 'programme', 300, 'Programme')}
          </td>
          <td><textarea rows={2} maxLength={10000} value={row.information ?? ''} onChange={event => setRow({ information: event.target.value })} aria-label="Other relevant information" /></td>
          <td><MappedDocumentUpload target="specialLectures" rowId={row.id ?? null} rowIndex={index} label={false}/></td>
        </>}
      />
    </SectionCard>
    <SectionCard title="d) Other Extension Tasks"><ActivityField label="Other extension tasks" value={form.otherExtensionTasks} onChange={value => update('otherExtensionTasks', value)} /><MappedDocumentUpload target="otherExtensionTasks"/></SectionCard>
  </>
}
