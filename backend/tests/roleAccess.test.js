const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup(roleIds,options={}){
 const queries=[];
 const employee={EmployeeBasicInfoId:'employee-guid',EmployeeId:'RF2310',EmployeeName:'Test User',UserName:'test.user',DepartmentId:'dept-guid',DepartmentName:'Test'};
 const pool={request(){return{
  input(){return this},
  async query(query){
   queries.push(query);
   if(query.includes('VW_EmployeeBasicDetails'))return{recordset:[employee]};
   return{recordset:options.ambiguous?[{UserId:1,RoleId:239},{UserId:2,RoleId:239}]:roleIds.map(RoleId=>({UserId:1,RoleId}))};
  },
 }}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/middleware/auth.js'),'utf8'),{
  module,process:{env:{NODE_ENV:options.production?'production':'development',AUTH_MODE:'mock',DEV_EMPLOYEE_ID:'RF2310'}},
  require:()=>({sql:{NVarChar:()=>1},poolPromise:Promise.resolve(pool)}),Set,String,Number,
 });
 return{auth:module.exports,queries};
}
async function run(middleware){
 const req={};const res={statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
 let passed=false;
 await middleware(req,res,error=>{if(error)throw error;passed=true});
 return{req,res,passed};
}
test('faculty mapping can apply',async()=>{
 const m=setup([239]);const r=await run(m.auth.requireFaculty);
 assert.equal(r.passed,true);assert.equal(r.req.permissions.canApply,true);
});
test('staff cannot call faculty APIs',async()=>{
 const m=setup([245]);const r=await run(m.auth.requireFaculty);
 assert.equal(r.passed,false);assert.equal(r.res.statusCode,403);
});
test('FW staff authenticate and manage periods but cannot apply',async()=>{
 const m=setup([245,254]);const r=await run(m.auth.requireAuthenticated);
 assert.equal(r.passed,true);
 assert.equal(r.req.permissions.canManageAppraisalPeriods,true);
 assert.equal(r.req.permissions.canApply,false);
 assert.equal((await run(m.auth.requireFaculty)).res.statusCode,403);
});
test('faculty plus FW membership grants both independently',async()=>{
 const m=setup([239,254]);const r=await run(m.auth.requireFaculty);
 assert.equal(r.passed,true);assert.equal(r.req.permissions.canManageAppraisalPeriods,true);
});
test('old tenant roles 52 and 53 cannot grant faculty permission',async()=>{
 const m=setup([52,53]);const r=await run(m.auth.requireFaculty);
 assert.equal(r.res.statusCode,403);
});
test('ambiguous portal identity rejected',async()=>{
 const m=setup([],{ambiguous:true});const r=await run(m.auth.requireAuthenticated);
 assert.equal(r.res.statusCode,409);
});
test('production remains denied until real authentication is configured',async()=>{
 const m=setup([239],{production:true});const r=await run(m.auth.requireFaculty);
 assert.equal(r.res.statusCode,401);
});
test('SQL restricts active exact mappings and unlocked accounts',async()=>{
 const m=setup([239]);await run(m.auth.requireFaculty);
 const query=m.queries[1];
 assert.match(query,/UM.IsActive = 1/);assert.match(query,/RM.IsActive = 1/);
 assert.match(query,/U.IsLockedOut = 0/);
 assert.match(query,/RoleId = 239 AND RM.RoleMapId = 242 AND RM.OrganizationUnitId = 133/);
 assert.match(query,/RoleId = 254 AND RM.RoleMapId = 257 AND RM.OrganizationUnitId = 141/);
});
