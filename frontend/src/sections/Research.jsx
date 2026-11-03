import '../styles/publication-completion.css'
import MappedDocumentUpload from '../components/common/MappedDocuments'
import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import DynamicTable from '../components/common/DynamicTable'
import SupervisionTable from '../components/common/SupervisionTable'

// Each subsection has its own data key, so entries are retained when switching sections.
const PUBLICATION_SECTIONS = [
  {
    id: 'journals',
    heading: 'b (i) Refereed Journal Papers',
    subtitle: 'Published during the report period',
    columns: ["Author’s Name (sequence as in Paper)", 'Title of the Paper', 'Name of Journal', 'Vol. No.', 'Year', 'Page Nos.'],
    fields: [
      { key: 'authors', placeholder: 'Authors in paper order' },
      { key: 'title', placeholder: 'Paper title' },
      { key: 'venue', placeholder: 'Journal name' },
      { key: 'volume', placeholder: 'Vol. No.' },
      { key: 'year', placeholder: 'YYYY', type: 'number' },
      { key: 'pages', placeholder: 'Page numbers' },
    ],
    example: 'P. Bajaj, N. K. Jha & R. A. Kumar, “Effect of Mica on the Curing Behaviour of an Amino-cured Epoxy System–Differential Scanning Calorimetric Studies”, J. Appl. Polymer Science, Vol. 40 (1990), pp. 203–212.',
  },
  {
    id: 'conferences',
    heading: 'b (ii) Refereed Conference Research Papers',
    subtitle: 'Published once during the report period',
    columns: ["Author’s Name (sequence as in Paper)", 'Title of the Paper', 'Name of Conference', 'Place', 'Year', 'Page Nos.'],
    fields: [
      { key: 'authors', placeholder: 'Authors in paper order' },
      { key: 'title', placeholder: 'Paper title' },
      { key: 'venue', placeholder: 'Conference name' },
      { key: 'place', placeholder: 'Place' },
      { key: 'year', type: 'number', placeholder: 'YYYY' },
      { key: 'pages', placeholder: 'Page numbers' },
    ],
    example: 'V. Rao & J. M. Kate, “Interface Friction Evaluation of Some Indian Geotextiles”, Proc. 4th Int. Conf. on Geotextiles, Geomembranes & Related Products, Hague (1990), p. 793.',
  },
  {
    id: 'books',
    heading: 'b(iii) Books, Monographs – Authored / Edited :',
    subtitle: 'excluding editing of conference, seminar or workshop proceedings',
    columns: ['Sl. No.', 'Title', 'Publisher Name & Year', 'Authors (publication order)', 'Remarks (Authored / Edited)'],
    fields: [
      { serial: true },
      { key: 'title', placeholder: 'Title' },
      { key: 'publisher', placeholder: 'Publisher and year' },
      { key: 'authors', placeholder: 'Authors in publication order' },
      { key: 'remarks', type: 'select', options: ['Authored', 'Edited'] },
    ],
    example: 'Enter the book/manual title, publisher with year, authors in publication order, and whether authored or edited.',
  },
  {
    id: 'reports',
    heading: 'b (iv) Technical Reports (External & Internal)',
    columns: ['Sl. No.', 'Title of Report', 'Particulars (Sponsored R&D / Consultancy / Status report)', 'Authors (report order)', 'Remarks (External / Internal)'],
    fields: [
      { serial: true },
      { key: 'title', placeholder: 'Report title' },
      { key: 'particulars', placeholder: 'Report particulars' },
      { key: 'authors', placeholder: 'Authors in report order' },
      { key: 'remarks', type: 'select', options: ['External', 'Internal'] },
    ],
    example: 'Enter the report title, type/particulars, authors in report order, and whether it is an external or internal report.',
  },
  {
    id: 'awards',
    heading: 'b (v) Awards, Prizes and Medals',
    columns: ['Sl. No.', 'Award / Prize / Medal Name', 'Issued By', 'Place', 'Month-Year'],
    fields: [
      { serial: true },
      { key: 'name', placeholder: 'Award name' },
      { key: 'issuer', placeholder: 'Issued by' },
      { key: 'place', placeholder: 'Place' },
      { key: 'month', type: 'month' },
    ],
    example: 'Enter the award name, issuing organization, place, month and year, with an optional supporting document.',
  },
]

const accordionStyle = {
  border: '1px solid #e3e4e8',
  borderRadius: 9,
  marginBottom: 10,
  overflow: 'hidden',
  background: '#fff',
}

function renderField(field, row, index, setRow, rowStarted = false) {
  const missing = rowStarted && field.key && !String(row[field.key] ?? '').trim()
  if (field.serial) return <td key="serial" style={{ textAlign: 'center' }}>{index + 1}</td>
  if (field.type === 'file') {
    return (
      <td key={field.key}>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          aria-label="Upload award evidence"
          onChange={(e) => setRow({ evidence: e.target.files?.[0] || null })}
        />
        {row.evidence?.name && <small>{row.evidence.name}</small>}
      </td>
    )
  }
  if (field.type === 'select') {
    return (
      <td key={field.key}>
        <select required={rowStarted} aria-required={rowStarted} aria-invalid={Boolean(missing)} aria-label={field.placeholder || field.key} value={row[field.key] || ''} onChange={(e) => setRow({ [field.key]: e.target.value })}>
          <option value="">Select</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </td>
    )
  }
  return (
    <td key={field.key}>
      <input
        required={rowStarted}
        aria-required={rowStarted}
        aria-invalid={Boolean(missing)}
        aria-label={field.placeholder || field.key}
        type={field.type || 'text'}
        min={field.type === 'number' ? 1900 : undefined}
        max={field.type === 'number' ? 2100 : undefined}
        step={field.type === 'number' ? 1 : undefined}
        value={row[field.key] ?? ''}
        placeholder={field.placeholder || ''}
        onChange={(e) => setRow({ [field.key]: e.target.value })}
      />
    </td>
  )
}

export default function Research({
  form,
  updateRows,
  phdLoading,
  phdError,
  onRetryPhd,
}) {
  const [expanded, setExpanded] = useState(null)

  return (
    <>
      <PageHeader title="II. ACADEMIC RESEARCH & PUBLICATION" icon={BookOpen} />

      <SectionCard
  title="a) Ph.D. Research Supervision"
  description={
  <span className="supervision-mode-note">
    FT = Full Time · PT = Part Time
  </span>
}
>
  <SupervisionTable
    type="phd"
    rows={form.rows?.phd}
    onChange={rows => updateRows('phd', rows)}
    loading={phdLoading}
    error={phdError}
    onRetry={onRetryPhd}
  />
</SectionCard>

      <SectionCard title="b) Publications">
        <div style={{ padding: '14px 18px' }}>
          <p style={{ margin: '0 0 16px', color: '#667085', fontSize: 13 }}>
            Publications are optional. Once you enter any detail in a row, complete all its text fields before submission. Supporting documents are optional.
          </p>

          {PUBLICATION_SECTIONS.map((section) => {
            const isOpen = expanded === section.id
            const hasStartedRow = (form.rows?.[section.id] || []).some(row => section.fields.some(field => field.key && String(row[field.key] ?? '').trim()))
            return (
              <div key={section.id} style={accordionStyle}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : section.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', background: isOpen ? '#f8f5fb' : '#fff', border: 0, cursor: 'pointer', color: '#252334', fontWeight: 650 }}
                >
                  <span>
                    {section.heading}
                    {section.subtitle && <small style={{ display: 'block', marginTop: 4, fontWeight: 400, color: '#667085' }}>{section.subtitle}</small>}
                  </span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #e3e4e8' }}>
                    <DynamicTable
                      columns={[...section.columns.map((label,index)=><span key={index}>{label}{hasStartedRow && section.fields[index]?.key && <span className="publication-required-marker" aria-hidden="true"> *</span>}</span>),'Supporting Document (optional)']}
                      rows={form.rows?.[section.id]?.length ? form.rows[section.id] : [{}]}
                      onChange={(rows) => updateRows(section.id, rows)}
                      renderRow={(row, index, setRow) => <>{section.fields.map((field) => renderField(field, row, index, setRow, section.fields.some(item => item.key && String(row[item.key] ?? '').trim())))}<td><MappedDocumentUpload target={section.id} rowId={row.id ?? null} rowIndex={index} label={false}/></td></>}
                    />
                    <div style={{ padding: '12px 16px', background: '#fafafa', fontSize: 12, lineHeight: 1.6, color: '#626774' }}>
                      <strong>Example / guidance: </strong>{section.example}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>
    </>
  )
}
