const {sql,poolPromise}=require('../config/db');
const {resolveAppraisalApprovers}=require('../services/appraisalWorkflowService');
const {fail}=require('../services/appraisalDraftValidation');
const {GUID}=require('../services/appraisalDraftValidation');
function validId(id){if(!GUID.test(String(id)))fail('Invalid appraisal ID.');}
const r=(connection,id)=>new sql.Request(connection).input('Id',sql.VarChar(36),id);
const active=`EXISTS(SELECT 1 FROM Proof.dbo.OrgUnitUserMapping UM
 JOIN Proof.dbo.OrgUnitRoleMapping RM ON RM.RoleMapId=UM.RoleMapId AND RM.IsActive=1
 JOIN Proof.dbo.UserMaster U ON U.UserId=UM.UserId AND U.IsLockedOut=0
 WHERE UM.UserMapId=W.AssignedUserMapId AND UM.UserId=W.AssignedUserId AND UM.IsActive=1
 AND RM.RoleId=W.RoleId AND RM.RoleMapId=W.RoleMapId AND RM.OrganizationUnitId=W.OrganizationUnitId
 AND LTRIM(RTRIM(U.UserName))=@Username)`;
async function historyEvent(connection,id,actor,values){
 await r(connection,id).input('Step',sql.Int,values.workflowId || null).input('Round',sql.Int,values.round)
 .input('Stage',sql.VarChar(10),values.stage).input('Action',sql.VarChar(30),values.action)
 .input('Employee',sql.VarChar(36),actor.employeeBasicInfoId).input('UserMap',sql.Int,values.userMapId || null)
 .input('Username',sql.NVarChar(256),actor.username).input('Name',sql.NVarChar(250),actor.name || actor.username)
 .input('Comments',sql.NVarChar(sql.MAX),values.comments || null)
 .input('Instructions',sql.NVarChar(sql.MAX),values.instructions || null)
 .input('Previous',sql.VarChar(20),values.previous).input('Next',sql.VarChar(20),values.next)
 .query(`INSERT HR.dbo.FacultyAppraisal_WorkflowHistory
 (AppraisalID,WorkflowID,ReviewRound,StageCode,Action,ActorEmployeeBasicInfoId,ActorUserMapId,ActorUsername,ActorName,Comments,CorrectionInstructions,PreviousStatus,NewStatus)
 VALUES(@Id,@Step,@Round,@Stage,@Action,@Employee,@UserMap,@Username,@Name,@Comments,@Instructions,@Previous,@Next);`);
}
async function start(connection,record,user,legacyActor=null){
 const exists=await r(connection,record.appraisalId).query('SELECT WorkflowID,ReviewRound FROM HR.dbo.FacultyAppraisal_Workflow WHERE AppraisalID=@Id;');
 if(exists.recordset.length && record.status!=='Returned to Faculty')fail('A workflow already exists for this application.',409);
 const round=exists.recordset.length?Math.max(...exists.recordset.map(row=>row.ReviewRound))+1:1;
 const approvers=await resolveAppraisalApprovers(user,connection);
 for(const step of approvers){
  await r(connection,record.appraisalId)
  .input('Round',sql.Int,round).input('Order',sql.Int,step.order).input('Stage',sql.VarChar(10),step.stage)
  .input('Role',sql.Int,step.roleId).input('RoleMap',sql.Int,step.roleMapId).input('Org',sql.Int,step.organizationUnitId)
  .input('UserMap',sql.Int,step.userMapId).input('User',sql.Int,step.proofUserId)
  .input('Employee',sql.VarChar(36),step.employeeBasicInfoId).input('Username',sql.NVarChar(256),step.username)
  .input('Name',sql.NVarChar(250),step.name || step.username).input('Status',sql.VarChar(20),step.order===1?'Pending':'Waiting')
  .query(`INSERT HR.dbo.FacultyAppraisal_Workflow(AppraisalID,ReviewRound,StageOrder,StageCode,RoleId,RoleMapId,OrganizationUnitId,
   AssignedUserMapId,AssignedUserId,AssignedEmployeeBasicInfoId,AssignedUsername,AssignedName,StageStatus)
   VALUES(@Id,@Round,@Order,@Stage,@Role,@RoleMap,@Org,@UserMap,@User,@Employee,@Username,@Name,@Status);`);
 }
 await historyEvent(connection,record.appraisalId,legacyActor || user,{round,stage:'FACULTY',action:legacyActor?'Workflow Enrolled':record.status==='Returned to Faculty'?'Resubmitted':'Submitted',previous:legacyActor?'Submitted':record.status==='Returned to Faculty'?'Returned to Faculty':'Draft',next:'Submitted',comments:legacyActor?'FW Office enrolled a previously submitted application. Original submission time was not stored.':null});
 return approvers;
}
async function access(connection,id,user){
 validId(id);
 const found=await r(connection,id).input('Employee',sql.VarChar(36),user.employeeBasicInfoId).input('Username',sql.NVarChar(256),user.username)
 .query(`SELECT A.AppraisalID AS appraisalId,A.AcademicYearID AS academicYearId,A.CurrentStatus AS status,
 A.CreatedOn AS createdOn,A.Employeebasicinfoid AS applicantEmployeeBasicInfoId
 FROM HR.dbo.FacultyAppraisalDetails A WHERE A.AppraisalID=@Id AND
 (A.Employeebasicinfoid=@Employee OR EXISTS(SELECT 1 FROM HR.dbo.FacultyAppraisal_Workflow W
 WHERE W.AppraisalID=A.AppraisalID AND W.AssignedEmployeeBasicInfoId=@Employee
 AND W.StageStatus IN ('Pending','Recommended','Approved','Returned') AND ${active}));`);
 if(found.recordset.length!==1)fail('Application not found or not accessible.',404);
 return found.recordset[0];
}
async function steps(connection,id){
 return(await r(connection,id).query(`SELECT WorkflowID AS workflowId,ReviewRound AS reviewRound,StageOrder AS stageOrder,
 StageCode AS stage,AssignedName AS assignedName,StageStatus AS status,AssignedOn AS assignedOn,CompletedOn AS completedOn
 FROM HR.dbo.FacultyAppraisal_Workflow WHERE AppraisalID=@Id ORDER BY ReviewRound,StageOrder;`)).recordset;
}
async function history(connection,id,user){
 const application=await access(connection,id,user);
 const isApplicant=String(application.applicantEmployeeBasicInfoId).trim().toLowerCase()===
  String(user.employeeBasicInfoId).trim().toLowerCase();
 const rows=(await r(connection,id).query(`SELECT HistoryID AS id,ReviewRound AS reviewRound,StageCode AS stage,
 Action AS action,ActorName AS actorName,Comments AS comments,CorrectionInstructions AS correctionInstructions,ActionOn AS actionAt,
 PreviousStatus AS previousStatus,NewStatus AS newStatus
 FROM HR.dbo.FacultyAppraisal_WorkflowHistory WHERE AppraisalID=@Id ORDER BY HistoryID;`)).recordset;
 // Ownership wins even when the applicant also has reviewer or office roles.
 return isApplicant?rows.map(({comments,correctionInstructions,...event})=>event.action==='Returned to Faculty'?{...event,correctionInstructions}:event):rows;
}
async function pending(user){
 const pool=await poolPromise;
 return(await new sql.Request(pool).input('Employee',sql.VarChar(36),user.employeeBasicInfoId).input('Username',sql.NVarChar(256),user.username)
 .query(`SELECT W.WorkflowID AS workflowId,W.AppraisalID AS appraisalId,W.StageCode AS stage,W.ReviewRound AS reviewRound,
 A.AcademicYearID AS academicYearId,Y.AcademicYear AS academicYear,A.CurrentStatus AS status,
 (SELECT MIN(SH.ActionOn) FROM HR.dbo.FacultyAppraisal_WorkflowHistory SH WHERE SH.AppraisalID=A.AppraisalID AND SH.StageCode='FACULTY' AND SH.Action='Submitted') AS submittedAt,
 W.AssignedOn AS assignedOn,E.EmployeeName AS applicantName,E.DepartmentName AS departmentName
 FROM HR.dbo.FacultyAppraisal_Workflow W JOIN HR.dbo.FacultyAppraisalDetails A ON A.AppraisalID=W.AppraisalID
 JOIN Academics.dbo.AcademicYearDetails Y ON Y.AcademicYearID=A.AcademicYearID
 OUTER APPLY(SELECT MAX(EmployeeName) AS EmployeeName,MAX(DepartmentName) AS DepartmentName FROM HR.dbo.VW_EmployeeBasicDetails
 WHERE EmployeeBasicInfoId=A.Employeebasicinfoid) E
 WHERE W.StageStatus='Pending' AND W.AssignedEmployeeBasicInfoId=@Employee
 AND A.Employeebasicinfoid<>@Employee AND ${active} ORDER BY W.AssignedOn;`)).recordset;
}
const transitions={
 HOD:{expected:'Submitted',action:'recommend',next:'HOD Recommended',completed:'Recommended'},
 DEAN_FW:{expected:'HOD Recommended',action:'recommend',next:'Dean FW Recommended',completed:'Recommended'},
 DIRECTOR:{expected:'Dean FW Recommended',action:'approve',next:'Approved',completed:'Approved'},
};
function validateAction(body){
 if(!Number.isSafeInteger(body?.workflowId) || body.workflowId<1)fail('A valid workflowId is required.');
 if(!['recommend','approve','return'].includes(body.action))fail('Invalid action.');
 if(body.action==='return'){
  if(typeof body.instructions!=='string' || !body.instructions.trim())fail('Correction instructions are required.');
  if(!['FACULTY','HOD','DEAN_FW'].includes(body.returnTo))fail('Select a return recipient.');
  if(body.instructions.length>500000)fail('Correction instructions exceed 500,000 characters.');
  if(body.comments!=null && typeof body.comments!=='string')fail('Private comments must be text.');
 }else if(typeof body.comments!=='string' || !body.comments.trim())fail('Comments are required.');
 // NVARCHAR(MAX) storage; bounded request size avoids an accidental oversized request.
 if((body.comments || '').length>500000)fail('Comments exceed the supported 500,000-character request limit.');
 return {...body,comments:(body.comments || '').trim(),instructions:(body.instructions || '').trim()};
}
function returnTargetOrder(stage,target){
 const allowed={HOD:['FACULTY'],DEAN_FW:['FACULTY','HOD'],DIRECTOR:['FACULTY','HOD','DEAN_FW']};
 if(!allowed[stage]?.includes(target))fail('This return recipient is not allowed at your stage.');
 return {FACULTY:0,HOD:1,DEAN_FW:2}[target];
}
async function returnApplication(tx,id,user,step,input,previousStatus){
 const target=returnTargetOrder(step.StageCode,input.returnTo);
 if(target){
  const targetRow=(await r(tx,id).input('Round',sql.Int,step.ReviewRound).input('Order',sql.Int,target)
   .query(`SELECT W.WorkflowID FROM HR.dbo.FacultyAppraisal_Workflow W
    WHERE W.AppraisalID=@Id AND W.ReviewRound=@Round AND W.StageOrder=@Order AND EXISTS(
     SELECT 1 FROM Proof.dbo.OrgUnitUserMapping UM JOIN Proof.dbo.OrgUnitRoleMapping RM
      ON RM.RoleMapId=UM.RoleMapId AND RM.IsActive=1
     JOIN Proof.dbo.UserMaster U ON U.UserId=UM.UserId AND U.IsLockedOut=0
     WHERE UM.UserMapId=W.AssignedUserMapId AND UM.UserId=W.AssignedUserId AND UM.IsActive=1
      AND RM.RoleMapId=W.RoleMapId AND RM.RoleId=W.RoleId AND RM.OrganizationUnitId=W.OrganizationUnitId);`)).recordset;
  if(targetRow.length!==1)fail('The return recipient mapping is inactive or missing.',409);
 }
 const nextStatus=target===0?'Returned to Faculty':target===1?'Submitted':'HOD Recommended';
 const action=target===0?'Returned to Faculty':target===1?'Returned to HOD':'Returned to Dean FW';
 await r(tx,id).input('Step',sql.Int,step.WorkflowID).query(`UPDATE HR.dbo.FacultyAppraisal_Workflow
  SET StageStatus='Returned',CompletedOn=SYSUTCDATETIME() WHERE AppraisalID=@Id AND WorkflowID=@Step;`);
 await r(tx,id).input('Round',sql.Int,step.ReviewRound).query(`UPDATE HR.dbo.FacultyAppraisal_Workflow
  SET StageStatus='Cancelled' WHERE AppraisalID=@Id AND ReviewRound=@Round AND StageStatus='Waiting';`);
 if(target){
  const round=step.ReviewRound+1;
  // New cycle preserves completed rows in the old round. Stages before the target
  // carry their prior recommendation; target and later stages must review again.
  await r(tx,id).input('Round',sql.Int,round).input('OldRound',sql.Int,step.ReviewRound).input('Target',sql.Int,target)
   .query(`INSERT HR.dbo.FacultyAppraisal_Workflow(AppraisalID,ReviewRound,StageOrder,StageCode,RoleId,RoleMapId,OrganizationUnitId,
    AssignedUserMapId,AssignedUserId,AssignedEmployeeBasicInfoId,AssignedUsername,AssignedName,StageStatus,AssignedOn,CompletedOn)
    SELECT AppraisalID,@Round,StageOrder,StageCode,RoleId,RoleMapId,OrganizationUnitId,
     AssignedUserMapId,AssignedUserId,AssignedEmployeeBasicInfoId,AssignedUsername,AssignedName,
     CASE WHEN StageOrder<@Target THEN 'Recommended' WHEN StageOrder=@Target THEN 'Pending' ELSE 'Waiting' END,
     SYSUTCDATETIME(),CASE WHEN StageOrder<@Target THEN CompletedOn ELSE NULL END
    FROM HR.dbo.FacultyAppraisal_Workflow WHERE AppraisalID=@Id AND ReviewRound=@OldRound;`);
 }
 await r(tx,id).input('Status',sql.VarChar(20),nextStatus).query('UPDATE HR.dbo.FacultyAppraisalDetails SET CurrentStatus=@Status WHERE AppraisalID=@Id;');
 await historyEvent(tx,id,user,{workflowId:step.WorkflowID,round:step.ReviewRound,stage:step.StageCode,
  action,userMapId:step.AssignedUserMapId,comments:input.comments,instructions:input.instructions,previous:previousStatus,next:nextStatus});
 return{appraisalId:id,status:nextStatus,returnedTo:input.returnTo};
}
async function takeAction(id,user,body){
 validId(id);const input=validateAction(body);
 const tx=new sql.Transaction(await poolPromise);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try{
  // Lock the master first, matching draft/submission lock order.
  const master=(await r(tx,id).query('SELECT Employeebasicinfoid AS employee,CurrentStatus AS status FROM HR.dbo.FacultyAppraisalDetails WITH(UPDLOCK,HOLDLOCK) WHERE AppraisalID=@Id;')).recordset[0];
  if(!master)fail('Application not found.',404);
  if(master.employee.toLowerCase()===user.employeeBasicInfoId.toLowerCase())fail('Self-approval is not allowed.',403);
  const found=await r(tx,id).input('Step',sql.Int,input.workflowId).input('Employee',sql.VarChar(36),user.employeeBasicInfoId)
   .input('Username',sql.NVarChar(256),user.username)
   .query(`SELECT W.* FROM HR.dbo.FacultyAppraisal_Workflow W WITH(UPDLOCK,HOLDLOCK)
    WHERE W.AppraisalID=@Id AND W.WorkflowID=@Step AND W.AssignedEmployeeBasicInfoId=@Employee AND ${active};`);
  const step=found.recordset[0];
  if(!step)fail('This review is not assigned to you or its ERP mapping is inactive.',403);
  const rule=transitions[step.StageCode];
  if(step.StageStatus!=='Pending' || !rule || master.status!==rule.expected)fail('This stage has already changed. Refresh the pending list.',409);
  if(input.action==='return'){
   const result=await returnApplication(tx,id,user,step,input,master.status);
   await tx.commit();return result;
  }
  if(input.action!==rule.action)fail('This action is not allowed at this stage.');
  if(step.StageOrder<3){
   const next=(await r(tx,id).input('Round',sql.Int,step.ReviewRound).input('Order',sql.Int,step.StageOrder+1)
    .query('SELECT * FROM HR.dbo.FacultyAppraisal_Workflow WITH(UPDLOCK,HOLDLOCK) WHERE AppraisalID=@Id AND ReviewRound=@Round AND StageOrder=@Order;')).recordset[0];
   if(!next || next.StageStatus!=='Waiting')fail('Next review stage is not available.',409);
   // Validate the next saved assignment remains active; do not silently reassign.
   const live=await new sql.Request(tx).input('Map',sql.Int,next.AssignedUserMapId).input('User',sql.Int,next.AssignedUserId)
    .input('Role',sql.Int,next.RoleId).input('RoleMap',sql.Int,next.RoleMapId).input('Org',sql.Int,next.OrganizationUnitId)
    .query(`SELECT UM.UserMapId FROM Proof.dbo.OrgUnitUserMapping UM
     JOIN Proof.dbo.OrgUnitRoleMapping RM ON RM.RoleMapId=UM.RoleMapId AND RM.IsActive=1
     JOIN Proof.dbo.UserMaster U ON U.UserId=UM.UserId AND U.IsLockedOut=0
     WHERE UM.UserMapId=@Map AND UM.UserId=@User AND UM.IsActive=1 AND RM.RoleId=@Role AND RM.RoleMapId=@RoleMap AND RM.OrganizationUnitId=@Org;`);
   if(live.recordset.length!==1)fail('Next reviewer mapping is inactive. Contact ERP support before forwarding.',409);
  }
  await r(tx,id).input('Step',sql.Int,step.WorkflowID).input('Status',sql.VarChar(20),rule.completed)
   .query("UPDATE HR.dbo.FacultyAppraisal_Workflow SET StageStatus=@Status,CompletedOn=SYSUTCDATETIME() WHERE AppraisalID=@Id AND WorkflowID=@Step;");
  if(step.StageOrder<3)await r(tx,id).input('Round',sql.Int,step.ReviewRound).input('Order',sql.Int,step.StageOrder+1)
   .query("UPDATE HR.dbo.FacultyAppraisal_Workflow SET StageStatus='Pending',AssignedOn=SYSUTCDATETIME() WHERE AppraisalID=@Id AND ReviewRound=@Round AND StageOrder=@Order;");
  await r(tx,id).input('Status',sql.VarChar(20),rule.next).query('UPDATE HR.dbo.FacultyAppraisalDetails SET CurrentStatus=@Status WHERE AppraisalID=@Id;');
  await historyEvent(tx,id,user,{workflowId:step.WorkflowID,round:step.ReviewRound,stage:step.StageCode,
   action:rule.completed,userMapId:step.AssignedUserMapId,comments:input.comments,previous:master.status,next:rule.next});
  await tx.commit();return{appraisalId:id,status:rule.next};
 }catch(error){try{await tx.rollback();}catch{}throw error;}
}
module.exports={returnTargetOrder,start,access,steps,history,pending,takeAction,transitions,validateAction,historyEvent};
