// Keys are the HR DepartmentId GUIDs, not names. Configure using the exact HR mapping.
// Example env: APPRAISAL_HOD_DEPARTMENTS={"hr-department-guid":359}
const HOD_MAPS={358:367,359:368,360:369,362:370,363:371,364:372,365:373,366:374,367:375};
function getAppraisalRoute(departmentId){
 let mapping;
 try{mapping=JSON.parse(process.env.APPRAISAL_HOD_DEPARTMENTS || '{}');}
 catch{throw Object.assign(new Error('APPRAISAL_HOD_DEPARTMENTS is invalid JSON.'),{statusCode:500});}
 const key=String(departmentId).trim().toLowerCase();
 const found=Object.entries(mapping).filter(([id])=>id.toLowerCase()===key);
 const selected=found.length===1?found[0][1]:null;
 const custom=selected && typeof selected==='object';
 const roleId=Number(custom?selected.roleId:selected);
 const roleMapId=Number(custom?selected.roleMapId:HOD_MAPS[roleId]);
 const organizationUnitId=Number(custom?selected.organizationUnitId:153);
 if(!Number.isInteger(roleId) || roleId<358 || roleId>367 || !Number.isInteger(roleMapId) || roleMapId<1 || !Number.isInteger(organizationUnitId) || organizationUnitId<1)throw Object.assign(new Error('No verified HOD route is configured for this HR department. Configure the department and active ERP role mapping before submission.'),{statusCode:409});
 return [
  {order:1,stage:'HOD',label:'Head of Department',roleId,roleMapId,organizationUnitId},
  {order:2,stage:'DEAN_FW',label:'Dean Faculty Welfare',roleId:189,roleMapId:379,organizationUnitId:122},
  {order:3,stage:'DIRECTOR',label:'Director',roleId:164,roleMapId:170,organizationUnitId:25},
 ];
}
module.exports={getAppraisalRoute,HOD_MAPS};
