const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup(rows,error){
 let query='',params={};const module={exports:{}};
 const pool={request:()=>({input(name,type,value){params[name]=value;return this},async query(q){query=q;if(error)throw error;return{recordset:rows}}})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/reviewTrackingController.js'),'utf8'),{
  module,exports:module.exports,require:()=>({sql:{VarChar:()=>1,NVarChar:()=>1},poolPromise:Promise.resolve(pool)}),
 });
 return{controller:module.exports,sql:()=>query,params};
}
test('tracking returns saved action and current application status after later approval',async()=>{
 const rows=[{appraisalId:'example',myAction:'Recommended',status:'Approved',pendingWith:null}];
 const m=setup(rows);let response;
 await m.controller.reviewed({user:{employeeBasicInfoId:'employee',username:'reviewer'}},{json(value){response=value}},e=>{throw e});
 assert.equal(response.data[0].myAction,'Recommended');
 assert.equal(response.data[0].status,'Approved');
});
test('tracking is parameterized and scoped to recorded actor and exact active mapping',async()=>{
 const m=setup([]);const username="name'; DROP TABLE x;--";
 await m.controller.reviewed({user:{employeeBasicInfoId:'id',username}},{json(){}},e=>{throw e});
 const q=m.sql();
 assert.equal(m.params.Username,username);assert.equal(q.includes(username),false);
 assert.match(q,/H.ActorEmployeeBasicInfoId=@Employee/);
 assert.match(q,/H.ActorUserMapId=W.AssignedUserMapId/);
 assert.match(q,/RM.RoleId=W.RoleId/);
 assert.match(q,/UM.IsActive=1/);
 assert.match(q,/U.IsLockedOut=0/);
});
test('tracking selects latest personal review per application without changing rows',async()=>{
 const m=setup([]);
 await m.controller.reviewed({user:{employeeBasicInfoId:'id',username:'reviewer'}},{json(){}},e=>{throw e});
 assert.match(m.sql(),/ROW_NUMBER\(\) OVER\(PARTITION BY H.AppraisalID/);
 assert.match(m.sql(),/WHERE M.Latest=1/);
 assert.doesNotMatch(m.sql(),/\b(INSERT|UPDATE|DELETE)\b/);
});
test('database errors propagate instead of showing a false empty history',async()=>{
 const error=new Error('connection lost');const m=setup([],error);let received;
 await m.controller.reviewed({user:{employeeBasicInfoId:'id',username:'reviewer'}},{json(){throw new Error('unexpected success')}},e=>{received=e});
 assert.equal(received,error);
});
