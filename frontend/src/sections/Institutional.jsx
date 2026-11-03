import { publicationFields } from '../utils/publicationCompleteness'
import '../styles/publication-completion.css'
import { useDocumentPreparation } from '../components/common/MappedDocuments'
import { Building2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import DynamicTable from '../components/common/DynamicTable'
import RowDocumentUpload from '../components/common/RowDocumentUpload'

export default function Institutional({ form, updateRows }) {
  const gridHeaders=(group,labels)=>{
    const started=(form.rows?.[group] || []).some(row=>Object.keys(publicationFields[group].fields).some(field=>String(row[field] ?? '').trim()))
    return labels.map((label,index)=><span key={index}>{label}{started && index>0 && index<labels.length-1 && <span className="publication-required-marker" aria-hidden="true"> *</span>}</span>)
  }
  const documents = useDocumentPreparation()
  function renderTable(key, title) {
    return <SectionCard title={title}>
      <DynamicTable
        columns={gridHeaders(key,['Sl. No.', 'Responsibility', 'Activities Performed', 'From', 'To', 'Supporting Document (optional)'])}
        rows={form.rows?.[key]?.length ? form.rows[key] : [{}]}
        onChange={rows => updateRows(key, rows)}
        renderRow={(row, index, setRow) => <>
          <td className="phd-serial">{index + 1}</td>
          <td><input type="text" value={row.responsibility ?? row.role ?? ''} maxLength={500} onChange={event => setRow({ responsibility: event.target.value })} placeholder="Enter responsibility" /></td>
          <td><textarea rows={2} maxLength={1000} value={row.activities ?? ''} onChange={event => setRow({ activities: event.target.value })} placeholder="Enter activities performed" /></td>
          <td><input type="date" value={row.fromDate ?? ''} max={row.toDate || undefined} onChange={event => setRow({ fromDate: event.target.value })} aria-label="From date" /></td>
          <td><input type="date" value={row.toDate ?? ''} min={row.fromDate || undefined} onChange={event => setRow({ toDate: event.target.value })} aria-label="To date" /></td>
          <td><RowDocumentUpload
            key={`document-${index}`}
            onPrepare={() => documents.onPrepare(key, index)}
            onActivity={documents?.onActivity}
            responsibilityId={row.id}
            hasSupportingDocument={Boolean(row.hasSupportingDocument)}
            onSaved={(hasSupportingDocument, id) => documents.onResponsibilitySaved(key, id, hasSupportingDocument)}
          /></td>
        </>}
      />
    </SectionCard>
  }
  return <>
    <PageHeader title="IV. MANAGEMENT & INSTITUTIONAL DEVELOPMENT ELEMENTS" icon={Building2} />
    <p className="section-description">Incharge of laboratory/facility/group, chairmanship and memberships of committees, involvement in student services, Institute community and administrative assignments.</p>
    {renderTable('departmentLevels', "a) Dept./Centres' Levels")}
    {renderTable('instituteLevels', 'b) Institute Levels')}
  </>
}
