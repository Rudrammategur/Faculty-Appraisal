const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const moduleMock={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/services/appraisalSubmissionValidation.js'),'utf8'),{module:moduleMock,exports:moduleMock.exports,require:name=>name==='node:crypto'?require(name):{GUID:/./,fail:message=>{throw new Error(message)}}});
const validate=moduleMock.exports.validateFinal;
const groups={technologyTransfer:{particulars:'Patent',publicationGrantDate:'2026-11-01',issuedBy:'Institute',monthYear:'2026-11'},specialLectures:{title:'Lecture',date:'2026-11-01',place:'Dharwad',programme:'Programme',information:'Details'},departmentLevels:{responsibility:'Committee',activities:'Coordination',fromDate:'2026-10-01',toDate:'2026-11-01'},instituteLevels:{responsibility:'Committee',activities:'Coordination',fromDate:'2026-10-01',toDate:'2026-11-01'}};
for(const [group,row] of Object.entries(groups)){
 test(group+': optional empty rows and complete rows without documents pass',()=>{validate({rows:{[group]:[{}]}});validate({rows:{[group]:[{id:1,hasSupportingDocument:true}]}});validate({rows:{[group]:[row]}})});
 test(group+': every missing related field blocks final submission',()=>{for(const field of Object.keys(row))assert.throws(()=>validate({rows:{[group]:[{...row,[field]:' '}]}}),/before submission/)});
}
test('publication completeness remains enforced',()=>{assert.throws(()=>validate({rows:{journals:[{title:'Partial'}]}}),/before submission/)});
