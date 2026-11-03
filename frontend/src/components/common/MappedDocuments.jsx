import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import RowDocumentUpload from './RowDocumentUpload'
import './mapped-documents.css'
const BASE=(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/,'')
const Context=createContext(null)
export function useDocumentPreparation(){return useContext(Context)}
const key=(target,rowId)=>`${target}:${rowId}`
async function request(path,options={}){
 const response=await fetch(`${BASE}/appraisal-documents/${path}`,{credentials:'include',cache:'no-store',...options})
 const result=await response.json()
 if(!response.ok || !result.success)throw new Error(result.message || 'Unable to access supporting documents.')
 return result.data
}
export function MappedDocumentsProvider({appraisalId,readOnly=false,onActivity,onReadyChange,onPrepare,onResponsibilitySaved,children}){
 const [documents,setDocuments]=useState([])
 const [loading,setLoading]=useState(Boolean(appraisalId))
 const [error,setError]=useState('')
 const [retry,setRetry]=useState(0)
 const [jobs,setJobs]=useState(0)
 const alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{
  setDocuments([]);setError('')
  if(!appraisalId){setLoading(false);return}
  const controller=new AbortController();setLoading(true)
  request(appraisalId,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setDocuments(data)})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message)})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[appraisalId,retry])
 useEffect(()=>{onReadyChange?.(!loading && !error && (!appraisalId || documents!==null))},[loading,error,appraisalId,onReadyChange,documents])
 useEffect(()=>{
  const guard=event=>{if(jobs){event.preventDefault();event.returnValue=''}}
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)
 },[jobs])
 async function mutate(target,rowId,method,body,rowIndex){
  if(readOnly)throw new Error('This application is read-only.')
  setJobs(value=>value+1);onActivity?.(1)
  try{
   let destination={appraisalId,rowId}
   if(!appraisalId || rowId==null){
    if(!onPrepare)throw new Error('Upload preparation is unavailable.')
    destination=await onPrepare(target,rowIndex)
   }
   const data=await request(`${destination.appraisalId}/${target}/${destination.rowId}`,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
   if(alive.current){setDocuments(data);setRetry(value=>value+1)}
  }finally{if(alive.current)setJobs(value=>Math.max(0,value-1));onActivity?.(-1)}
 }
 return <Context.Provider value={{appraisalId,readOnly,documents,loading,error,mutate,onPrepare,onActivity,onResponsibilitySaved}}>
  {error && <div className="mapped-document-error" role="alert">Supporting documents: {error} <button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></div>}
  {children}
 </Context.Provider>
}
function encode(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Unable to read the file.'));r.readAsDataURL(file)})}
export default function MappedDocumentUpload({target,rowId=0,rowIndex,label=true,preview=false}){
 const context=useContext(Context)
 const input=useRef(null),lock=useRef(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 if(!context)return null
 const {appraisalId,readOnly,documents,loading,mutate}=context
 const document=documents.find(item=>key(item.target,item.rowId)===key(target,rowId))
 if(preview && !document)return null
 async function upload(event){
  const file=event.target.files?.[0];event.target.value=''
  if(!file || lock.current)return
  setError('')
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))return setError('Choose a PDF, JPG, PNG or WEBP file.')
  if(!file.size || file.size>500*1024)return setError('Choose a nonempty file of 500 KB or smaller.')
  lock.current=true;setBusy(true)
  try{await mutate(target,rowId,'PUT',{fileName:file.name,base64:await encode(file)},rowIndex)}
  catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
 }
 async function remove(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError('')
  try{await mutate(target,rowId,'DELETE')}catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
 }
 return <div className={`mapped-document ${label?'mapped-document-field':''}`}>
  {label && <span className="mapped-document-label">Supporting document{!readOnly && ' (optional)'}</span>}
  {document?<div className="mapped-document-saved">
   <RowDocumentUpload responsibilityId={document.id} hasSupportingDocument readOnly displayName={document.fileName}
    viewUrl={`${BASE}/appraisal-documents/${appraisalId}/${target}/${rowId}`}/>
   {!readOnly && <button type="button" className="mapped-document-delete" onClick={remove} disabled={busy} aria-label={`Delete ${document.fileName}`} title="Delete document"><Trash2 size={16}/></button>}
  </div>:readOnly?<span>—</span>:<>
   <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={upload} style={{display:'none'}}/>
   <button type="button" className="outline-btn" disabled={busy || loading || !!context.error} onClick={()=>input.current?.click()}><Paperclip size={15}/>Upload</button>
   <small>PDF / Image · Max 500 KB · Optional</small>
  </>}
  {busy && <small role="status">Saving document…</small>}
  {error && <div className="mapped-document-error" role="alert">{error}</div>}
 </div>
}
