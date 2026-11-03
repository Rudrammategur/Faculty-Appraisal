const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode})};
const GUID=/^[0-9a-f-]{36}$/i;
function moduleAt(file,deps,env={}){
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{
  module,require:id=>deps[id],process:{env},Number,String,Object,JSON,Date,Error,
 });
 return module.exports;
}
const config=moduleAt('config/appraisalWorkflow.js',{},{
 APPRAISAL_HOD_DEPARTMENTS:JSON.stringify({'department-cse':359}),
});
test('route is department HOD then Dean FW 379 then Director 170',()=>{
 const route=config.getAppraisalRoute('department-cse');
 assert.equal(route[0].roleMapId,368);
 assert.equal(route[1].roleMapId,379);
 assert.equal(route[2].roleMapId,170);
});
test('unverified department and chemical mapping fail explicitly',()=>{
 assert.throws(()=>config.getAppraisalRoute('unmapped'),/No verified HOD/);
});
function actionMock({stage='HOD',status='Submitted',self=false,assigned=true,pending=true,nextLive=true,routeFailure=false}={}){
 const queries=[];let commits=0,rollbacks=0;
 const step={WorkflowID:1,ReviewRound:1,StageOrder:stage==='HOD'?1:stage==='DEAN_FW'?2:3,
 StageCode:stage,StageStatus:pending?'Pending':'Recommended',AssignedUserMapId:5512};
 class Request{
  input(){return this}
  async query(q){
   queries.push(q);
   if(q.includes('AS employee,CurrentStatus'))return{recordset:[{employee:self?'reviewer':'applicant',status}]};
   if(q.includes('SELECT W.*'))return{recordset:assigned?[step]:[]};
   if(q.includes('SELECT * FROM HR.'))return{recordset:[{StageStatus:'Waiting',AssignedUserMapId:5523,AssignedUserId:307,RoleId:189,RoleMapId:379,OrganizationUnitId:122}]};
   if(q.includes('SELECT UM.UserMapId'))return{recordset:nextLive?[{UserMapId:5523}]:[]};
   return{recordset:[],rowsAffected:[1]};
  }
 }
 class Transaction{async begin(){}async commit(){commits++}async rollback(){rollbacks++}}
 const sql={Request,Transaction,ISOLATION_LEVEL:{SERIALIZABLE:1},Int:1,MAX:-1,NVarChar:()=>1,VarChar:()=>1};
 const repo=moduleAt('repositories/appraisalApprovalRepository.js',{
  '../config/db':{sql,poolPromise:Promise.resolve({})},
  '../services/appraisalWorkflowService':{resolveAppraisalApprovers:async()=>{
   if(routeFailure)throw new Error('Missing HOD mapping');
   return ['HOD','DEAN_FW','DIRECTOR'].map((stage,i)=>({order:i+1,stage,roleId:359,roleMapId:368,organizationUnitId:153,userMapId:100+i,proofUserId:200+i,employeeBasicInfoId:'reviewer-'+i,username:'reviewer-'+i,name:'Reviewer'}));
  }},
  '../services/appraisalDraftValidation':{fail,GUID},
 });
 return{repo,queries,outcome:()=>({commits,rollbacks})};
}
const id='9FB401CC-FCF0-4F9D-AF74-9EF0D7C74DA6';
const actor={employeeBasicInfoId:'reviewer',username:'hod',name:'HOD'};
test('long Unicode comments accepted without truncating',()=>{
 const m=actionMock();
 const text='ಕನ್ನಡ review '.repeat(10000);
 assert.equal(m.repo.validateAction({workflowId:1,action:'recommend',comments:text}).comments,text.trim());
 assert.throws(()=>m.repo.validateAction({workflowId:1,action:'recommend',comments:' '}),/required/);
});
test('HOD recommendation commits history and activates next stage',async()=>{
 const m=actionMock();
 const r=await m.repo.takeAction(id,actor,{workflowId:1,action:'recommend',comments:'Detailed recommendation'});
 assert.equal(r.status,'HOD Recommended');
 assert.equal(m.outcome().commits,1);
 assert(m.queries.some(q=>q.includes('WorkflowHistory')));
 assert(m.queries.some(q=>q.includes("SET StageStatus='Pending'")));
});
test('Dean forwards only from HOD Recommended',async()=>{
 const m=actionMock({stage:'DEAN_FW',status:'HOD Recommended'});
 const r=await m.repo.takeAction(id,actor,{workflowId:1,action:'recommend',comments:'Dean comments'});
 assert.equal(r.status,'Dean FW Recommended');
});
test('Director final approval completes chain without another pending stage',async()=>{
 const m=actionMock({stage:'DIRECTOR',status:'Dean FW Recommended'});
 const r=await m.repo.takeAction(id,actor,{workflowId:1,action:'approve',comments:'Approved with observations'});
 assert.equal(r.status,'Approved');
 assert.equal(m.queries.some(q=>q.includes("SET StageStatus='Pending'")),false);
});
test('duplicate or stale action rolls back',async()=>{
 const m=actionMock({pending:false});
 await assert.rejects(m.repo.takeAction(id,actor,{workflowId:1,action:'recommend',comments:'Repeated'}),/already changed/);
 assert.equal(m.outcome().commits,0);assert.equal(m.outcome().rollbacks,1);
});
test('unassigned reviewer cannot act',async()=>{
 const m=actionMock({assigned:false});
 await assert.rejects(m.repo.takeAction(id,actor,{workflowId:1,action:'recommend',comments:'Wrong actor'}),/not assigned/);
});
test('self approval blocked',async()=>{
 const m=actionMock({self:true});
 await assert.rejects(m.repo.takeAction(id,actor,{workflowId:1,action:'recommend',comments:'Self'}),/Self-approval/);
});
test('stage cannot be skipped',async()=>{
 const m=actionMock();
 await assert.rejects(m.repo.takeAction(id,actor,{workflowId:1,action:'approve',comments:'Skip'}),/not allowed/);
});
test('inactive next assignment rolls back without writing history',async()=>{
 const m=actionMock({nextLive:false});
 await assert.rejects(m.repo.takeAction(id,actor,{workflowId:1,action:'recommend',comments:'Forward'}),/inactive/);
 assert.equal(m.queries.some(q=>q.includes('INSERT HR.')),false);
});

test('submission startup creates all three assignments and history',async()=>{
 const m=actionMock();
 await m.repo.start({}, {appraisalId:id}, {employeeBasicInfoId:'applicant',username:'faculty',name:'Faculty'});
 assert.equal(m.queries.filter(q=>q.includes('INSERT HR.dbo.FacultyAppraisal_Workflow(')).length,3);
 assert.equal(m.queries.filter(q=>q.includes('INSERT HR.dbo.FacultyAppraisal_WorkflowHistory')).length,1);
});
test('missing reviewer prevents any workflow inserts',async()=>{
 const m=actionMock({routeFailure:true});
 await assert.rejects(m.repo.start({}, {appraisalId:id}, actor),/Missing HOD/);
 assert.equal(m.queries.some(q=>q.includes('INSERT HR.')),false);
});
