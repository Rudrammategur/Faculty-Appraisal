import { BriefcaseBusiness } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import DynamicTable from '../components/common/DynamicTable'
import { TextArea } from '../components/common/Fields'

export default function RD({ form, update, updateRows }) {
  return <>
    <PageHeader eyebrow="Step 4 · Sponsored R&D, consultancy & extension" title="Projects, consultancy & outreach" description="Record externally supported research, institute consultancy, lectures and expected activities." icon={BriefcaseBusiness} />
    <SectionCard title="Sponsored research projects">
      <DynamicTable columns={['Title','Funding agency','Financial outlay','Start & period','PI / investigators','Status & remarks']} rows={form.rows.sponsored} onChange={rows=>updateRows('sponsored',rows)} addLabel="Add project" renderRow={(row,i,setRow)=><>
        <input value={row.title||''} onChange={e=>setRow({title:e.target.value})} placeholder="Project title" /><input value={row.agency||''} onChange={e=>setRow({agency:e.target.value})} placeholder="Agency" /><input value={row.amount||''} onChange={e=>setRow({amount:e.target.value})} placeholder="₹" /><input value={row.period||''} onChange={e=>setRow({period:e.target.value})} placeholder="Start · period" /><input value={row.people||''} onChange={e=>setRow({people:e.target.value})} placeholder="PI / investigators" /><select value={row.status||'In progress'} onChange={e=>setRow({status:e.target.value})}><option>In progress</option><option>Completed</option></select>
      </>} />
    </SectionCard>
    <SectionCard title="Institute consultancy projects">
      <DynamicTable columns={['Title','Client','Total amount','Starting date & period','Consultants','Status']} rows={form.rows.consultancy} onChange={rows=>updateRows('consultancy',rows)} addLabel="Add consultancy" renderRow={(row,i,setRow)=><>
        <input value={row.title||''} onChange={e=>setRow({title:e.target.value})} placeholder="Project title" /><input value={row.client||''} onChange={e=>setRow({client:e.target.value})} placeholder="Client" /><input value={row.amount||''} onChange={e=>setRow({amount:e.target.value})} placeholder="₹" /><input value={row.period||''} onChange={e=>setRow({period:e.target.value})} placeholder="Date · period" /><input value={row.people||''} onChange={e=>setRow({people:e.target.value})} placeholder="Consultants" /><select value={row.status||'In progress'} onChange={e=>setRow({status:e.target.value})}><option>In progress</option><option>Completed</option></select>
      </>} />
    </SectionCard>
    <SectionCard title="Expected activities" description="Keep each response focused on what you plan to achieve in the next year.">
      <div className="form-grid two"><TextArea label="Expected research activity" value={form.expectedResearch} onChange={v=>update('expectedResearch',v)} max={1000}/><TextArea label="Expected outreach activity" value={form.expectedOutreach} onChange={v=>update('expectedOutreach',v)} max={1000}/><TextArea label="Expected professional activity" value={form.expectedProfessional} onChange={v=>update('expectedProfessional',v)} max={1000}/></div>
    </SectionCard>
  </>
}
