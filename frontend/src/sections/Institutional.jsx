import { Award, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import DynamicTable from '../components/common/DynamicTable'

export default function Institutional({ form, updateRows }) {
  return <>
    <PageHeader eyebrow="Step 5 · Management & institutional development" title="Institutional contribution" description="Record committee, laboratory, facility, group and administrative responsibilities at department and institute levels." icon={Users} />
    <SectionCard title="Department / Centre level">
      <DynamicTable columns={['Committee / Lab / Facility / Group','Role']} rows={form.rows.deptRoles} onChange={rows=>updateRows('deptRoles',rows)} addLabel="Add role" renderRow={(row,i,setRow)=><><input value={row.name||''} onChange={e=>setRow({name:e.target.value})} placeholder="Name"/><input value={row.role||''} onChange={e=>setRow({role:e.target.value})} placeholder="Role / responsibility"/></>} />
    </SectionCard>
    <SectionCard title="Institute level" description="If the position is current, use today's date as the To date.">
      <DynamicTable columns={['Role','From date','To date','Activities performed']} rows={form.rows.instituteRoles} onChange={rows=>updateRows('instituteRoles',rows)} addLabel="Add institute role" renderRow={(row,i,setRow)=><><input value={row.role||''} onChange={e=>setRow({role:e.target.value})} placeholder="Role"/><input type="date" value={row.from||''} onChange={e=>setRow({from:e.target.value})}/><input type="date" value={row.to||''} onChange={e=>setRow({to:e.target.value})}/><input value={row.activity||''} onChange={e=>setRow({activity:e.target.value})} placeholder="Activities"/></>} />
    </SectionCard>
    <SectionCard title="Continuing education & special lectures">
      <div className="empty-state"><Award size={23}/><strong>No lectures added yet</strong><span>Add lecture series, date/place/programme and other relevant information.</span><button className="outline-btn">Add lecture</button></div>
    </SectionCard>
  </>
}
