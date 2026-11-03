const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const V=require('../src/services/fwPeriodValidation');
function access(rows){
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/middleware/fwOffice.js'),'utf8'),{module,require:name=>{
  if(name==='../services/fwPeriodValidation')return V;
  return{sql:{NVarChar:()=>{}},poolPromise:Promise.resolve({request:()=>({input(){return this},query:async()=>({recordset:rows})})})};
 }});
 return module.exports;
}
test('FW membership follows mapped accounts; nonmembers denied',async()=>{
 for(const rows of [[],[{UserId:2240}]]){
  const middleware=access(rows),req={user:{username:'test'}};let nextError;
  await middleware.resolveAccess(req,{},error=>{nextError=error});assert(!nextError);assert.equal(req.fwOfficeAccess,rows.length===1);
  let status,nextCalled=false;
  middleware.requireAccess(req,{status:code=>({json:()=>{status=code}})},()=>{nextCalled=true});
  assert.equal(nextCalled,rows.length===1);if(!rows.length)assert.equal(status,403);
 }
});
test('ambiguous active memberships fail closed',async()=>{
 let error;await access([{UserId:1},{UserId:2}]).resolveAccess({user:{username:'duplicate'}},{},value=>{error=value});assert.equal(error.statusCode,409);
});
test('write window rejects unpublished, closed or absent settings',async()=>{
 for(const row of [null,{isOpen:0,isPublished:0},{isOpen:0,isPublished:1},{isOpen:1,isPublished:1}]){
  const module={exports:{}};
  class Request{input(){return this}async query(){return{recordset:row?[row]:[]}}}
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/services/fwPeriodAccess.js'),'utf8'),{module,require:name=>name==='../config/db'?{sql:{Request,Int:1}}:V});
  if(row?.isOpen)assert.equal((await module.exports.requireOpenWindow({},13)).isOpen,true);
  else await assert.rejects(module.exports.requireOpenWindow({},13),error=>error.statusCode===409);
 }
});
