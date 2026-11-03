const {sql,poolPromise}=require('../config/db');
const {getAppraisalRoute}=require('../config/appraisalWorkflow');
const fail=message=>{throw Object.assign(new Error(message),{statusCode:409});};
async function resolveAppraisalApprovers(applicant,connection){
 const pool=connection || await poolPromise;
 const route=getAppraisalRoute(applicant.departmentId);
 const output=[];
 for(const step of route){
  const result=await new sql.Request(pool)
   .input('Role',sql.Int,step.roleId).input('Map',sql.Int,step.roleMapId).input('Org',sql.Int,step.organizationUnitId)
   .query(`SELECT DISTINCT UM.UserMapId,U.UserId,U.UserName
    FROM Proof.dbo.OrgUnitRoleMapping RM
    JOIN Proof.dbo.OrgUnitUserMapping UM ON UM.RoleMapId=RM.RoleMapId AND UM.IsActive=1
    JOIN Proof.dbo.UserMaster U ON U.UserId=UM.UserId AND U.IsLockedOut=0
    WHERE RM.RoleId=@Role AND RM.RoleMapId=@Map AND RM.OrganizationUnitId=@Org AND RM.IsActive=1;`);
  if(result.recordset.length!==1)fail(step.label+': expected exactly one active mapped reviewer.');
  const user=result.recordset[0];
  const hr=await new sql.Request(pool).input('Username',sql.NVarChar(256),user.UserName)
   .query('SELECT DISTINCT EmployeeBasicInfoId,EmployeeId,EmployeeName,UserName FROM HR.dbo.VW_EmployeeBasicDetails WHERE LTRIM(RTRIM(UserName))=@Username;');
  if(hr.recordset.length!==1)fail(step.label+': expected one matching HR identity.');
  const employee=hr.recordset[0];
  const id=String(employee.EmployeeBasicInfoId || '').trim();
  if(!id)fail(step.label+': HR identity is missing.');
  if(id.toLowerCase()===applicant.employeeBasicInfoId.toLowerCase())fail(step.label+': self-approval is not allowed. An authorized alternate route must be agreed before submission.');
  output.push({...step,userMapId:user.UserMapId,proofUserId:user.UserId,username:user.UserName.trim(),
   employeeBasicInfoId:id,employeeId:employee.EmployeeId,name:employee.EmployeeName});
 }
 return output;
}
async function reviewMemberships(connection,user){
 const result=await new sql.Request(connection).input('Username',sql.NVarChar(256),user.username).query(`
  SELECT DISTINCT UM.UserMapId,U.UserId,RM.RoleId,RM.RoleMapId,RM.OrganizationUnitId
  FROM Proof.dbo.OrgUnitUserMapping UM
  JOIN Proof.dbo.OrgUnitRoleMapping RM ON RM.RoleMapId=UM.RoleMapId AND RM.IsActive=1
  JOIN Proof.dbo.UserMaster U ON U.UserId=UM.UserId AND U.IsLockedOut=0
  WHERE UM.IsActive=1 AND LTRIM(RTRIM(U.UserName))=@Username AND (
   (RM.OrganizationUnitId=153 AND RM.RoleId BETWEEN 358 AND 367)
   OR (RM.RoleId=189 AND RM.RoleMapId=379 AND RM.OrganizationUnitId=122)
   OR (RM.RoleId=164 AND RM.RoleMapId=170 AND RM.OrganizationUnitId=25));`);
 return result.recordset;
}
module.exports={resolveAppraisalApprovers,reviewMemberships};
