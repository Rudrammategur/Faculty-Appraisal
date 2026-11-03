const {sql,poolPromise}=require('../config/db');
const W=require('../repositories/appraisalApprovalRepository');
const drafts=require('../repositories/appraisalDraftRepository');
const {fail}=require('../services/appraisalDraftValidation');
const {loadAppraisalPeriod}=require('../middleware/appraisalPeriod');
const faculty=require('./facultyController');
exports.pending=async(req,res,next)=>{try{res.json({success:true,data:await W.pending(req.user)});}catch(e){next(e);}};
exports.mine=async(req,res,next)=>{
 try{
  if(!req.permissions.canApply)fail('Faculty access is required.',403);
  const pool=await poolPromise;
  const result=await pool.request().input('Employee',sql.VarChar(36),req.user.employeeBasicInfoId).query(`
   SELECT A.AppraisalID AS appraisalId,A.AcademicYearID AS academicYearId,A.CurrentStatus AS status,
   (SELECT MIN(SH.ActionOn) FROM HR.dbo.FacultyAppraisal_WorkflowHistory SH WHERE SH.AppraisalID=A.AppraisalID AND SH.StageCode='FACULTY' AND SH.Action='Submitted') AS submittedAt,
   Y.AcademicYear AS academicYear,CONVERT(CHAR(10),DATEFROMPARTS(Y.StartYear,8,1),23) AS reportingFrom,CONVERT(CHAR(10),DATEFROMPARTS(Y.EndYear,7,31),23) AS reportingTo,P.StageCode AS pendingStage,P.AssignedName AS pendingWith
   FROM HR.dbo.FacultyAppraisalDetails A
   JOIN Academics.dbo.AcademicYearDetails Y ON Y.AcademicYearID=A.AcademicYearID
   OUTER APPLY(SELECT StageCode,AssignedName FROM HR.dbo.FacultyAppraisal_Workflow
    WHERE AppraisalID=A.AppraisalID AND StageStatus='Pending') P
   WHERE A.Employeebasicinfoid=@Employee ORDER BY A.CreatedOn DESC;`);
  res.json({success:true,data:result.recordset});
 }catch(e){next(e);}
};
exports.history=async(req,res,next)=>{
 try{res.json({success:true,data:await W.history(await poolPromise,req.params.id,req.user)});}catch(e){next(e);}
};
async function context(req){
 const pool=await poolPromise;
 const master=await W.access(pool,req.params.id,req.user);
 const hr=await pool.request().input('Employee',sql.VarChar(36),master.applicantEmployeeBasicInfoId)
  .query('SELECT DISTINCT EmployeeBasicInfoId,EmployeeId,EmployeeName,UserName,DepartmentId,DepartmentName FROM HR.dbo.VW_EmployeeBasicDetails WHERE EmployeeBasicInfoId=@Employee;');
 if(hr.recordset.length!==1)fail('Applicant HR mapping is ambiguous or missing.',409);
 const row=hr.recordset[0];
 return{pool,master,applicant:{employeeBasicInfoId:row.EmployeeBasicInfoId.trim(),employeeId:row.EmployeeId.trim(),
  username:row.UserName.trim(),name:row.EmployeeName,departmentId:row.DepartmentId.trim(),departmentName:row.DepartmentName}};
}
exports.details=async(req,res,next)=>{
 try{
  const {pool,master,applicant}=await context(req);
  const record=await drafts.readRecord(pool,master);
  const steps=await W.steps(pool,req.params.id);
  const history=await W.history(pool,req.params.id,req.user);
  const pending=steps.find(s=>s.status==='Pending');
  const y=await pool.request().input('Year',sql.Int,master.academicYearId).query(`
   SELECT CONVERT(CHAR(10),DATEFROMPARTS(StartYear,8,1),23) AS reportingFrom,
   CONVERT(CHAR(10),DATEFROMPARTS(EndYear,7,31),23) AS reportingTo
   FROM Academics.dbo.AcademicYearDetails WHERE AcademicYearID=@Year;`);
  res.json({success:true,data:{...record,applicant,steps,history,period:y.recordset[0],pendingWith:pending?.assignedName || null}});
 }catch(e){next(e);}
};
const sourceHandlers={profile:faculty.getFacultyProfile,teaching:faculty.getTeachingLoad,
 projects:faculty.getProjectSupervision,phd:faculty.getPhdSupervision,
 research:require('./facultyResearchProjectsController').getResearchProjects};
exports.source=async(req,res,next)=>{
 try{
  const handler=sourceHandlers[req.params.kind];if(!handler)fail('Unknown source.',404);
  const {master,applicant}=await context(req);
  const sourceReq={...req,user:applicant,query:{academicYearId:String(master.academicYearId)}};
  // Delegation is server-side and occurs only after application-specific access is verified.
  await loadAppraisalPeriod(sourceReq,res,async error=>{
   if(error)return next(error);
   try{await handler(sourceReq,res,next);}catch(e){next(e);}
  });
 }catch(e){next(e);}
};
exports.takeAction=async(req,res,next)=>{
 try{res.json({success:true,data:await W.takeAction(req.params.id,req.user,req.body)});}catch(e){next(e);}
};
exports.document=async(req,res,next)=>{
 try{
  const pool=await poolPromise;await W.access(pool,req.params.id,req.user);
  const docId=Number(req.params.docId);
  if(!Number.isSafeInteger(docId)||docId<1)fail('Invalid document ID.');
  const result=await pool.request().input('Id',sql.VarChar(36),req.params.id).input('Doc',sql.Int,docId)
   .query('SELECT SupportingDoc FROM HR.dbo.FacultyAppraisal_Responsibilities WHERE AppraisalID=@Id AND ResponsibilityID=@Doc;');
  if(result.recordset.length!==1 || !result.recordset[0].SupportingDoc?.length)fail('Document not found.',404);
  const content=result.recordset[0].SupportingDoc;
  const type=require('../services/responsibilityDocument').detectType(content) || {mime:'application/octet-stream',extension:'bin'};
  res.set('Cache-Control','no-store');res.set('Content-Type',type.mime);
  res.set('Content-Disposition',`attachment; filename="responsibility-${docId}.${type.extension}"`);
  res.set('X-Content-Type-Options','nosniff');res.send(content);
 }catch(e){next(e);}
};
// Explicitly enrol an application submitted before workflow installation. Never bulk-migrate silently.
exports.startReview=async(req,res,next)=>{
 let tx;
 try{
  if(!req.permissions.canManageAppraisalPeriods)fail('FW Office access is required.',403);
  const {master,applicant}=await contextForOffice(req);
  tx=new sql.Transaction(await poolPromise);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const current=(await new sql.Request(tx).input('Id',sql.VarChar(36),master.appraisalId)
   .query('SELECT CurrentStatus FROM HR.dbo.FacultyAppraisalDetails WITH(UPDLOCK,HOLDLOCK) WHERE AppraisalID=@Id;')).recordset[0];
  if(current?.CurrentStatus!=='Submitted')fail('Only a legacy Submitted application can be enrolled.',409);
  await W.start(tx,master,applicant,req.user);

  await tx.commit();tx=null;res.json({success:true,data:{appraisalId:master.appraisalId}});
 }catch(e){if(tx)try{await tx.rollback();}catch{}next(e);}
};
async function contextForOffice(req){
 if(!require('../services/appraisalDraftValidation').GUID.test(String(req.params.id)))fail('Invalid appraisal ID.');
 const pool=await poolPromise;
 const r=await pool.request().input('Id',sql.VarChar(36),req.params.id).query('SELECT AppraisalID AS appraisalId,Employeebasicinfoid AS employee FROM HR.dbo.FacultyAppraisalDetails WHERE AppraisalID=@Id;');
 if(r.recordset.length!==1)fail('Application not found.',404);
 const h=await pool.request().input('Employee',sql.VarChar(36),r.recordset[0].employee)
 .query('SELECT DISTINCT EmployeeBasicInfoId,EmployeeId,EmployeeName,UserName,DepartmentId FROM HR.dbo.VW_EmployeeBasicDetails WHERE EmployeeBasicInfoId=@Employee;');
 if(h.recordset.length!==1)fail('Applicant HR identity is ambiguous.',409);
 const e=h.recordset[0];
 return{master:r.recordset[0],applicant:{employeeBasicInfoId:e.EmployeeBasicInfoId.trim(),employeeId:e.EmployeeId.trim(),username:e.UserName.trim(),name:e.EmployeeName,departmentId:e.DepartmentId.trim()}};
}
