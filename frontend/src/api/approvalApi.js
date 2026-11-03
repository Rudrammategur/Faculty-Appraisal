const BASE=(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/,'')
export async function approvalRequest(path,options={}){
 const response=await fetch(`${BASE}/appraisal-workflow/${path}`,{credentials:'include',...options})
 const result=await response.json()
 if(!response.ok || !result.success)throw new Error(result.message || 'Unable to load review.')
 return result
}
export const getPendingReviews=signal=>approvalRequest('pending',{signal}).then(result=>result.data)
export const getReviewDetails=(id,signal)=>approvalRequest(`${id}/details`,{signal}).then(result=>result.data)
export const getReviewSource=(id,kind,signal)=>approvalRequest(`${id}/source/${kind}`,{signal})
export const getReviewHistory=(id,signal)=>approvalRequest(`${id}/history`,{signal}).then(result=>result.data)
export const takeReviewAction=(id,body)=>approvalRequest(`${id}/action`,{
 method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
}).then(result=>result.data)
export const reviewerDocumentUrl=(id,docId)=>`${BASE}/appraisal-workflow/${id}/documents/${docId}`

export const getReviewedApplications=signal=>approvalRequest('reviewed',{signal}).then(result=>result.data)
export const getMyAppraisals=signal=>approvalRequest('mine',{signal}).then(result=>result.data)
