import { Check, Info, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import { Summary, SummaryBlock, Metric } from '../components/common/Summary'

export default function Review({ form, totals }) {
  return <>
    <PageHeader eyebrow="Step 8 · Review & submit" title="Review your appraisal" description="This is the clean summary view the faculty member sees before submission. Click any section to go back and edit it." icon={ShieldCheck} />
    <div className="review-hero"><div className="review-score"><Check size={25}/></div><div><strong>Ready for review</strong><span>Check the summary below before submitting to the next stage.</span></div></div>
    <SectionCard title="Faculty profile" action={<button className="link-btn">Edit</button>}><div className="summary-grid"><Summary label="Name" value={form.name}/><Summary label="Employee ID" value={form.employeeId}/><Summary label="Designation" value={form.designation}/><Summary label="Department" value={form.department}/><Summary label="Appraisal period" value={form.period}/><Summary label="Pay level" value={form.payLevel}/></div></SectionCard>
    <SectionCard title="At a glance" description="A compact view of the information entered across the form."><div className="metric-grid"><Metric value={totals.courses} label="Courses"/><Metric value={totals.projects} label="Student projects"/><Metric value={totals.phd} label="Ph.D. scholars"/><Metric value={totals.publications} label="Publications"/><Metric value={totals.awards} label="Awards"/></div></SectionCard>
    <SectionCard title="Key statements" action={<button className="link-btn">Edit</button>}><div className="summary-stack"><SummaryBlock title="Teaching innovations" value={form.teachingInnovations}/><SummaryBlock title="Self appraisal" value={form.selfAppraisal}/><SummaryBlock title="Future work & suggestions" value={form.futureWork}/><SummaryBlock title="Research at IIT Dharwad" value={form.researchAtIIT}/></div></SectionCard>
    <SectionCard title="Submission checklist">{['Faculty details reviewed','Supporting documents attached where required','Teaching and research entries verified','Self appraisal completed'].map(x=><div className="check-row" key={x}><span className="circle-check"><Check size={13}/></span><span>{x}</span></div>)}</SectionCard>
    <div className="submit-note"><Info size={17}/><div><strong>After submission</strong><span>The appraisal moves to the institute’s forwarding, appraisal and follow-up workflow. The final approved record can include HoD, Appraisal Committee, Dean FW and Director comments.</span></div></div>
  </>
}
