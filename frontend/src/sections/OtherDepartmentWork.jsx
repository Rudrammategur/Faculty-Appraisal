import MappedDocumentUpload from '../components/common/MappedDocuments'
import { Building2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'

export default function OtherDepartmentWork({ form, update }) {
  const value = form.otherDepartmentWork ?? ''

  return (
    <>
      <PageHeader
        title="VII. SEPARATE SUMMARY OF WORK IN OTHER DEPT./CENTRE"
        description="Applicable only to joint faculty and faculty in charge of similar centres."
        icon={Building2}
      />

      <div className="instructional-textarea">
        <textarea
          rows={6}
          maxLength={1000}
          value={value}
          onChange={(e) =>
            update('otherDepartmentWork', e.target.value)
          }
          placeholder="Enter details, if applicable"
          aria-label="Summary of work in other Department or Centre"
        />

        <div className="textarea-meta">
          <span>Maximum 1000 characters</span>
          <span>{value.length}/1000</span>
        </div>
      </div>
      <MappedDocumentUpload target="otherDepartmentWork"/>
    </>
  )
}