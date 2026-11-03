const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const modulePath=require('node:path').join(__dirname,'../frontend/src/utils/reviewPresentation.js');
const source=fs.readFileSync(modulePath,'utf8').replace('export function prepareSupervision','function prepareSupervision');
const context={};vm.createContext(context);vm.runInContext(source+';this.prepare=prepareSupervision;',context);
test('review preview shows source registration and FT/PT while preserving saved title/comments',()=>{
 const r=context.prepare([{studentMasterId:'A',registrationYear:2025,studyMode:'PT'}],
 [{studentMasterId:'a',title:'Saved thesis',remarks:'Saved remarks'}],'phd')[0];
 assert.equal(r.reg,'2025 / PT');assert.equal(r.title,'Saved thesis');assert.equal(r.remarks,'Saved remarks');
});
test('source failure retains saved supervision and shows unknown mode honestly',()=>{
 const r=context.prepare([],[{studentMasterId:'a',student:'Student',title:'Saved thesis'}],'phd')[0];
 assert.equal(r.studentName,'Student');assert.equal(r.reg,'— / —');
});
test('reviewing does not add unsaved supervision records',()=>{
 const r=context.prepare([{studentMasterId:'A'},{studentMasterId:'B'}],[{studentMasterId:'A'}]);
 assert.equal(r.length,1);
});
