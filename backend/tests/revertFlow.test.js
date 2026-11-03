const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ID='9FB401CC-FCF0-4F9D-AF74-9EF0D7C74DA6';
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode})};
function setup(stage=3){
 const codes=['HOD','DEAN_FW','DIRECTOR'];
 const route=codes.map((stage,i)=>({order:i+1,stage,roleId:350+i,roleMapId:360+i,organizationUnitId:153,userMapId:700+i,proofUserId:800+i,employeeBasicInfoId:'reviewer'+(i+1),username:'user'+(i+1),name:stage}));
 let db={status:['Submitted','HOD Recommended','Dean FW Recommended'][stage-1],steps:route.map((r,i)=>({WorkflowID:i+1,ReviewRound:1,StageOrder:i+1,StageCode:r.stage,StageStatus:i+1<stage?'Recommended':i+1===stage?'Pending':'Waiting',AssignedEmployeeBasicInfoId:r.employeeBasicInfoId,AssignedUserMapId:r.userMapId,AssignedUserId:r.proofUserId,RoleId:r.roleId,RoleMapId:r.roleMapId,OrganizationUnitId:153,AssignedUsername:r.username,AssignedName:r.name})),history:[]};
 const queries=[];let snapshot;
 class Request{
  constructor(){this.params={}}
  input(k,t,v){this.params[k]=v;return this}
  async query(q){
   queries.push(q);const p=this.params;
   if(q.includes('AS employee,CurrentStatus'))return{recordset:[{employee:'applicant',status:db.status}]};
   if(q.includes('SELECT W.*'))return{recordset:db.steps.filter(s=>s.WorkflowID===p.Step&&s.AssignedEmployeeBasicInfoId===p.Employee)};
   if(q.includes('SELECT W.WorkflowID'))return{recordset:db.steps.filter(s=>s.ReviewRound===p.Round&&s.StageOrder===p.Order)};
   if(q.includes('SELECT * FROM HR.'))return{recordset:db.steps.filter(s=>s.ReviewRound===p.Round&&s.StageOrder===p.Order)};
   if(q.includes('SELECT UM.UserMapId'))return{recordset:[{UserMapId:p.Map}]};
   if(q.includes('SELECT WorkflowID,ReviewRound'))return{recordset:db.steps};
   if(q.includes('INSERT HR.dbo.FacultyAppraisal_WorkflowHistory')){db.history.push({...p});return{recordset:[]}}
   if(q.includes('INSERT HR.dbo.FacultyAppraisal_Workflow(')){
    if(q.includes('SELECT AppraisalID,@Round')){
     const old=db.steps.filter(s=>s.ReviewRound===p.OldRound);
     for(const s of old)db.steps.push({...s,WorkflowID:db.steps.length+1,ReviewRound:p.Round,StageStatus:s.StageOrder<p.Target?'Recommended':s.StageOrder===p.Target?'Pending':'Waiting'});
    }else db.steps.push({WorkflowID:db.steps.length+1,ReviewRound:p.Round,StageOrder:p.Order,StageCode:p.Stage,StageStatus:p.Status,AssignedEmployeeBasicInfoId:p.Employee,AssignedUserMapId:p.UserMap,AssignedUserId:p.User,RoleId:p.Role,RoleMapId:p.RoleMap,OrganizationUnitId:p.Org,AssignedUsername:p.Username});
    return{recordset:[]};
   }
   if(q.includes('UPDATE HR.dbo.FacultyAppraisal_Workflow')){
    for(const s of db.steps){
     if(p.Step && s.WorkflowID===p.Step)s.StageStatus=p.Status || 'Returned';
     if(p.Round && !p.Order && s.ReviewRound===p.Round && s.StageStatus==='Waiting')s.StageStatus='Cancelled';
     if(p.Order && s.ReviewRound===p.Round && s.StageOrder===p.Order)s.StageStatus='Pending';
    }
    return{recordset:[]};
   }
   if(q.includes('UPDATE HR.dbo.FacultyAppraisalDetails')){db.status=p.Status;return{recordset:[]}}
   return{recordset:[]};
  }
 }
 class Transaction{async begin(){snapshot=structuredClone(db)}async commit(){}async rollback(){db=snapshot}}
 const sql={Request,Transaction,ISOLATION_LEVEL:{SERIALIZABLE:1},Int:1,MAX:-1,VarChar:()=>1,NVarChar:()=>1};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/repositories/appraisalApprovalRepository.js'),'utf8'),{module,Number,String,Math,
  require:id=>id==='../config/db'?{sql,poolPromise:Promise.resolve({})}:id==='../services/appraisalWorkflowService'?{resolveAppraisalApprovers:async()=>route}:{fail,GUID:/^[0-9a-f-]{36}$/i},
 });
 return{repo:module.exports,db:()=>db,queries,actor:n=>({employeeBasicInfoId:'reviewer'+n,username:'user'+n,name:codes[n-1]})};
}
for(const [stage,targets] of [[1,['FACULTY']],[2,['FACULTY','HOD']],[3,['FACULTY','HOD','DEAN_FW']]]){
 for(const target of targets)test(`stage ${stage} can return to ${target}`,async()=>{
  const m=setup(stage);await m.repo.takeAction(ID,m.actor(stage),{workflowId:stage,action:'return',returnTo:target,instructions:'Please correct this',comments:'Private review'});
  assert.equal(m.db().steps.find(s=>s.WorkflowID===stage).StageStatus,'Returned');
  assert.equal(m.db().history[0].Instructions,'Please correct this');
  assert.equal(m.db().history[0].Comments,'Private review');
  if(target==='FACULTY')assert.equal(m.db().status,'Returned to Faculty');
  else{const targetOrder=target==='HOD'?1:2;assert.equal(m.db().steps.find(s=>s.ReviewRound===2&&s.StageOrder===targetOrder).StageStatus,'Pending')}
 });
}
test('director return to HOD follows HOD then Dean then Director again',async()=>{
 const m=setup(3);await m.repo.takeAction(ID,m.actor(3),{workflowId:3,action:'return',returnTo:'HOD',instructions:'Reassess'});
 for(const n of [1,2,3]){
  const step=m.db().steps.find(s=>s.ReviewRound===2&&s.StageOrder===n);
  await m.repo.takeAction(ID,m.actor(n),{workflowId:step.WorkflowID,action:n===3?'approve':'recommend',comments:'Rechecked'});
 }
 assert.equal(m.db().status,'Approved');assert.equal(m.db().history.length,4);
 assert.equal(m.db().steps.find(s=>s.WorkflowID===3).StageStatus,'Returned');
});
test('faculty resubmission starts a fresh HOD round and preserves previous round',async()=>{
 const m=setup(3);await m.repo.takeAction(ID,m.actor(3),{workflowId:3,action:'return',returnTo:'FACULTY',instructions:'Correct title'});
 await m.repo.start({}, {appraisalId:ID,status:'Returned to Faculty'}, {employeeBasicInfoId:'applicant',username:'faculty',name:'Faculty'});
 assert.equal(m.db().steps.find(s=>s.ReviewRound===2&&s.StageOrder===1).StageStatus,'Pending');
 assert.equal(m.db().steps.find(s=>s.ReviewRound===2&&s.StageOrder===2).StageStatus,'Waiting');
 assert.equal(m.db().history[1].Action,'Resubmitted');
 assert.equal(m.db().steps.find(s=>s.WorkflowID===3).StageStatus,'Returned');
});
test('a reviewer cannot return to themselves or a later stage',()=>{
 const m=setup();
 assert.throws(()=>m.repo.returnTargetOrder('HOD','HOD'),/not allowed/);
 assert.throws(()=>m.repo.returnTargetOrder('DEAN_FW','DEAN_FW'),/not allowed/);
 assert.throws(()=>m.repo.returnTargetOrder('HOD','DEAN_FW'),/not allowed/);
});
test('return requires instructions and supports long Unicode without private comment requirement',()=>{
 const m=setup();assert.throws(()=>m.repo.validateAction({workflowId:1,action:'return',returnTo:'FACULTY',instructions:' '}),/required/);
 const text='ದಯವಿಟ್ಟು ಸರಿಪಡಿಸಿ '.repeat(3000);
 assert.equal(m.repo.validateAction({workflowId:1,action:'return',returnTo:'FACULTY',instructions:text}).instructions,text.trim());
});
test('stale action cannot return an already completed stage',async()=>{
 const m=setup(3);
 await assert.rejects(m.repo.takeAction(ID,m.actor(1),{workflowId:1,action:'return',returnTo:'FACULTY',instructions:'late'}),/already changed/);
 assert.equal(m.db().status,'Dean FW Recommended');
});
test('closed-window exception is restricted to database Returned to Faculty status',async()=>{
 const module={exports:{}};
 class Request{input(){return this}async query(){return{recordset:[{isPublished:true,isOpen:false}]}}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/services/fwPeriodAccess.js'),'utf8'),{module,Boolean,require:id=>id==='../config/db'?{sql:{Request,Int:1}}:{fail}});
 await module.exports.requireEditableWindow({},13,'Returned to Faculty');
 await assert.rejects(module.exports.requireEditableWindow({},13,'Draft'),/closed/);
});
