import MappedDocumentUpload from '../components/common/MappedDocuments'

import { ClipboardCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import { useState } from 'react'

// Count words
const countWords = (text = '') => {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export default function SelfAppraisal({ form, update }) {
  const [wordCount, setWordCount] = useState(
    countWords(form.otherWork || '')
  )

  const handleOtherWorkChange = (e) => {
    const value = e.target.value
    const words = countWords(value)

    if (words <= 1000) {
      update('otherWork', value)
      setWordCount(words)
    }
  }

  return (
    <>
      <PageHeader
        title="V. MISCELLANEOUS INCLUDING SELF APPRAISAL"
        icon={ClipboardCheck}
      />

      {/* a) Other Work */}

      <SectionCard title="a) Other Work (Not Included in the Form Above)">
        <div className="instructional-textarea">
          <textarea
            rows={6}
            maxLength={1000}
            value={form.otherWork ?? ''}
            onChange={(e) => update('otherWork', e.target.value)}
            placeholder="Enter details of other work not included in the previous sections..."
            aria-label="Other work"
          />

          <div className="textarea-meta">
            <span>Maximum 1000 characters</span>
            <span>{(form.otherWork ?? '').length}/1000</span>
          </div>
        </div>
        <MappedDocumentUpload target="otherWork"/>
      </SectionCard>

      {/* b) Self Appraisal */}

      <SectionCard title="b) Self Appraisal">
        <p className="self-appraisal-description">
          Comments on the work including particulars of
          circumstances for not being able to undertake
          activities in some elements.
        </p>

        <div className="instructional-textarea">
          <textarea
            rows={6}
            maxLength={1000}
            value={form.selfAppraisal ?? ''}
            onChange={(e) => update('selfAppraisal', e.target.value)}
            placeholder="Enter your self appraisal..."
            aria-label="Self appraisal"
          />

          <div className="textarea-meta">
            <span>Maximum 1000 characters</span>
            <span>{(form.selfAppraisal ?? '').length}/1000</span>
          </div>
        </div>
        <MappedDocumentUpload target="selfAppraisal"/>
      </SectionCard>
    </>
  )
}
