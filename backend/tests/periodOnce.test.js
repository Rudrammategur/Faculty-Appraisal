const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const path=require('node:path');
const V=require('../src/services/fwPeriodValidation');
function repoMock({existing=false,overlap=false}={}){
 const queries=[];
 const row={cycleId:1,academicYearId:13,openingDate:'2026-10-01',closingDate:'2026-11-30',startsAtUtc:'2026-09-30T18:30:00Z',endsAtUtc:'2026-11-30T18:30:00Z',isPublished:true,updatedOn:'2026-10-01T00:00:00Z',updatedBy:'fw',lastChangeReason:null};
 class Request{
  input(){return this}
  async query(q){
   queries.push(q);
   if(q.includes('sp_getapplock'))return{recordset:[{LockResult:0}]};
   if(q.includes('StartYear,EndYear'))return{recordset:[{academicYearId:13,academicYear:'2025-2026',StartYear:2025,EndYear:2026,reportingFrom:'2025-08-01',reportingTo:'2026-07-31'}]};
   if(q.includes('SELECT CycleID FROM'))return{recordset:overlap?[{CycleID:2}]:[]};
   if(/INSERT HR\.|UPDATE HR\./.test(q))return{recordset:[]};
   return{recordset:existing?[row]:[]};
  }
 }
 class Transaction{async begin(){}async commit(){}async rollback(){}}
 const sql={Request,Transaction,ISOLATION_LEVEL:{SERIALIZABLE:1},Int:1,DateTime2:()=>1,NVarChar:()=>1};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/repositories/fwPeriodRepository.js'),'utf8'),{
  require:id=>id==='node:crypto'?crypto:id==='../config/db'?{sql,poolPromise:Promise.resolve({})}:V,
  module,Boolean,Date,JSON,String,
 });
 return{repo:module.exports,queries};
}
test('application dates allow reopening previous year, with inclusive IST end',()=>{
 const input=V.normalize({openingDate:'2026-10-30',closingDate:'2026-11-30'});
 assert.equal(input.end.toISOString(),'2026-11-30T18:30:00.000Z');
 assert.throws(()=>V.normalize({openingDate:'2026-11-30',closingDate:'2026-10-30'}));
});
test('read returns a safe opaque token without binary serialization',async()=>{
 const m=repoMock({existing:true});const r=await m.repo.get(13);
 assert.match(r.settings.version,/^[0-9a-f]{64}$/);
 assert.equal(r.academicYear.reportingFrom,'2025-08-01');
});
test('modify updates existing row with matching token',async()=>{
 const m=repoMock({existing:true});const r=await m.repo.get(13);
 await m.repo.save({username:'fw'},13,V.normalize({openingDate:'2026-10-30',closingDate:'2026-12-01',version:r.settings.version,reason:'Reopen'}));
 assert.equal(m.queries.filter(q=>q.includes('UPDATE HR.')).length,1);
 assert.equal(m.queries.filter(q=>q.includes('INSERT HR.')).length,0);
});
test('stale token cannot overwrite settings',async()=>{
 const m=repoMock({existing:true});
 await assert.rejects(m.repo.save({username:'fw'},13,V.normalize({openingDate:'2026-10-30',closingDate:'2026-12-01',version:'0'.repeat(64),reason:'Reopen'})),/Another office user/);
});
test('overlapping application windows are rejected',async()=>{
 const m=repoMock({overlap:true});
 await assert.rejects(m.repo.save({username:'fw'},13,V.normalize({openingDate:'2026-10-30',closingDate:'2026-12-01'})),/overlap/);
 assert.equal(m.queries.some(q=>q.includes('INSERT HR.')),false);
});
test('non-overlapping dates create a new cycle',async()=>{
 const m=repoMock();
 await m.repo.save({username:'fw'},13,V.normalize({openingDate:'2026-10-30',closingDate:'2026-12-01'}));
 assert.equal(m.queries.filter(q=>q.includes('INSERT HR.')).length,1);
});
