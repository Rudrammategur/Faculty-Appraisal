import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Paperclip, Trash2, X, Download } from 'lucide-react'
import './RowDocumentUpload.css'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const MAX_SIZE = 500 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function encodeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Unable to read the selected document.'))
    reader.readAsDataURL(file)
  })
}

export default function RowDocumentUpload({ responsibilityId, hasSupportingDocument = false, onSaved, readOnly = false, viewUrl = null, displayName = '', onPrepare, onActivity }) {
  const inputRef = useRef(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(hasSupportingDocument)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const dialogRef = useRef(null)
  useEffect(() => {
    if (preview && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }, [preview])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  useEffect(() => { setFileName(''); setPreview(null) }, [responsibilityId])
  useEffect(() => { setSaved(hasSupportingDocument); setError('') }, [responsibilityId, hasSupportingDocument])
  const endpoint = `${API_BASE}/responsibility-documents/${responsibilityId}`

  async function mutate(method, body, id = responsibilityId) {
    const response = await fetch(`${API_BASE}/responsibility-documents/${id}`, {
      method, credentials: 'include',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.message || 'Document operation failed.')
    setSaved(result.data.hasSupportingDocument)
    onSaved?.(result.data.hasSupportingDocument, id)
  }

  async function select(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busyRef.current || saved) return
    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) return setError('Select a PDF, JPG, PNG or WEBP file.')
    if (!file.size || file.size > MAX_SIZE) return setError('Select a nonempty document of 500 KB or smaller.')
    busyRef.current = true; setBusy(true)
    onActivity?.(1)
    try {
      const id = responsibilityId || (await onPrepare?.())?.rowId
      if (!id) throw new Error('Unable to prepare the responsibility row.')
      await mutate('PUT', { base64: await encodeFile(file) }, id); setFileName(file.name)
    }
    catch (error) { setError(error.message) }
    finally { busyRef.current = false; setBusy(false); onActivity?.(-1) }
  }

  async function remove() {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError('')
    try { await mutate('DELETE'); setFileName(''); setPreview(null) }
    catch (error) { setError(error.message) }
    finally { busyRef.current = false; setBusy(false) }
  }

  async function view() {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError('')
    try {
      const response = await fetch(readOnly && viewUrl ? viewUrl : endpoint, { credentials: 'include', cache: 'no-store' })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Unable to download document.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const generatedName = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '')?.[1] || `responsibility-${responsibilityId}.${({ 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[blob.type] || 'bin'}`
      setPreview({ url, type: blob.type, name: fileName || displayName || generatedName })

    } catch (error) { setError(error.message) }
    finally { busyRef.current = false; setBusy(false) }
  }

  const displayedName = fileName || displayName || `responsibility-${responsibilityId}`
  if (readOnly && !saved) return <span>—</span>
  return <div className="rdoc">
    {!readOnly && <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={select} style={{ display: 'none' }} />}
    {saved ? <div className="rdoc-saved">
      <button type="button" className="rdoc-name" onClick={view} disabled={busy} title={`View ${displayedName}`}>
        <Paperclip size={15} aria-hidden="true" />
        <span>{displayedName}</span>
      </button>
      {!readOnly && <div className="rdoc-tools">
        <button type="button" className="rdoc-icon rdoc-remove" disabled={busy} onClick={remove} title="Remove document" aria-label="Remove document"><Trash2 size={14} /></button>
      </div>}
    </div> : <button type="button" className="outline-btn" disabled={busy || (!responsibilityId && !onPrepare)} onClick={() => inputRef.current?.click()}><Paperclip size={14} /> Upload</button>}
    {busy && <small className="rdoc-hint" role="status">Please wait…</small>}
    {!saved && !busy && <small className="rdoc-hint">PDF / Image · Max 500 KB</small>}
    {error && <div role="alert" className="rdoc-error">{error}</div>}
    {preview && createPortal(
      <dialog ref={dialogRef} className="rdoc-dialog" aria-label="Supporting document viewer" onCancel={() => setPreview(null)} onClick={event => { if (event.target === event.currentTarget) setPreview(null) }}>
        <div className="rdoc-viewer">
          <header className="rdoc-viewer-bar">
            <span className="rdoc-viewer-name" title={preview.name}>{preview.name}</span>
            <a className="rdoc-download" href={preview.url} download={preview.name}><Download size={16} /> Download</a>
            <button type="button" className="rdoc-close" onClick={() => setPreview(null)} aria-label="Close document viewer"><X size={20} /></button>
          </header>
          <div className="rdoc-preview">
            {preview.type.startsWith('image/') ? <img src={preview.url} alt={preview.name} /> : preview.type === 'application/pdf' ? <iframe src={preview.url} title={preview.name} /> : <p>Preview is unavailable for this format. Use Download to open the document.</p>}
          </div>
        </div>
      </dialog>, document.body
    )}
  </div>
}
