const { test }=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const path=require('node:path');const V=require('../src/services/appraisalSubmissionValidation');
const user={employeeBasicInfoId:'5C907F63-AC2D-4DDA-AB4F-33BDD93AFDA3',username:'faculty',departmentId:'dept'};
const id='9FB401CC-FCF0-4F9D-AF74-9EF0D7C74DA6';
function fixture({open=true,already=false,token='a'.repeat(64),routeError=false}={}) {
 const events=[];let inserted=already;
 const record=()=>({appraisalId:id,status:inserted?'UnderReview':'Draft',draftToken:token,submittedAt:inserted?'2026-10-30T00:00:00Z':null,formData:{rows:{}}});
 class Transaction {async begin(){events.push('begin')}async commit(){events.push('commit')}async rollback(){events.push('rollback')}}
 class Request {constructor(){} input(){return this}async query(q){
   events.push(q);
   if(q.startsWith('SELECT AppraisalID FROM')) return{recordset:inserted?[{AppraisalID:id}]:[]};
   if(q.includes('SELECT CycleID')) return{recordset:open?[{CycleID:1}]:[]};
   if(q.includes('SELECT LastNumber')) return{recordset:[]};
   if(q.includes('INSERT HR.dbo.FacultyAppraisal_Submission(')) inserted=true;
   return{recordset:[]};
 }}
 const sql={Transaction,Request,ISOLATION_LEVEL:{SERIALIZABLE:1},VarChar:()=>{},NVarChar:()=>{},Char:()=>{},Int:1,BigInt:2};
 const steps=['HOD','DEAN_FW','DIRECTOR'].map((stage,index)=>({stage,order:index+1,employeeBasicInfoId:`00000000-0000-0000-0000-00000000000${index+1}`,label:stage,proofUserId:index+1}));
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/repositories/appraisalSubmissionRepository.js'),'utf8'),{module,require:name=>{
  if(name==='../config/db')return{sql,poolPromise:Promise.resolve({})};
  if(name==='../services/appraisalDraftValidation')return{fail:(m,s=400)=>{throw Object.assign(new Error(m),{statusCode:s})}};
  if(name==='../services/appraisalSubmissionValidation')return V;
  if(name==='../services/appraisalWorkflowService')return{resolveAppraisalApprovers:async()=>{events.push('resolve');if(routeError)throw Error('Mapping invalid');return steps}};
  if(name==='./appraisalDraftRepository')return{readForSubmission:async()=>record()};
  throw Error(name);
 }});
 return{repository:module.exports,events};
}
const period={academicYearId:13,reportingFrom:'2025-08-01'};
const body={appraisalId:id,confirmed:true,draftToken:'a'.repeat(64)};
test('first submit commits one number, three assignments and history',async()=>{
 const {repository,events}=fixture();const result=await repository.submit(user,period,body);
 assert.equal(result.record.status,'UnderReview');assert.equal(result.alreadySubmitted,false);
 assert.equal(events.filter(q=>q.includes('INSERT HR.dbo.FacultyAppraisal_ApprovalSteps')).length,3);
 assert.equal(events.filter(q=>q.includes('INSERT HR.dbo.FacultyAppraisal_NumberCounter')).length,1);
 assert(events.some(q=>q.includes('INSERT HR.dbo.FacultyAppraisal_ActionHistory')));assert.equal(events.at(-1),'commit');
});
test('duplicate submission returns original without number or assignment writes',async()=>{
 const {repository,events}=fixture({already:true});const result=await repository.submit(user,period,body);
 assert.equal(result.alreadySubmitted,true);assert(!events.includes('resolve'));assert(!events.some(q=>q.includes('INSERT')));assert.equal(events.at(-1),'commit');
});
test('closed window, changed draft and invalid approvers roll back before numbering',async()=>{
 for(const options of [{open:false},{token:'b'.repeat(64)},{routeError:true}]){
  const {repository,events}=fixture(options);await assert.rejects(repository.submit(user,period,body));
  assert.equal(events.at(-1),'rollback');assert(!events.some(q=>q.includes('INSERT')));
 }
});
