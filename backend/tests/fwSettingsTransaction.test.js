const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const V=require('../src/services/fwPeriodValidation');
const old={cycleId:1,academicYearId:13,openingDate:'2026-10-01',closingDate:'2026-10-31',startsAtUtc:'2026-09-30T18:30:00Z',endsAtUtc:'2026-10-31T18:30:00Z',isPublished:true,version:'0x0000000000000001'};
function fixture({existing=null,overlap=false}={}){
 const events=[];let written=false;
 class Transaction{async begin(){events.push('begin')}async commit(){events.push('commit')}async rollback(){events.push('rollback')}}
 class Request{
  constructor(){this.parameters={}} input(k,t,v){this.parameters[k]=v;return this}
  async query(q){events.push({q,parameters:this.parameters});
   if(q.includes('sp_getapplock'))return{recordset:[{LockResult:0}]};
   if(q.includes('FROM Academics.'))return{recordset:[{academicYearId:13,StartYear:2025,EndYear:2026}]};
   if(q.includes('SELECT CycleID FROM'))return{recordset:overlap?[{CycleID:2}]:[]};
   if(q.includes('SELECT CycleID AS'))return{recordset:written?[{...old,version:'0x0000000000000002'}]:existing?[existing]:[]};
   if(q.includes('UPDATE HR.') || q.includes('INSERT HR.dbo.FacultyAppraisal_CycleSettings('))written=true;
   return{recordset:[]};
  }
 }
 const module={exports:{}};const sql={Transaction,Request,Int:1,Bit:1,MAX:-1,ISOLATION_LEVEL:{SERIALIZABLE:1},DateTime2:()=>{},NVarChar:()=>{},VarChar:()=>{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/repositories/fwPeriodRepository.js'),'utf8'),{module,Date,require:name=>name==='../config/db'?{sql,poolPromise:Promise.resolve({})}:V});
 return{repository:module.exports,events};
}
const input=V.normalize({openingDate:'2026-10-30',closingDate:'2026-11-10',publish:false,version:old.version,reason:'Deadline extension'});
test('stale version prevents overwrite and rolls back',async()=>{
 const{repository,events}=fixture({existing:old});await assert.rejects(repository.save({username:'office'},13,{...input,version:'0x0000000000000000'}),error=>error.statusCode===409);assert.equal(events.at(-1),'rollback');assert(!events.some(e=>e.q?.includes('UPDATE HR.')));
});
test('published settings stay published and latest actor/reason are stored',async()=>{
 const{repository,events}=fixture({existing:old});await repository.save({username:'kushalhiremath'},13,input);
 const update=events.find(e=>e.q?.includes('UPDATE HR.'));assert.equal(update.parameters.Published,true);
 assert.equal(update.parameters.Actor,'kushalhiremath');assert.equal(update.parameters.Reason,'Deadline extension');assert(update.q.includes('LastChangeReason=@Reason'));assert.equal(events.at(-1),'commit');
});
test('overlapping published cycles fail without writes',async()=>{
 const{repository,events}=fixture({overlap:true});await assert.rejects(repository.save({username:'office'},13,{...input,version:null,publish:true}),/overlap/);assert.equal(events.at(-1),'rollback');assert(!events.some(e=>e.q?.includes('INSERT HR.')));
});
