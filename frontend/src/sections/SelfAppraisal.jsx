import { ClipboardCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import { TextArea } from '../components/common/Fields'

export default function SelfAppraisal({ form, update }) {
  return <>
    <PageHeader eyebrow="Step 6 · Miscellaneous & self appraisal" title="Your reflection" description="Explain meaningful work, constraints, achievements and the support you need for professional growth." icon={ClipboardCheck} />
    <SectionCard title="Other work" description="Include work not already captured in the sections above."><TextArea label="Other work" value={form.otherWork} onChange={v=>update('otherWork',v)} max={1000}/></SectionCard>
    <SectionCard title="Self appraisal" description="Comment on your work, including circumstances that prevented you from undertaking activities in some elements."><TextArea label="Self appraisal" value={form.selfAppraisal} onChange={v=>update('selfAppraisal',v)} max={1000}/></SectionCard>
    <SectionCard title="Comments / suggestions for future work" description="Mention difficulties faced, improvement suggestions, training, infrastructure and other support needed for professional growth."><TextArea label="Future work & suggestions" value={form.futureWork} onChange={v=>update('futureWork',v)} max={1000}/></SectionCard>
    <SectionCard title="Research done specifically at IIT Dharwad"><TextArea label="Research statement" value={form.researchAtIIT} onChange={v=>update('researchAtIIT',v)} max={1000}/></SectionCard>
    <SectionCard title="Associate faculty — other department / centre" description="Complete this only if applicable."><TextArea label="Separate summary of work" value={form.associateSummary} onChange={v=>update('associateSummary',v)} max={1000}/></SectionCard>
  </>
}
