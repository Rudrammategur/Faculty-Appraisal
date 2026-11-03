const {sql,poolPromise}=require('../config/db');
// Derived from recorded actions, never from browser/session state.
exports.reviewed=async(req,res,next)=>{
 try{
  const pool=await poolPromise;
  const result=await pool.request()
   .input('Employee',sql.VarChar(36),req.user.employeeBasicInfoId)
   .input('Username',sql.NVarChar(256),req.user.username)
   .query(`
    WITH MyReviews AS (
     SELECT H.HistoryID,H.AppraisalID,H.WorkflowID,H.ReviewRound,H.StageCode,H.Action,H.ActionOn,
      ROW_NUMBER() OVER(PARTITION BY H.AppraisalID ORDER BY H.HistoryID DESC) AS Latest
     FROM HR.dbo.FacultyAppraisal_WorkflowHistory H
     JOIN HR.dbo.FacultyAppraisal_Workflow W ON W.WorkflowID=H.WorkflowID AND W.AppraisalID=H.AppraisalID
     JOIN Proof.dbo.OrgUnitUserMapping UM ON UM.UserMapId=W.AssignedUserMapId
      AND UM.UserId=W.AssignedUserId AND UM.IsActive=1
     JOIN Proof.dbo.OrgUnitRoleMapping RM ON RM.RoleMapId=UM.RoleMapId AND RM.IsActive=1
      AND RM.RoleMapId=W.RoleMapId AND RM.RoleId=W.RoleId AND RM.OrganizationUnitId=W.OrganizationUnitId
     JOIN Proof.dbo.UserMaster U ON U.UserId=UM.UserId AND U.IsLockedOut=0
     WHERE H.ActorEmployeeBasicInfoId=@Employee AND W.AssignedEmployeeBasicInfoId=@Employee
      AND H.ActorUserMapId=W.AssignedUserMapId AND LTRIM(RTRIM(U.UserName))=@Username
      AND H.Action IN ('Recommended','Approved','Returned to Faculty','Returned to HOD','Returned to Dean FW')
    )
    SELECT M.WorkflowID AS workflowId,M.AppraisalID AS appraisalId,M.StageCode AS stage,
     M.ReviewRound AS reviewRound,M.Action AS myAction,M.ActionOn AS actionAt,
     A.AcademicYearID AS academicYearId,Y.AcademicYear AS academicYear,A.CurrentStatus AS status,
     (SELECT MIN(SH.ActionOn) FROM HR.dbo.FacultyAppraisal_WorkflowHistory SH WHERE SH.AppraisalID=A.AppraisalID AND SH.StageCode='FACULTY' AND SH.Action='Submitted') AS submittedAt,
     E.EmployeeName AS applicantName,E.DepartmentName AS departmentName,
     P.StageCode AS pendingStage,P.AssignedName AS pendingWith
    FROM MyReviews M JOIN HR.dbo.FacultyAppraisalDetails A ON A.AppraisalID=M.AppraisalID
    JOIN Academics.dbo.AcademicYearDetails Y ON Y.AcademicYearID=A.AcademicYearID
    OUTER APPLY(SELECT MAX(EmployeeName) AS EmployeeName,MAX(DepartmentName) AS DepartmentName
     FROM HR.dbo.VW_EmployeeBasicDetails WHERE EmployeeBasicInfoId=A.Employeebasicinfoid) E
    OUTER APPLY(SELECT StageCode,AssignedName FROM HR.dbo.FacultyAppraisal_Workflow
     WHERE AppraisalID=A.AppraisalID AND StageStatus='Pending') P
    WHERE M.Latest=1 ORDER BY M.ActionOn DESC,M.HistoryID DESC;`);
  res.json({success:true,data:result.recordset});
 }catch(error){next(error);}
};
