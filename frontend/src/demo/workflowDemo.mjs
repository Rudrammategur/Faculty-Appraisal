export const ROLES = { FACULTY: 'Faculty', HOD: 'HoD', DEAN_FW: 'Dean FW', DIRECTOR: 'Director' }
const stages = ['HOD', 'DEAN_FW', 'DIRECTOR']
export const assignedRole = app => app.status === 'UnderReview' ? stages[app.stage] : null
export const statusText = app => app.status === 'UnderReview' ? `Pending with ${ROLES[assignedRole(app)]}` : app.status === 'Returned' ? 'Returned for Correction' : app.status
const event = (action, stage, comments, revision, now) => ({id: `${now}-${action}-${stage}-${revision}`, action, stage, actorName: `Demo ${ROLES[stage] || stage}`, comments, revision, actionAt: now})
export function createDemoApps() {
 const now = new Date().toISOString()
 return [0,1,2].map((n) => {
  const form = {name:`Demo Faculty ${['A','B','C'][n]}`,employeeId:`DEMO-00${n+1}`,designation:'Associate Professor',department:'Computer Science and Engineering',period:'01.08.2025 – 31.07.2026',selfAppraisal:'Demonstration content: contributed to teaching, student supervision and research.',otherWork:'Coordinated departmental academic activities.',futureWork:'Improve student project mentoring.',rows:{teaching:[{courseType:'Theory',course:'DEMO101 — Sample Course',academicPeriodName:'Autumn 2025-26',registeredStudents:60,studentsUGPG:'UG: 50, PG: 10',weeklyLoad:'3'}],departmentLevels:[{responsibility:'Academic committee member',activities:'Reviewed course proposals.',fromDate:'2025-08-01',toDate:'2026-07-31'}]},documents:{}}
  const history=[event('Submitted','FACULTY','Sample application submitted.',1,now)]
  for(let i=0;i<n;i++) history.push(event('Approved',stages[i],'Sample review completed.',1,now))
  return {id:`demo-${n+1}`,number:`DEMO/2025-26/0000${n+1}`,owner:'FACULTY',form,status:'UnderReview',stage:n,revision:1,version:1,submittedAt:now,history,revisions:[{revision:1,form:structuredClone(form),submittedAt:now}]}
 })
}
export function takeDemoAction(app, role, action, comments, expectedVersion, now = new Date().toISOString()) {
 if(app.version !== expectedVersion) throw new Error('This application changed. Reopen it before acting.')
 if(!['approve','return'].includes(action)) throw new Error('Invalid action.')
 if(assignedRole(app)!==role || role==='FACULTY') throw new Error('This application is not pending with your selected demo role.')
 if(typeof comments!=='string' || !comments.trim() || comments.length>2000) throw new Error('Enter comments (maximum 2,000 characters).')
 const approved=action==='approve'
 return {...app,version:app.version+1,status:approved?(app.stage===2?'Completed':'UnderReview'):'Returned',stage:approved&&app.stage<2?app.stage+1:null,history:[...app.history,event(approved?'Approved':'Returned',role,comments.trim(),app.revision,now)]}
}
export function resubmitDemo(app, role, text, expectedVersion, now = new Date().toISOString()) {
 if(role!=='FACULTY'||app.id!=='demo-1'||app.status!=='Returned') throw new Error('Only Demo Faculty A can correct this returned application.')
 if(app.version!==expectedVersion) throw new Error('This application changed. Reopen it.')
 if(typeof text!=='string'||!text.trim()||text.length>1000) throw new Error('Enter a self-appraisal of 1–1,000 characters.')
 const form={...app.form,selfAppraisal:text}; const revision=app.revision+1
 return {...app,form,revision,version:app.version+1,status:'UnderReview',stage:0,submittedAt:now,revisions:[...app.revisions,{revision,form:structuredClone(form),submittedAt:now}],history:[...app.history,event('Resubmitted','FACULTY','Corrected self-appraisal; restarted at HoD.',revision,now)]}
}
