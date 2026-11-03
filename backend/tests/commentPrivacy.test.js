const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const event={id:1,stage:'HOD',action:'Recommended',actorName:'HOD',actionAt:'2026-11-02T04:00:00Z',comments:'CONFIDENTIAL REVIEW'};
const fail=(message,statusCode)=>{throw Object.assign(new Error(message),{statusCode})};
function repository(owner='applicant',accessible=true){
 class Request{input(){return this}async query(q){
  if(q.includes('FacultyAppraisalDetails A WHERE'))return{recordset:accessible?[{applicantEmployeeBasicInfoId:owner}]:[]};
  return{recordset:[{...event}]};
 }}
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/repositories/appraisalApprovalRepository.js'),'utf8'),{
  module,require:id=>id==='../config/db'?{sql:{Request,VarChar:()=>1,NVarChar:()=>1}}:
   id==='../services/appraisalDraftValidation'?{fail,GUID:/^[0-9a-f-]{36}$/i}:{},
  String,
 });
 return module.exports;
}
const id='9FB401CC-FCF0-4F9D-AF74-9EF0D7C74DA6';
test('applicant sees actions and dates but no comment field or content',async()=>{
 const rows=await repository().history({},id,{employeeBasicInfoId:'applicant',username:'faculty'});
 assert.equal(rows[0].action,'Recommended');
 assert.equal(rows[0].actorName,'HOD');
 assert.equal(rows[0].actionAt,event.actionAt);
 assert.equal(Object.hasOwn(rows[0],'comments'),false);
 assert.equal(JSON.stringify(rows).includes('CONFIDENTIAL'),false);
});
test('authorized reviewer retains full comments',async()=>{
 const rows=await repository().history({},id,{employeeBasicInfoId:'reviewer',username:'hod'});
 assert.equal(rows[0].comments,event.comments);
});
test('applicant with reviewer/FW role still cannot see own review comments',async()=>{
 const rows=await repository('APPLICANT').history({},id,{employeeBasicInfoId:'applicant',username:'faculty',canReview:true,canManageAppraisalPeriods:true});
 assert.equal(Object.hasOwn(rows[0],'comments'),false);
});
test('unauthorized caller is rejected before comments are returned',async()=>{
 await assert.rejects(repository('applicant',false).history({},id,{employeeBasicInfoId:'outsider',username:'x'}),/not accessible/);
});
test('current/draft/save/submission record serializer strips comments',async()=>{
 class Request{input(){return this}async query(q){return{recordset:q.includes('WorkflowHistory')?[{...event}]:[]}}}
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/repositories/appraisalDraftRepository.js'),'utf8'),{
  module,Object,
  require:id=>{
   if(id==='../config/db')return{sql:{Request,VarChar:()=>1}};
   if(id==='../services/appraisalSubmissionValidation')return{draftToken:()=> 'token'};
   if(id==='./appraisalRDRepository')return{readAll:async()=>({})};
   if(id==='./appraisalExtraRepository')return{readAll:async()=>({text:{},rows:{}})};
   if(id==='../services/appraisalDraftValidation')return{groups:{},narratives:{},fail};
   return{};
  },
 });
 const record=await module.exports.readRecord({}, {appraisalId:id,academicYearId:13,status:'Submitted'});
 assert.equal(record.history[0].action,'Recommended');
 assert.equal(Object.hasOwn(record.history[0],'comments'),false);
 assert.equal(JSON.stringify(record).includes('CONFIDENTIAL'),false);
});
test('faculty sees only explicit correction instructions on a faculty return',async()=>{
 const before={...event};Object.assign(event,{action:'Returned to Faculty',correctionInstructions:'Correct the project title'});
 try{
  const rows=await repository().history({},id,{employeeBasicInfoId:'applicant',username:'faculty'});
  assert.equal(rows[0].correctionInstructions,'Correct the project title');
  assert.equal(Object.hasOwn(rows[0],'comments'),false);
  assert.equal(JSON.stringify(rows).includes('CONFIDENTIAL'),false);
 }finally{Object.assign(event,before);delete event.correctionInstructions;}
});
test('faculty cannot see correction directions exchanged between reviewers',async()=>{
 const before={...event};Object.assign(event,{action:'Returned to HOD',correctionInstructions:'Internal reassessment instruction'});
 try{
  const rows=await repository().history({},id,{employeeBasicInfoId:'applicant',username:'faculty'});
  assert.equal(Object.hasOwn(rows[0],'correctionInstructions'),false);
  assert.equal(JSON.stringify(rows).includes('Internal reassessment'),false);
 }finally{Object.assign(event,before);delete event.correctionInstructions;}
});
