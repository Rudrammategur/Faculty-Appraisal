const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/App.jsx'),'utf8');
const helper=source.slice(source.indexOf('  const prepareDocumentTarget ='),source.indexOf('  const handleSubmission ='));
function prepare(form,save){
 let state;
 const context={form,crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789012'},PUBLICATION_KEYS:['journals','conferences','books','reports','awards','technologyTransfer','specialLectures'],setForm:value=>state=value,saveDraft:save};
 vm.createContext(context);vm.runInContext(helper+'\nthis.prepare=prepareDocumentTarget',context);
 return {run:context.prepare,state:()=>state};
}
test('unsaved publication is prepared with a stable client key before upload',async()=>{
 let payload;
 const h=prepare({rows:{journals:[{title:'New paper'}]}},async options=>{
  payload=options;const row=options.formOverride.rows.journals[0];
  return {appraisalId:'new-app',publicationRowIds:{journals:{[row.clientRowKey]:123}}};
 });
 const result=await h.run('journals',0);
 assert.equal(result.appraisalId,'new-app');assert.equal(result.rowId,123);
 assert.equal(payload.forUpload,true);assert.equal(payload.formOverride.rows.journals[0].documentPending,true);
 assert.equal(h.state().rows.journals[0].title,'New paper');
});
test('field upload creates the draft without a publication row',async()=>{
 const h=prepare({futureWork:'Plans',rows:{}},async options=>{assert.equal(options.formOverride.futureWork,'Plans');return {appraisalId:'new-app'}});
 assert.equal((await h.run('futureWork')).rowId,0);
});
test('failed automatic draft save stops upload preparation',async()=>{
 const h=prepare({rows:{journals:[{}]}},async()=>{throw new Error('Window is closed')});
 await assert.rejects(()=>h.run('journals',0),/Window is closed/);
});
test('responsibility upload resolves its saved ID even when blank placeholders are skipped',async()=>{
 const h=prepare({rows:{departmentLevels:[{}, {responsibility:'Committee chair'}]}},async()=>({appraisalId:'new-app',formData:{rows:{departmentLevels:[{id:601,responsibility:'Committee chair'}]}}}));
 assert.equal((await h.run('departmentLevels',1)).rowId,601);
});
test('an empty responsibility asks for details rather than a manual draft save',async()=>{
 let saved=false;
 const h=prepare({rows:{departmentLevels:[{}]}},async()=>{saved=true});
 await assert.rejects(()=>h.run('departmentLevels',0),/Enter responsibility details/);assert.equal(saved,false);
});

test('R&D grid row upload automatically saves and resolves the generated row ID',async()=>{
 const h=prepare({rows:{technologyTransfer:[{particulars:'Patent'}]}},async options=>{
  const row=options.formOverride.rows.technologyTransfer[0];
  return {appraisalId:'new-app',publicationRowIds:{technologyTransfer:{[row.clientRowKey]:45}}};
 });
 assert.equal((await h.run('technologyTransfer',0)).rowId,45);
});
