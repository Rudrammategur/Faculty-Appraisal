const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../src');
async function helpers(){return import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'utils/publicationCompleteness.js'),'utf8')).toString('base64'))}
const journal={authors:'Author',title:'Title',venue:'Journal',volume:'1',year:2026,pages:'1–3'};
test('empty rows and document metadata do not trigger mandatory fields',async()=>{const h=await helpers();assert.equal(h.incompletePublications({rows:{journals:[{}, {id:1,hasSupportingDocument:true}]}}).length,0)});
test('partial rows identify all missing fields',async()=>{const h=await helpers();const issues=h.incompletePublications({rows:{journals:[{authors:'Author'}]}});assert.equal(issues.length,1);assert.equal(issues[0].missing.length,5)});
test('clear keeps complete rows and unrelated sections',async()=>{const h=await helpers();const form={futureWork:'Keep',rows:{journals:[journal,{authors:'Partial'}],phd:[{title:'Keep supervision'}]}};const next=h.clearIncompletePublications(form);assert.equal(next.rows.journals.length,1);assert.equal(next.rows.phd[0].title,'Keep supervision');assert.equal(next.futureWork,'Keep');assert.equal(form.rows.journals.length,2)});
test('all publication groups validate, but document fields do not become required',async()=>{const h=await helpers();for(const [group,config] of Object.entries(h.publicationFields)){const row=Object.fromEntries(Object.keys(config.fields).map(field=>[field,'Filled']));assert.equal(h.publicationMissingFields(group,row).length,0);delete row[Object.keys(row)[0]];assert.equal(h.publicationMissingFields(group,row).length,1)}});
function guardContext(h,options={}){
 const context={page:'form',attachmentJobs:0,savingLock:{current:false},APPRAISAL_SECTIONS:[{id:'instructional'},{id:'research'}],active:1,form:{rows:{journals:[{authors:'Partial'},journal]}},publicationContinuation:{current:null},editSequence:{current:0},...h,...options};
 context.setForm=fn=>{context.form=fn(context.form)};context.setPublicationIssues=value=>{context.issues=value;context.publicationIssues=value};context.setSaved=()=>{};context.setSaveFeedback=()=>{};context.setSaveError=()=>{};
 const source=fs.readFileSync(path.join(root,'App.jsx'),'utf8');const code=source.slice(source.indexOf('  function leavePublications'),source.indexOf('  const openDashboard'));
 vm.createContext(context);vm.runInContext(code,context);return context;
}
test('leaving an incomplete section opens popup instead of navigating',async()=>{const c=guardContext(await helpers());let moved=false;c.leavePublications(()=>{moved=true});assert.equal(moved,false);assert.equal(c.issues.length,1);c.clearAndContinuePublications();assert.equal(moved,true);assert.equal(c.form.rows.journals.length,1);assert.equal(c.editSequence.current,1)});
test('complete publication rows allow immediate navigation',async()=>{const c=guardContext(await helpers(),{form:{rows:{journals:[journal]}}});let moved=false;c.leavePublications(()=>{moved=true});assert.equal(moved,true)});
test('submission redirect is allowed while its saving lock is active',async()=>{const c=guardContext(await helpers(),{page:'preview',savingLock:{current:true}});let moved=false;c.leavePublications(()=>{moved=true});assert.equal(moved,true)});
test('R&D and institutional guards check only the active section',async()=>{
 const h=await helpers();
 for(const section of ['rd','institutional']){
  const form={rows:{journals:[{authors:'Pending elsewhere'}],technologyTransfer:[{particulars:'Patent'}],departmentLevels:[{responsibility:'Committee'}]}};
  const c=guardContext(h,{form,APPRAISAL_SECTIONS:[{id:'instructional'},{id:section}]});
  c.leavePublications(()=>{});assert.equal(c.issues.length,1);
  assert(h.sectionRequiredGroups[section].includes(c.issues[0].group));
  c.clearAndContinuePublications();assert.equal(c.form.rows.journals.length,1);
 }
});
test('clearing responsibility text retains an existing saved binary document',async()=>{
 const h=await helpers();const form={rows:{departmentLevels:[{id:9,responsibility:'Partial',hasSupportingDocument:true}]}};
 const next=h.clearIncompletePublications(form,['departmentLevels']);
 assert.equal(next.rows.departmentLevels[0].id,9);assert.equal(next.rows.departmentLevels[0].hasSupportingDocument,true);assert.equal(next.rows.departmentLevels[0].responsibility,'');assert.equal(h.incompletePublications(next).length,0);
});
