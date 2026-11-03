import MappedDocumentUpload from '../components/common/MappedDocuments'

import { MessageSquareText } from 'lucide-react'
import { useMemo } from 'react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'

const countWords = (text = '') => {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export default function FutureWork({ form, update }) {
  const value = form.futureWork || ''

  const wordCount = useMemo(
    () => countWords(value),
    [value]
  )

  const handleChange = (e) => {
    const text = e.target.value

    if (countWords(text) <= 1000) {
      update('futureWork', text)
    }
  }

  return (
    <>
      <PageHeader
        title="VI. COMMENTS / SUGGESTIONS FOR FUTURE WORK"
        icon={MessageSquareText}
      />

      <SectionCard title="Comments / Suggestions">
        <p className="future-work-description">
          Including difficulties faced, if any, and suggestions
          for improvement, training, infrastructure, etc.,
          for professional growth and achievement of excellence.
        </p>

        <div className="instructional-textarea">
          <textarea
            value={form.futureWork || ''}
            onChange={e => update('futureWork', e.target.value)}
            maxLength={1000}
            rows={6}
            placeholder="Enter your comments and suggestions for future work..."
          />

          <div className="textarea-meta">
            <span>Maximum 1,000 characters</span>
            <span>{(form.futureWork || '').length}/1000 characters</span>
          </div>
        </div>
        <MappedDocumentUpload target="futureWork"/>
      </SectionCard>
    </>
  )
}
