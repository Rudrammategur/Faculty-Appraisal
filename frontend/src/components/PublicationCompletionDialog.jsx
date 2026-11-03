import { useEffect,useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styles/publication-completion.css'
export default function PublicationCompletionDialog({issues=[],onEdit,onClear}){
 const ref=useRef(null),focus=useRef(null)
 const labels={journals:'II. b(i) Refereed Journal Papers',conferences:'II. b(ii) Conference Research Papers',books:'II. b(iii) Books / Monographs',reports:'II. b(iv) Technical Reports',awards:'II. b(v) Awards, Prizes and Medals'}
 const sections=[...new Set(issues.map(issue=>labels[issue.group] || issue.label).filter(Boolean))]
 useEffect(()=>{const previous=document.activeElement;ref.current?.showModal();focus.current?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[])
 return createPortal(<dialog className="publication-completion-dialog" ref={ref} aria-labelledby="publication-completion-section" aria-describedby="publication-completion-description" onCancel={event=>{event.preventDefault();onEdit()}}>
  <h2 id="publication-completion-section">{sections.length?sections.join(' · '):'II. b) Publications'}</h2>
  <p id="publication-completion-description">Some row details are missing. Complete them or clear incomplete rows to continue.</p>
  <div className="publication-completion-actions"><button type="button" className="outline-btn" onClick={onClear}>Clear &amp; continue</button><button ref={focus} type="button" className="primary-btn" onClick={onEdit}>Complete details</button></div>
 </dialog>,document.body)
}
