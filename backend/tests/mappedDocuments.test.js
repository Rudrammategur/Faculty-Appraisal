const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function load(relative,mocks={}){
 const filename=path.resolve(__dirname,'../src',relative);
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,Buffer,require:name=>Object.hasOwn(mocks,name)?mocks[name]:require(require.resolve(name,{paths:[path.dirname(filename)]}))},{filename});
 return module.exports;
}
const T=load('services/appraisalDocumentTargets.js');
test('only configured row/field targets are accepted',()=>{
 assert.equal(T.target('journals','29').rowId,29);
 assert.equal(T.target('expectedResearch','0').rowId,0);
 for(const [target,row] of [['journals',0],['futureWork',1],['__proto__',1],['journals','1;DELETE'],['journals',2147483648]])assert.throws(()=>T.target(target,row));
});
const V=load('services/appraisalDraftValidation.js');
test('publication identities survive normalization and blank saved rows are retained',()=>{
 const result=V.normalize({rows:{journals:[{id:29,title:'Updated'}]}});
 assert.equal(result.groups.journals[0].id,29);
 assert.equal(V.normalize({rows:{journals:[{id:29}]}}).groups.journals.length,1);
 assert.equal(V.normalize({rows:{journals:[{}]}}).groups.journals.length,0);
 assert.throws(()=>V.normalize({rows:{journals:[{id:29,title:'A'},{id:29,title:'B'}]}}));
});
function publicationHarness(existing){
 const calls=[];
 class Request{
  constructor(){this.inputs={}}
  input(name,type,value){this.inputs[name]=value;return this}
  async query(sql){calls.push({sql,inputs:this.inputs});return {recordset:sql.startsWith('SELECT')?existing.map(id=>({id})):sql.startsWith('INSERT')?[{id:101}]:[]}}
 }
 const repo=load('repositories/appraisalPublicationRepository.js',{'../config/db':{sql:{Request,VarChar:()=>'',NVarChar:()=>'',Int:''}}});
 return {repo,calls};
}
test('editing keeps the publication ID without deleting its document',async()=>{
 const {repo,calls}=publicationHarness([29]);
 await repo.save({},'app','journals',[{id:29,title:'Changed'}],V.groups.journals);
 assert(calls.some(c=>c.sql.startsWith('UPDATE') && c.inputs.Row===29));
 assert(!calls.some(c=>c.sql.startsWith('DELETE') || c.sql.startsWith('INSERT')));
});
test('foreign publication identity is rejected before any deletion',async()=>{
 const {repo,calls}=publicationHarness([29]);
 await assert.rejects(()=>repo.save({},'app','journals',[{id:900,title:'Wrong'}],V.groups.journals));
 assert.equal(calls.length,1);
});
test('row deletion removes only that rows document before deleting the row',async()=>{
 const {repo,calls}=publicationHarness([29,30]);
 await repo.save({},'app','journals',[{id:30,title:'Keep'}],V.groups.journals);
 const deletes=calls.filter(c=>c.sql.startsWith('DELETE'));
 assert.equal(deletes.length,2);
 assert(deletes[0].sql.includes('FacultyAppraisal_Documents'));
 assert.equal(deletes[0].inputs.Target,'journals');assert.equal(deletes[0].inputs.Row,29);
 assert.equal(deletes[1].inputs.Row,29);
});
test('new publication maps client key to generated row ID',async()=>{
 const {repo}=publicationHarness([]);
 const mappings=await repo.save({},'app','journals',[{id:null,clientRowKey:'client-key',title:'New'}],V.groups.journals);
 assert.equal(mappings['client-key'],101);
});
const decoder=load('services/responsibilityDocument.js');
test('uploads use signature validation and enforce the size limit',()=>{
 assert.equal(decoder.decodeDocument({base64:Buffer.from('%PDF-1.7 test').toString('base64')}).length,13);
 for(const bytes of [Buffer.from('<script>bad</script>'),Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(512000)])])assert.throws(()=>decoder.decodeDocument({base64:bytes.toString('base64')}));
});
function routeHarness({status='Draft',canApply=true,accessible=true,windowOpen=true}={}){
 const handlers={},calls=[];let rolledBack=false,committed=false;
 class Request{
  input(){return this}
  async query(query){calls.push(query);return {recordset:query.includes('SELECT CurrentStatus')?[{CurrentStatus:status,AcademicYearID:13}]:[]}}
 }
 class Transaction{async begin(){} async rollback(){rolledBack=true} async commit(){committed=true}}
 load('routes/appraisalDocumentRoutes.js',{
  express:{Router:()=>({use(){},get:(path,fn)=>handlers.list=fn,all:(path,fn)=>handlers.item=fn})},
  '../config/db':{poolPromise:Promise.resolve({}),sql:{Request,Transaction,ISOLATION_LEVEL:{SERIALIZABLE:4},VarChar:()=>'',NVarChar:()=>'',VarBinary:()=>'',MAX:-1,Int:''}},
  '../middleware/auth':{requireAuthenticated(){}},
  '../repositories/appraisalApprovalRepository':{async access(){if(!accessible)throw Object.assign(new Error('Forbidden'),{statusCode:404})}},
  '../repositories/appraisalDocumentRepository':{list:async()=>[]},
  '../services/fwPeriodAccess':{async requireEditableWindow(){if(!windowOpen)throw Object.assign(new Error('Closed'),{statusCode:403})}},
 });
 async function run(method){
  let error;
  const req={method,params:{appraisalId:'9FB401CC-FCF0-4F9D-AF74-9EF0D7C74DA6',target:'futureWork',rowId:'0'},permissions:{canApply},user:{employeeBasicInfoId:'employee',username:'faculty'},body:{fileName:'sample.pdf',base64:Buffer.from('%PDF-1.7 sample').toString('base64')}};
  const res={set(){return this},json(){return this},send(){return this},status(){return this}};
  await handlers.item(req,res,e=>{error=e});return error;
 }
 return {run,calls,state:()=>({rolledBack,committed})};
}
test('document mutations reject staff and submitted applications',async()=>{
 for(const options of [{canApply:false},{status:'Submitted'},{windowOpen:false}]){
  const h=routeHarness(options);assert(await h.run('PUT'));
  assert(!h.calls.some(q=>q.startsWith('INSERT')));assert(!h.state().committed);
 }
});
test('unassigned users cannot download another applicants document',async()=>{
 const h=routeHarness({accessible:false});assert.equal((await h.run('GET')).statusCode,404);assert.equal(h.calls.length,0);
});
test('valid owner upload commits with its document inside the transaction',async()=>{
 const h=routeHarness();assert.equal(await h.run('PUT'),undefined);
 assert(h.calls.some(q=>q.startsWith('INSERT HR.dbo.FacultyAppraisal_Documents')));assert(h.state().committed);
});
test('R&D grid targets require a row identity',()=>{
 for(const target of ['technologyTransfer','specialLectures']){
  assert.equal(T.target(target,12).publication.pk,'AppraisalRowID');
  assert.throws(()=>T.target(target,0));
 }
});
test('R&D validation retains saved and upload-pending rows and rejects duplicate IDs',()=>{
 const rd=load('services/appraisalRDValidation.js');
 assert.equal(rd.normalizeRD({technologyTransfer:[{id:4}]}).technologyTransfer[0].id,4);
 assert.equal(rd.normalizeRD({specialLectures:[{documentPending:true}]}).specialLectures.length,1);
 assert.throws(()=>rd.normalizeRD({specialLectures:[{id:4},{id:4}]}));
});
test('R&D save updates retained identity and deletes only removed rows documents',async()=>{
 const calls=[];
 class Request{
  constructor(){this.inputs={}}
  input(k,t,v){this.inputs[k]=v;return this}
  async query(query){calls.push({query,inputs:this.inputs});return {recordset:query.startsWith('SELECT')?[{id:4},{id:5}]:query.startsWith('INSERT')?[{id:6}]:[]}}
 }
 const repo=load('repositories/appraisalRDRepository.js',{'../config/db':{sql:{Request,Int:'int',VarChar:()=>'',NVarChar:()=>'',Date:'date',MAX:-1}}});
 await repo.saveAll({},'app',{technologyTransfer:[{id:4,particulars:'Edited'},{id:null,particulars:'New',clientRowKey:'key'}]});
 assert(calls.some(c=>c.query.startsWith('UPDATE') && c.inputs.Row===4));
 const removed=calls.filter(c=>c.query.startsWith('DELETE'));
 assert.equal(removed.length,2);assert.equal(removed[0].inputs.Row,5);assert.equal(removed[0].inputs.Target,'technologyTransfer');
 assert(removed[0].query.includes('FacultyAppraisal_Documents'));
});
