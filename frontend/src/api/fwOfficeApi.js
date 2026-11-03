const BASE=(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/,'')
async function request(path,options={}){
 const response=await fetch(`${BASE}/fw/${path}`,{credentials:'include',...options})
 const result=await response.json()
 if(!response.ok || !result.success){const error=new Error(result.message || 'Unable to access FW office settings.');error.status=response.status;throw error}
 return result.data
}
export const getFwAccess=signal=>request('access',{signal})
export const getFwAcademicYears=signal=>request('academic-years',{signal})
export const getFwCycle=(year,signal)=>request(`cycles/${year}`,{signal})
export const saveFwCycle=(year,body)=>request(`cycles/${year}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
export async function getFacultyApplicationWindow(year,signal){
 const response=await fetch(`${BASE}/faculty/application-window?${new URLSearchParams({academicYearId:String(year)})}`,{signal,credentials:'include'})
 const result=await response.json()
 if(!response.ok || !result.success)throw new Error(result.message || 'Unable to check the application dates.')
 return result.data
}

export const getFwCycles=signal=>request('cycles',{signal})
