const { sql, poolPromise } = require('../config/db');
const { fail } = require('../services/appraisalDraftValidation');
const V = require('../services/appraisalSubmissionValidation');
const { resolveAppraisalApprovers } = require('../services/appraisalWorkflowService');
const draftRepository = require('./appraisalDraftRepository');
const request=(tx,id)=>new sql.Request(tx).input('Id',sql.VarChar(36),id);
async function submit(user,period,body) {
  V.validateRequest(body);
  const tx=new sql.Transaction(await poolPromise);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    // This locks the same master row used by saveDraft and document writes.
    const record=await draftRepository.readForSubmission(tx,user,period);
    if(!record || record.appraisalId.toLowerCase()!==body.appraisalId.toLowerCase()) fail('Application not found.',404);
    const existing=await request(tx,record.appraisalId).query('SELECT AppraisalID FROM HR.dbo.FacultyAppraisal_Submission WHERE AppraisalID=@Id;');
    if(existing.recordset.length) {
      if(!record.submittedAt || record.status==='Draft') fail('Submission metadata is inconsistent. Contact ERP support.',409);
      await tx.commit();
      return {record,alreadySubmitted:true};
    }
    if(record.status!=='Draft') fail('Only a Draft application can be submitted.',409);
    if(record.draftToken!==body.draftToken) fail('The draft changed after your last save. Reload and review before submitting.',409);
    V.validateFinal(record.formData);
    // Fail closed until FW has configured and published this year's window.
    const cycle=await new sql.Request(tx).input('Year',sql.Int,period.academicYearId).query(`
      SELECT CycleID FROM HR.dbo.FacultyAppraisal_CycleSettings WITH(UPDLOCK,HOLDLOCK)
      WHERE AcademicYearID=@Year AND IsPublished=1
        AND SYSUTCDATETIME()>=ApplicationStartAt AND SYSUTCDATETIME()<ApplicationEndAt;`);
    if(cycle.recordset.length!==1) fail('The application submission window is not open. Contact Faculty Welfare Office.',409);
    const approvers=await resolveAppraisalApprovers(user);
    V.validateApprovers(approvers,user.employeeBasicInfoId);
    const counter=await new sql.Request(tx).input('Year',sql.Int,period.academicYearId).query(`
      SELECT LastNumber FROM HR.dbo.FacultyAppraisal_NumberCounter WITH(UPDLOCK,HOLDLOCK) WHERE AcademicYearID=@Year;`);
    const number=counter.recordset.length ? Number(counter.recordset[0].LastNumber)+1 : 1;
    const applicationNumber=V.applicationNumber(period,number);
    await new sql.Request(tx).input('Year',sql.Int,period.academicYearId).input('Number',sql.BigInt,number).query(counter.recordset.length
      ? 'UPDATE HR.dbo.FacultyAppraisal_NumberCounter SET LastNumber=@Number WHERE AcademicYearID=@Year;'
      : 'INSERT HR.dbo.FacultyAppraisal_NumberCounter(AcademicYearID,LastNumber) VALUES(@Year,@Number);');
    await request(tx,record.appraisalId)
      .input('Number',sql.VarChar(100),applicationNumber).input('Actor',sql.NVarChar(100),user.username)
      .input('Department',sql.VarChar(36),user.departmentId).input('Token',sql.Char(64),body.draftToken)
      .query(`INSERT HR.dbo.FacultyAppraisal_Submission(AppraisalID,ApplicationNumber,SubmittedAtUtc,SubmittedBy,RevisionNumber,CurrentStageOrder,DepartmentID,DraftToken)
        VALUES(@Id,@Number,SYSUTCDATETIME(),@Actor,1,1,@Department,@Token);`);
    for(const step of approvers) {
      await request(tx,record.appraisalId).input('Order',sql.Int,step.order).input('Stage',sql.VarChar(20),step.stage)
        .input('Label',sql.NVarChar(100),step.label).input('Employee',sql.VarChar(36),step.employeeBasicInfoId)
        .input('Username',sql.NVarChar(256),step.username).input('Name',sql.NVarChar(250),step.name || step.username)
        .input('Proof',sql.BigInt,step.proofUserId).input('Role',sql.BigInt,step.roleId)
        .input('RoleMap',sql.BigInt,step.roleMapId).input('OrgUnit',sql.BigInt,step.organizationUnitId)
        .input('Status',sql.VarChar(20),step.order===1?'Pending':'Queued')
        .query(`INSERT HR.dbo.FacultyAppraisal_ApprovalSteps(AppraisalID,RevisionNumber,StageOrder,StageCode,StageLabel,AssignedEmployeeBasicInfoID,AssignedUsername,AssignedName,ProofUserID,RoleID,RoleMapID,OrganizationUnitID,StepStatus)
          VALUES(@Id,1,@Order,@Stage,@Label,@Employee,@Username,@Name,@Proof,@Role,@RoleMap,@OrgUnit,@Status);`);
    }
    await request(tx,record.appraisalId).input('Employee',sql.VarChar(36),user.employeeBasicInfoId)
      .input('Username',sql.NVarChar(256),user.username).input('Name',sql.NVarChar(250),user.name || user.username)
      .query(`UPDATE HR.dbo.FacultyAppraisalDetails SET CurrentStatus='UnderReview' WHERE AppraisalID=@Id;
        INSERT HR.dbo.FacultyAppraisal_ActionHistory(AppraisalID,RevisionNumber,StageCode,ActionCode,ActorEmployeeBasicInfoID,ActorUsername,ActorName)
        VALUES(@Id,1,'APPLICANT','Submitted',@Employee,@Username,@Name);`);
    const submitted=await draftRepository.readForSubmission(tx,user,period);
    await tx.commit();
    return {record:submitted,alreadySubmitted:false};
  } catch(error) {
    try {await tx.rollback();}catch{}
    throw error;
  }
}
async function history(user,id) {
  const pool=await poolPromise;
  const result=await pool.request().input('Id',sql.VarChar(36),id).input('Employee',sql.VarChar(36),user.employeeBasicInfoId).query(`
    SELECT H.HistoryID AS id,H.StageCode AS stage,H.ActionCode AS action,H.ActorName AS actorName,
      CONVERT(VARCHAR(23),H.ActionAtUtc,126)+'Z' AS actionAt,H.Comments AS comments
    FROM HR.dbo.FacultyAppraisal_ActionHistory H
    JOIN HR.dbo.FacultyAppraisalDetails A ON A.AppraisalID=H.AppraisalID
    WHERE H.AppraisalID=@Id AND A.Employeebasicinfoid=@Employee ORDER BY H.HistoryID;`);
  return result.recordset;
}
module.exports={submit,history};
