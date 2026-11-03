const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const V=require('../src/services/appraisalSubmissionValidation');
const id='9FB401CC-FCF0-4F9D-AF74-9EF0D7C74DA6';
function fixture({status='Draft',token='a'.repeat(64),rows={},sqlError=false,windowOpen=true}={}){
 const events=[];const record={appraisalId:id,status,draftToken:token,formData:{rows}};
 class Transaction{async begin(){events.push('begin')}async commit(){events.push('commit')}async rollback(){events.push('rollback')}}
 class Request{input(){return this}async query(q){events.push(q);if(sqlError)throw Error('SQL failure');return{rowsAffected:[1]}}}
 const sql={Transaction,Request,ISOLATION_LEVEL:{SERIALIZABLE:1},VarChar:()=>{},Int:1};
 const module={exports:{}};
 const fail=(m,s=400)=>{throw Object.assign(new Error(m),{statusCode:s})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/appraisalSubmissionController.js'),'utf8'),{module,exports:module.exports,require:name=>{
  if(name==='../services/fwPeriodAccess')return{requireOpenWindow:async()=>{if(!windowOpen)throw Object.assign(new Error('Window closed'),{statusCode:409})}};
  if(name==='../config/db')return{sql,poolPromise:Promise.resolve({})};
  if(name==='../repositories/appraisalDraftRepository')return{readForSubmission:async()=>record};
  if(name==='../services/appraisalDraftValidation')return{fail};
  if(name==='../services/appraisalSubmissionValidation')return V;
  throw Error(name);
 }});
 const req={body:{appraisalId:id,academicYearId:13,confirmed:true,draftToken:'a'.repeat(64)},appraisalPeriod:{academicYearId:13},user:{employeeBasicInfoId:'owner'}};
 let output,error;
 const res={json:value=>{output=value}};
 return{run:async()=>{await module.exports.submit(req,res,e=>{error=e});return{events,output,error}}};
}
test('updates only master status and commits',async()=>{const {events,output,error}=await fixture().run();assert(!error);assert.equal(output.data.status,'Submitted');assert.equal(events.at(-1),'commit');const queries=events.filter(e=>e.includes('UPDATE'));assert.equal(queries.length,1);assert(queries[0].includes("SET CurrentStatus='Submitted'"));assert(!events.some(e=>/INSERT|FacultyAppraisal_Submission/.test(e)));});
test('repeat submit succeeds without rewriting',async()=>{const {events,output}=await fixture({status:'Submitted'}).run();assert.equal(output.alreadySubmitted,true);assert(!events.some(e=>e.includes('UPDATE')));});
test('changed draft or incomplete row prevents status change',async()=>{for(const options of [{token:'b'.repeat(64)},{rows:{journals:[{title:''}]}}]){const {events,error}=await fixture(options).run();assert(error);assert.equal(events.at(-1),'rollback');assert(!events.some(e=>e.includes('UPDATE')));}});
test('SQL failure rolls back and does not return success',async()=>{const {events,error,output}=await fixture({sqlError:true}).run();assert.equal(error.message,'SQL failure');assert.equal(output,undefined);assert.equal(events.at(-1),'rollback');});

test('closed application window prevents initial submission',async()=>{const {events,error}=await fixture({windowOpen:false}).run();assert.equal(error.statusCode,409);assert.equal(events.at(-1),'rollback');assert(!events.some(e=>e.includes('UPDATE')));});
