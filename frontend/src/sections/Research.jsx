import { BookOpen, Upload } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
import DynamicTable from '../components/common/DynamicTable'

export default function Research({ form, updateRows }) {
  return <>
    <PageHeader eyebrow="Step 3 · Academic research & publication" title="Research & publications" description="Capture supervision and research output in compact, repeatable tables. Add rows only when you have something to report." icon={BookOpen} />
    <SectionCard title="Ph.D. research supervision" description="Student name, roll number and batch can be loaded from DB. Add the research details that require faculty input.">
      <DynamicTable columns={['Student','Reg. year / status','Project title','Progress','Co-supervisor','Remarks']} rows={form.rows.phd} onChange={rows=>updateRows('phd',rows)} addLabel="Add scholar" renderRow={(row,i,setRow)=><>
        <input value={row.student||''} onChange={e=>setRow({student:e.target.value})} placeholder="Student / roll no" />
        <input value={row.reg||''} onChange={e=>setRow({reg:e.target.value})} placeholder="2024 · FT" />
        <input value={row.title||''} onChange={e=>setRow({title:e.target.value})} placeholder="Project title" />
        <select value={row.status||'On-going'} onChange={e=>setRow({status:e.target.value})}><option>On-going</option><option>Completed</option></select>
        <input value={row.co||''} onChange={e=>setRow({co:e.target.value})} placeholder="If any" />
        <input value={row.remarks||''} onChange={e=>setRow({remarks:e.target.value})} placeholder="Remarks" />
      </>} />
    </SectionCard>
    <SectionCard title="Publications" description="Keep publication categories manageable and add rows as needed.">
      <div className="mini-tabs"><button className="active">Journal papers</button><button>Conference papers</button><button>Books / manuals</button><button>Technical reports</button></div>
      <DynamicTable columns={['Authors','Title','Journal / venue','Year','Pages / details']} rows={form.rows.journals} onChange={rows=>updateRows('journals',rows)} addLabel="Add publication" renderRow={(row,i,setRow)=><>
        <input value={row.authors||''} onChange={e=>setRow({authors:e.target.value})} placeholder="Author sequence" />
        <input value={row.title||''} onChange={e=>setRow({title:e.target.value})} placeholder="Paper title" />
        <input value={row.venue||''} onChange={e=>setRow({venue:e.target.value})} placeholder="Journal / venue" />
        <input value={row.year||''} onChange={e=>setRow({year:e.target.value})} placeholder="2026" />
        <input value={row.pages||''} onChange={e=>setRow({pages:e.target.value})} placeholder="Pages / volume" />
      </>} />
    </SectionCard>
    <SectionCard title="Awards, prizes & medals" description="Upload evidence for each award where applicable.">
      <DynamicTable columns={['Award / prize / medal','Issued by','Place','Month-Year','Evidence']} rows={form.rows.awards} onChange={rows=>updateRows('awards',rows)} addLabel="Add award" renderRow={(row,i,setRow)=><>
        <input value={row.name||''} onChange={e=>setRow({name:e.target.value})} placeholder="Award name" />
        <input value={row.issuer||''} onChange={e=>setRow({issuer:e.target.value})} placeholder="Issued by" />
        <input value={row.place||''} onChange={e=>setRow({place:e.target.value})} placeholder="Place" />
        <input type="month" value={row.month||''} onChange={e=>setRow({month:e.target.value})} />
        <button className="upload-inline"><Upload size={15}/> Upload</button>
      </>} />
    </SectionCard>
  </>
}
