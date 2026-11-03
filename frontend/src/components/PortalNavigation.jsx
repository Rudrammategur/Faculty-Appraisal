import { ClipboardList, FileCheck2, Settings2 } from 'lucide-react'
import '../styles/review-workspace.css'
export default function PortalNavigation({ page, canApply, canReview, canManage, onNavigate }) {
 const entries=[
  canApply && ['dashboard','My Appraisals',ClipboardList],
  canReview && ['reviews','Appraisal Approvals',FileCheck2],
  canManage && ['fw-office','FW Administration',Settings2],
 ].filter(Boolean)
 return <nav className="portal-navigation" aria-label="Appraisal portal">
  {entries.map(([id,label,Icon])=><button key={id} type="button"
   aria-current={page===id || (id==='dashboard' && page==='form')?'page':undefined}
   onClick={()=>onNavigate(id)}><Icon size={18}/>{label}</button>)}
 </nav>
}
