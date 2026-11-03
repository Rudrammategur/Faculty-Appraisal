import { Check, Clock3, Circle } from 'lucide-react'
export const stageLabel = value => ({
 FACULTY:'Faculty',HOD:'Department HOD',DEAN_FW:'Dean FW',DIRECTOR:'Director',
}[value] || value || '—')
export const workflowTime = value => value ? new Date(value).toLocaleString('en-IN',{
 timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',
}) : '—'
export default function WorkflowSummary({ application={}, history=[], steps=[] }) {
 const order=['HOD','DEAN_FW','DIRECTOR']
 const round=Math.max(1,...steps.map(item=>item.reviewRound || 1),...history.map(item=>item.reviewRound || 1))
 const roundSteps=steps.filter(item=>(item.reviewRound || 1)===round)
 const roundHistory=history.filter(item=>(item.reviewRound || 1)===round)
 const pending=application.pendingStage || ({Submitted:'HOD','HOD Recommended':'DEAN_FW','Dean FW Recommended':'DIRECTOR'}[application.status])
 return <section className="workflow-summary" aria-label="Approval progress">
  <div className="workflow-summary-heading"><span>Approval progress</span>
   <strong>{application.status==='Approved'?'Completed':pending
    ? `Pending with ${stageLabel(pending)}${application.pendingWith?' · '+application.pendingWith:''}`
    : application.status || 'Not assigned'}</strong>
  </div>
  <ol className="workflow-steps">{order.map((stage,index)=>{
   const step=[...roundSteps].reverse().find(item=>item.stage===stage)
   const event=[...roundHistory].reverse().find(item=>item.stage===stage && ['Recommended','Approved'].includes(item.action))
   const done=Boolean(event || ['Recommended','Approved'].includes(step?.status) || application.status==='Approved' ||
    (pending && order.indexOf(pending)>index))
   const current=!done && (step?.status==='Pending' || pending===stage)
   const Icon=done?Check:current?Clock3:Circle
   return <li key={stage} className={done?'is-complete':current?'is-current':'is-waiting'} aria-current={current?'step':undefined}>
    <span className="workflow-step-icon"><Icon size={17}/></span>
    <div><strong>{stageLabel(stage)}</strong><span>{done
     ? event?.action || step?.status || 'Completed' : current?'Awaiting review':step?.status==='Returned'?'Returned':step?.status==='Cancelled'?'Awaiting resubmission':'Waiting'}</span>
     {(event?.actorName || step?.assignedName) && <small>{event?.actorName || step?.assignedName}</small>}
     {(event?.actionAt || step?.completedOn) && <small>{workflowTime(event?.actionAt || step.completedOn)}</small>}
    </div>
   </li>
  })}</ol>
 </section>
}
