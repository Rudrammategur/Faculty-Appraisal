import { Check, Lightbulb } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import { TextArea } from '../components/common/Fields'

const ITEMS = ['New courses developed','Laboratory manuals','MOOCs','NPTEL courses','Video lectures','Online learning resources']

export default function Innovations({ form, update }) {
  return <>
    <PageHeader eyebrow="Step 7 · Innovations" title="Teaching & learning innovations" description="Capture new course and learning-resource initiatives in a quick, scannable format." icon={Lightbulb} />
    <SectionCard title="Innovation checklist" description="Select the areas where you contributed and add a short description.">
      <div className="innovation-grid">{ITEMS.map(item => <label className="check-card" key={item}><input type="checkbox"/><span className="fake-check"><Check size={14}/></span><span>{item}</span></label>)}</div>
    </SectionCard>
    <SectionCard title="Details"><TextArea label="Innovation details" value={form.teachingInnovations} onChange={v=>update('teachingInnovations',v)} max={1000} placeholder="Briefly describe the innovation and its contribution..."/></SectionCard>
  </>
}
