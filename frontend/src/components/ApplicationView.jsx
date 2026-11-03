import { MappedDocumentsProvider } from './common/MappedDocuments'
import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, Printer, MessageSquareText } from 'lucide-react'
import AppraisalDetails from './AppraisalDetails'
import { stageLabel, workflowTime } from './WorkflowSummary'
import WorkflowHistory from './WorkflowHistory'
import '../styles/application-view.css'
import '../styles/submission.css'
import '../styles/review-workspace.css'
import '../styles/workflow-print.css'
export default function ApplicationView({
 form, submissionAllowed=true, submissionBlockReason='', application=null, history=[], steps=[],
 historyError='', onRetryHistory, onBack, onDashboard, onSubmit,
 profileLoading=false, profileError='', teachingLoading=false, teachingError='',
 supervisionLoading=false, supervisionError='', reviewer=false, reviewPanel=null,
 documentUrl, embedded=false,
}) {
 const [tab,setTab]=useState('application')
 const [confirmed,setConfirmed]=useState(false)
 const [submitting,setSubmitting]=useState(false)
 const [submitError,setSubmitError]=useState('')
 const [documentsReady,setDocumentsReady]=useState(!application?.appraisalId)
 const uid=useId()
 const closedPrintDetails=useRef([])
 useEffect(()=>{
  const before=()=>{
   closedPrintDetails.current=[...document.querySelectorAll('.application-view details.workflow-comment:not([open])')]
   closedPrintDetails.current.forEach(element=>{element.open=true})
  }
  const after=()=>{
   closedPrintDetails.current.forEach(element=>{if(element.isConnected)element.open=false})
   closedPrintDetails.current=[]
  }
  window.addEventListener('beforeprint',before)
  window.addEventListener('afterprint',after)
  return()=>{window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);after()}
 },[])
 const stages=['HOD','DEAN_FW','DIRECTOR']
 const currentRound=Math.max(1,...steps.map(step=>step.reviewRound || 1),...history.map(event=>event.reviewRound || 1))
 const pendingStage=application?.pendingStage || ({Submitted:'HOD','HOD Recommended':'DEAN_FW','Dean FW Recommended':'DIRECTOR'}[application?.status])
 const flowRows=stages.map((stage,index)=>{
  const step=[...steps].reverse().find(item=>item.stage===stage && (item.reviewRound || 1)===currentRound)
  const event=[...history].reverse().find(item=>item.stage===stage && (item.reviewRound || 1)===currentRound && ['Recommended','Approved','Returned to Faculty','Returned to HOD','Returned to Dean FW'].includes(item.action))
  const inferred=application?.status==='Approved'?(stage==='DIRECTOR'?'Approved':'Recommended'):
   pendingStage===stage?'Pending':pendingStage && stages.indexOf(pendingStage)>index?'Recommended':'Waiting'
  return {stage,reviewer:step?.assignedName || event?.actorName || '—',status:step?.status || event?.action || inferred,completed:event?.actionAt || step?.completedOn}
 })
 const returned=application?.status==='Returned to Faculty'
 const draft=!application?.status || application.status==='Draft' || returned
 const showWorkflow=!draft || returned
 const unavailable=Boolean(profileLoading || teachingLoading || supervisionLoading || profileError || teachingError || supervisionError)
 const enabled=documentsReady && draft && !reviewer && submissionAllowed && confirmed && !unavailable && !submitting && typeof onSubmit==='function'
 const tabs=[['application','Application'],...(showWorkflow?[['history',reviewer?'Workflow History & Comments':'Workflow History']]:[]),...(reviewPanel?[['review','Your Review']]:[])]
 async function submit(){
  if(!enabled)return
  setSubmitting(true);setSubmitError('')
  try{await onSubmit(form)}catch(error){setSubmitError(error.message || 'Submission failed. Please try again.')}
  finally{setSubmitting(false)}
 }
 return <main className={`application-view ${embedded?'application-view-embedded':''}`} aria-busy={submitting}>
  <nav className="av-actions" aria-label="Application navigation">
   <button type="button" className="outline-btn" onClick={onBack} disabled={submitting}><ArrowLeft size={16}/>{reviewer?'Back to Review List':draft && submissionAllowed?'Back to Editing':'Back'}</button>
   {onDashboard && !reviewer && <button type="button" className="outline-btn" onClick={onDashboard} disabled={submitting}>My Appraisals</button>}
   <button type="button" className="outline-btn av-print-button" onClick={()=>window.print()} disabled={submitting || !documentsReady}><Printer size={16}/>Print / Save as PDF</button>
  </nav>
  <article className="av-paper review-paper">
   <header className="av-heading"><img src={`${import.meta.env.BASE_URL}iitdh-logo.png`} alt="Indian Institute of Technology Dharwad"/>
    <div><p>Faculty Welfare (FW) Section</p><h1>Annual Faculty Self-Appraisal</h1><p>Appraisal Period: {form.period || '—'}</p>
     <strong>{returned?'Returned for Correction':draft?'Draft Preview — Not Submitted':application.status}</strong></div>
   </header>

   {returned && !reviewer && <section className="return-instruction-card" aria-label="Correction instructions"><strong>Corrections requested</strong><p>{application.correctionInstructions || 'Review the correction instructions in workflow history.'}</p><small>After resubmission, your application starts again with the HOD.</small></section>}
   <div className="av-tabs review-detail-tabs" role="tablist" aria-label="Application details">
    {tabs.map(([id,label])=><button type="button" key={id} id={`${uid}-${id}-tab`} role="tab"
     aria-selected={tab===id} aria-controls={`${uid}-${id}-panel`}
     onClick={()=>setTab(id)}>{label}</button>)}
   </div>
   <div id={`${uid}-application-panel`} className="av-application-panel" role="tabpanel"
    aria-labelledby={`${uid}-application-tab`} hidden={tab!=='application'}>
    {(profileLoading || profileError) && <p role="status">Faculty details: {profileLoading?'Loading…':profileError}</p>}
    {(teachingLoading || teachingError) && <p role="status">Teaching details: {teachingLoading?'Loading…':teachingError}</p>}
    {(supervisionLoading || supervisionError) && <p role="status">Supervision / project details: {supervisionLoading?'Loading…':supervisionError}</p>}
    <MappedDocumentsProvider appraisalId={application?.appraisalId} readOnly onReadyChange={setDocumentsReady}><AppraisalDetails form={form} collapsible documentUrl={documentUrl}/></MappedDocumentsProvider>
    {draft && !reviewer && !submissionAllowed && <p role="status" className="av-window-note">{submissionBlockReason || 'The application window is closed.'}</p>}
    {draft && !reviewer && submissionAllowed && <section className="av-submit-panel" aria-label="Confirm and submit">
     <label className="av-confirm"><input type="checkbox" checked={confirmed} disabled={submitting} onChange={event=>setConfirmed(event.target.checked)}/>
      <span>I have reviewed the information and confirm that it is correct to the best of my knowledge.</span></label>
     {unavailable && <p className="av-submit-note">All source details must load successfully before submission.</p>}
     {typeof onSubmit!=='function' && <p className="av-submit-note">Submission is not enabled yet.</p>}
     {submitError && <p className="av-submit-error" role="alert">{submitError}</p>}
     <div className="av-submit-actions"><button type="button" className="outline-btn" disabled={submitting} onClick={onBack}>Back to Editing</button>
      <button type="button" className="av-submit-button" disabled={!enabled} onClick={submit}>{submitting?'Submitting…':returned?'Resubmit Application':'Submit Application'}</button></div>
    </section>}
   </div>
   {showWorkflow && <section className="workflow-print-only" aria-label="Approval flow for printing">
    <h2>Approval Flow</h2><p>Review round {currentRound} · Current status: {application.status}</p>
    <table><thead><tr><th>Stage</th><th>Reviewer</th><th>Status</th><th>Action Date (IST)</th></tr></thead>
     <tbody>{flowRows.map(row=><tr key={row.stage}><td>{stageLabel(row.stage)}</td><td>{row.reviewer}</td><td>{row.status}</td><td>{row.completed?workflowTime(row.completed):'—'}</td></tr>)}</tbody>
    </table>
   </section>}
   {showWorkflow && <div id={`${uid}-history-panel`} className="av-history-panel" role="tabpanel" aria-labelledby={`${uid}-history-tab`} hidden={tab!=='history'}>
    <WorkflowHistory history={history} error={historyError} onRetry={onRetryHistory} showComments={reviewer}/>
   </div>}
   {reviewPanel && <div id={`${uid}-review-panel`} className="review-decision-panel" role="tabpanel" aria-labelledby={`${uid}-review-tab`} hidden={tab!=='review'}>{reviewPanel}</div>}
   {reviewPanel && tab!=='review' && <div className="review-action-bar">
    <div><strong>Your review is pending</strong><span>Add your comments and record your decision.</span></div>
    <button type="button" className="review-primary" onClick={()=>{setTab('review');document.getElementById(`${uid}-review-tab`)?.focus()}}><MessageSquareText size={17}/>Add Your Review</button>
   </div>}
  </article>
 </main>
}
