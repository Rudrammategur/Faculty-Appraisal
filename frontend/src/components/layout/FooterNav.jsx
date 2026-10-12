import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'

export default function FooterNav({ isFirst, isLast, onBack, onNext, onSave }) {
  return (
    <div className="footer-nav">
      <button className="ghost-btn" onClick={onBack} disabled={isFirst}><ArrowLeft size={17} /> Previous</button>
      <div className="footer-right">
        <button className="outline-btn" onClick={onSave}><Save size={16} /> Save draft</button>
        {isLast ? <button className="primary-btn"><Check size={17} /> Submit appraisal</button> : <button className="primary-btn" onClick={onNext}>Continue <ArrowRight size={17} /></button>}
      </div>
    </div>
  )
}
