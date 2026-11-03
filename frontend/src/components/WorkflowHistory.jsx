import '../styles/return-flow.css'
import { MessageSquareText } from 'lucide-react'
import { stageLabel, workflowTime } from './WorkflowSummary'
export default function WorkflowHistory({history=[],error='',onRetry,showComments=false}) {
 if(error)return <div className="review-alert" role="alert"><p>{error}</p>{onRetry && <button type="button" className="outline-btn" onClick={onRetry}>Retry history</button>}</div>
 if(!history.length)return <p className="review-empty">No workflow actions have been recorded yet.</p>
 return <section className="workflow-history" aria-label="Recorded workflow actions">
  <div className="review-section-heading"><h2>{showComments?'Workflow History & Comments':'Workflow History'}</h2></div>
  <ol>{history.map((item,index)=>{
   const comments=showComments?String(item.comments || ''):''
   return <li key={item.id || index}>
    <span className="workflow-history-dot"><MessageSquareText size={15}/></span>
    <article>
     <header><div><strong>{stageLabel(item.stage)}</strong><span className="review-status">{item.action}</span></div>
      <time dateTime={item.actionAt}>{workflowTime(item.actionAt)}</time></header>
     <p className="workflow-actor">{item.actorName || '—'}</p>
     {item.correctionInstructions && <div className="return-instruction-card"><strong>Correction instructions</strong><p>{item.correctionInstructions}</p></div>}
     {comments && (comments.length>650?<details className="workflow-comment">
      <summary>Read reviewer comments</summary><div>{comments}</div>
     </details>:<div className="workflow-comment workflow-comment-short">{comments}</div>)}
    </article>
   </li>
  })}</ol>
 </section>
}
