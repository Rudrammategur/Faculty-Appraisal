import { useState } from 'react'
import AppraisalDetails from '../components/AppraisalDetails'
import { ROLES, assignedRole, statusText, createDemoApps, takeDemoAction, resubmitDemo } from './workflowDemo.mjs'
import '../styles/application-view.css'
import './appraisal-demo.css'
const date = value => new Date(value).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})
export default function AppraisalDemo() {
 const [apps,setApps]=useState(createDemoApps)
 const [role,setRole]=useState('HOD')
 const [tab,setTab]=useState('approvals')
 const [filter,setFilter]=useState('pending')
 const [selected,setSelected]=useState(null)
 const [detailTab,setDetailTab]=useState('application')
 const [comments,setComments]=useState('')
 const [correction,setCorrection]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [revision,setRevision]=useState(null)
 const [confirmation,setConfirmation]=useState(null)
 const app=apps.find(item=>item.id===selected)
 const pending=apps.filter(item=>assignedRole(item)===role)
 const acted=apps.filter(item=>item.history.some(h=>h.stage===role&&['Approved','Returned'].includes(h.action)))
 const listed=tab==='mine'?(role==='FACULTY'?apps.filter(item=>item.id==='demo-1'):[]):filter==='pending'?pending:acted
 const lastAction=item=>[...item.history].reverse().find(h=>h.stage===role&&['Approved','Returned'].includes(h.action))
 function open(item){setDetailTab('application');setSelected(item.id);setRevision(item.revision);setCorrection(item.form.selfAppraisal||'');setComments('');setError('');setConfirmation(null);setNotice('')}
 function changeRole(value){setRole(value);setTab(value==='FACULTY'?'mine':'approvals');setSelected(null);setConfirmation(null);setError('');setNotice('')}
 function requestAction(action){if(!comments.trim()){setError('Please enter comments before continuing.');return}setError('');setConfirmation({action,id:app.id,version:app.version})}
 function confirmAction(){
  try {
   const current=apps.find(x=>x.id===confirmation.id)
   const updated=takeDemoAction(current,role,confirmation.action,comments,confirmation.version)
   setApps(apps.map(x=>x.id===updated.id?updated:x));setConfirmation(null);setComments('');setNotice(`Demo action recorded: ${statusText(updated)}.`)
  } catch(e){setError(e.message);setConfirmation(null)}
 }
 function resubmit(){try{const updated=resubmitDemo(app,role,correction,app.version);setApps(apps.map(x=>x.id===updated.id?updated:x));setRevision(updated.revision);setNotice('Demo revision resubmitted to HoD.');setError('')}catch(e){setError(e.message)}}
 const snapshot=app?.revisions.find(x=>x.revision===revision)
 const isLatest=app&&revision===app.revision
 return <div className="ad-root">
  <div className="ad-demo-banner ad-no-print"><strong>DEMO MODE</strong><span>Sample applications only. Actions stay in this browser session; refresh resets them. No backend requests.</span><a href={window.location.pathname}>Exit demo</a></div>
  <header className="ad-header ad-no-print"><img src={`${import.meta.env.BASE_URL}iitdh-logo.png`} alt="IIT Dharwad"/><div><small>Faculty Welfare (FW) Section</small><h1>Faculty Annual Appraisal Portal</h1></div><label>Demo role<select value={role} onChange={e=>changeRole(e.target.value)}>{Object.entries(ROLES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></header>
  <div className="ad-context ad-no-print">{role==='FACULTY'?'Signed in as Demo Faculty A':`Acting as Demo ${ROLES[role]}`} · Computer Science and Engineering</div>
  {!app ? <main className="ad-dashboard">
   <div className="ad-title"><div><h2>{tab==='mine'?'My Appraisals':'Appraisal Approvals'}</h2><p>{tab==='mine'?'View your sample application and respond to correction requests.':'Review applications and record your decision.'}</p></div><button onClick={()=>{if(window.confirm('Reset all demo applications and history?')){setApps(createDemoApps());setNotice('Demo reset.')}}}>Reset demo</button></div>
   <nav className="ad-tabs" aria-label="Dashboard views"><button aria-pressed={tab==='mine'} onClick={()=>setTab('mine')}>My Appraisals</button>{role!=='FACULTY'&&<button aria-pressed={tab==='approvals'} onClick={()=>setTab('approvals')}>Approvals ({pending.length})</button>}</nav>
   {tab==='approvals'&&<nav className="ad-filters" aria-label="Approval lists"><button aria-pressed={filter==='pending'} onClick={()=>setFilter('pending')}>Pending ({pending.length})</button><button aria-pressed={filter==='history'} onClick={()=>setFilter('history')}>My Action History ({acted.length})</button></nav>}
   <section className="ad-card"><div className="ad-table-scroll"><table><thead><tr><th>Application No.</th><th>Faculty Name</th><th>Department</th><th>Period</th><th>{tab==='approvals'&&filter==='history'?'Last Action / Date':'Submitted On'}</th><th>Status</th><th>Action</th></tr></thead><tbody>{listed.map(item=><tr key={item.id}><td>{item.number}</td><td>{item.form.name}</td><td>{item.form.department}</td><td>2025–26</td><td>{tab==='approvals'&&filter==='history'?`${lastAction(item)?.action} · ${date(lastAction(item).actionAt)}`:date(item.submittedAt)}</td><td><span className={`ad-status ad-status-${item.status}`}>{statusText(item)}</span></td><td><button className="ad-primary" onClick={()=>open(item)}>{assignedRole(item)===role?'Open & Review':role==='FACULTY'&&item.status==='Returned'?'Correct & Resubmit':'View'}</button></td></tr>)}</tbody></table></div>{!listed.length&&<p className="ad-empty">{tab==='mine'&&role!=='FACULTY'?'No personal sample application for this role. Select Faculty to demonstrate the applicant view.':'No applications in this list.'}</p>}</section>
   {notice&&<p role="status">{notice}</p>}
  </main> : <main className="application-view ad-detail">
   <div className="av-actions ad-no-print"><button onClick={()=>{setSelected(null);setConfirmation(null)}}>← Back to Dashboard</button><label>Revision <select value={revision} onChange={e=>{setRevision(Number(e.target.value));setConfirmation(null);setError('')}}>{app.revisions.map(r=><option key={r.revision} value={r.revision}>{r.revision}{r.revision===app.revision?' (Latest)':''}</option>)}</select></label><button onClick={()=>window.print()}>Print / Save as PDF</button></div>
   <nav className="ad-tabs ad-no-print" aria-label="Application views">
    <button aria-pressed={detailTab==='application'} onClick={()=>setDetailTab('application')}>Application</button>
    <button aria-pressed={detailTab==='history'} onClick={()=>setDetailTab('history')}>Workflow History</button>
   </nav>
   <article className="av-paper"><header className="av-heading"><img src={`${import.meta.env.BASE_URL}iitdh-logo.png`} alt="IIT Dharwad"/><div><p>Faculty Welfare (FW) Section</p><h1>Annual Faculty Self-Appraisal Form (AFSAF)</h1><strong>DEMONSTRATION — SAMPLE APPLICATION</strong><p>{app.number} · Revision {revision} · {app.form.period}</p><p>Submitted: {date(snapshot.submittedAt)} · Current application status: {statusText(app)}</p></div></header>
    {!isLatest&&<p>Historical revision — read-only.</p>}
    <div className={`ad-application-panel ${detailTab!=='application'?'ad-panel-hidden':''}`}><AppraisalDetails form={snapshot.form}/></div>
    <section className={`av-section ad-no-print ${detailTab!=='history'?'ad-panel-hidden':''}`}><h2>Workflow History</h2><p className="av-muted">All demonstration comments are visible here; production visibility awaits FW confirmation.</p><div className="av-table-scroll"><table><thead><tr>{['Date & Time','Revision','Stage','Action By','Action','Comments'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{app.history.filter(h=>h.revision<=revision).map((h,i)=><tr key={i}><td>{date(h.actionAt)}</td><td>{h.revision}</td><td>{ROLES[h.stage]}</td><td>{h.actorName}</td><td>{h.action}</td><td>{h.comments}</td></tr>)}</tbody></table></div></section>
    {notice&&<p className="ad-no-print" role="status">{notice}</p>}
    {error&&<p className="ad-error ad-no-print" role="alert">{error}</p>}
    {detailTab==='application'&&isLatest&&assignedRole(app)===role&&<section className="ad-review ad-no-print"><h2>Review Decision</h2><label htmlFor="demo-comments">Comments (required)</label><textarea id="demo-comments" maxLength={2000} rows={4} value={comments} onChange={e=>setComments(e.target.value)} disabled={!!confirmation}/><small>{comments.length}/2000 characters</small><div className="ad-buttons"><button className="ad-return" disabled={!!confirmation} onClick={()=>requestAction('return')}>Return for Correction</button><button className="ad-primary" disabled={!!confirmation} onClick={()=>requestAction('approve')}>{role==='DIRECTOR'?'Approve':'Approve & Forward'}</button></div>
     {confirmation&&<div className="ad-confirm" role="group" aria-label="Confirm review decision"><p>{confirmation.action==='return'?'Return this sample application to the faculty? Resubmission will restart at HoD.':role==='DIRECTOR'?'Complete this sample appraisal?':`Forward this sample application to ${role==='HOD'?'Dean FW':'Director'}?`}</p><button onClick={()=>setConfirmation(null)}>Cancel</button> <button className="ad-primary" onClick={confirmAction}>Confirm demo action</button></div>}
    </section>}
    {detailTab==='application'&&isLatest&&role==='FACULTY'&&app.id==='demo-1'&&app.status==='Returned'&&<section className="ad-review ad-no-print"><h2>Correction & Resubmission</h2><p>This demonstration allows correction of the self-appraisal text. Earlier revisions remain unchanged.</p><label htmlFor="demo-correction">Self Appraisal</label><textarea id="demo-correction" rows={5} maxLength={1000} value={correction} onChange={e=>setCorrection(e.target.value)}/><small>{correction.length}/1000 characters</small><div className="ad-buttons"><button className="ad-primary" onClick={resubmit}>Resubmit to HoD</button></div></section>}
   </article>
  </main>}
 </div>
}
