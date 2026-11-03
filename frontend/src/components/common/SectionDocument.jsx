import { useRef, useState } from 'react'
import './section-document.css'
import { X } from 'lucide-react'

const MAX_FILES = 10
const MAX_BYTES = 250 * 1024
const allowedExtensions = /\.(pdf|jpg|jpeg|png|webp)$/i

export default function SectionDocument({
  file,
  onChange,
  readOnly = false,
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  // Supports existing single-file values as well as new arrays.
  const files = Array.isArray(file) ? file : file ? [file] : []

  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''

    if (!selected.length) return

    setError('')

    if (files.length + selected.length > MAX_FILES) {
      window.alert('You can upload a maximum of 10 documents per section.')
      return
    }

    for (const document of selected) {
      if (!allowedExtensions.test(document.name)) {
        setError(
          `"${document.name}": Please select a PDF, JPG, JPEG, PNG or WEBP file.`
        )
        return
      }

      if (document.size > MAX_BYTES) {
        setError(
          `"${document.name}": File size must not exceed 250 KB.`
        )
        return
      }
    }

    onChange?.([...files, ...selected])
  }

  const removeFile = (index) => {
    setError('')
    onChange?.(files.filter((_, fileIndex) => fileIndex !== index))
  }

  const viewFile = (document) => {
    const url = URL.createObjectURL(document)

    const link = window.document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()

    // Allow the browser to load the document before releasing the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <div className="section-document">
      <div className="section-document-heading">
        Supporting Documents
        <span> (PDF or images · Max 250 KB per file)</span>
        <p className="field-hint">
  Use file names that clearly describe the contents.
</p>
      </div>

      {files.map((document, index) => (
        <div
          className="section-document-file"
          key={`${document.name}-${document.lastModified}-${index}`}
        >
          <button
            type="button"
            className="section-document-name"
            onClick={() => viewFile(document)}
            title="Click to view document"
          >
            {document.name}
          </button>

          <span className="section-document-size">
            ({(document.size / 1024).toFixed(1)} KB)
          </span>

          {!readOnly && (
            <button
              type="button"
              className="section-document-remove"
              onClick={() => removeFile(index)}
              title="Remove document"
              aria-label={`Remove ${document.name}`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      ))}

      {readOnly && files.length === 0 && (
        <p className="section-document-empty">
          No documents attached.
        </p>
      )}

      {!readOnly && (
        <>
          <button
            type="button"
            className="section-document-upload"
            onClick={() => inputRef.current?.click()}
          >
            {files.length ? 'Add documents' : 'Choose documents'}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            onChange={chooseFiles}
            hidden
          />
        </>
      )}

      {error && (
        <p role="alert" className="section-document-error">
          {error}
        </p>
      )}
    </div>
  )
}