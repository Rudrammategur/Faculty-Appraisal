import { Upload } from 'lucide-react'

export default function UploadBox({ label, help }) {
  return (
    <div className="upload-box">
      <div className="upload-icon"><Upload size={20} /></div>
      <div><strong>{label}</strong><span>{help}</span></div>
      <button className="outline-btn">Choose file</button>
    </div>
  )
}
