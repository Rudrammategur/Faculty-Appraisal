const { test }=require('node:test');
const assert=require('node:assert/strict');
const V=require('../src/services/appraisalSubmissionValidation');
const id='5C907F63-AC2D-4DDA-AB4F-33BDD93AFDA3';
test('declaration and complete saved token required',()=>{
 assert.throws(()=>V.validateRequest({appraisalId:id,confirmed:false,draftToken:'a'.repeat(64)}),/Confirm/);
 assert.throws(()=>V.validateRequest({appraisalId:id,confirmed:true,draftToken:'bad'}),/Save/);
 assert.doesNotThrow(()=>V.validateRequest({appraisalId:id,confirmed:true,draftToken:'a'.repeat(64)}));
});
test('token stable under object-key ordering and changes for text, rows and uploaded-document metadata',()=>{
 const a={otherWork:'value',rows:{departmentLevels:[{id:1,hasSupportingDocument:false}]}};
 assert.equal(V.draftToken(a),V.draftToken({rows:a.rows,otherWork:'value'}));
 assert.notEqual(V.draftToken(a),V.draftToken({...a,otherWork:'changed'}));
 assert.notEqual(V.draftToken(a),V.draftToken({...a,rows:{departmentLevels:[{id:1,hasSupportingDocument:true}]}}));
});
test('application number uses academic year and does not truncate larger sequence',()=>{
 assert.equal(V.applicationNumber({reportingFrom:'2025-08-01'},1),'IITDH/FW/AFSAF/2025-26/00001');
 assert.equal(V.applicationNumber({reportingFrom:'2025-08-01'},100000),'IITDH/FW/AFSAF/2025-26/100000');
 assert.throws(()=>V.applicationNumber({reportingFrom:'2025-08-01'},Number.MAX_SAFE_INTEGER+1));
});
test('optional empty sections allowed; incomplete entered rows rejected',()=>{
 assert.doesNotThrow(()=>V.validateFinal({rows:{journals:[],phd:[]}}));
 assert.throws(()=>V.validateFinal({rows:{journals:[{title:''}]}}),/journals row 1/);
 assert.throws(()=>V.validateFinal({rows:{departmentLevels:[{responsibility:' '}]}}),/responsibility/);
 assert.doesNotThrow(()=>V.validateFinal({rows:{specialLectures:[{title:'Lecture'}]}}));
});
const steps=()=>['HOD','DEAN_FW','DIRECTOR'].map((stage,index)=>({stage,order:index+1,employeeBasicInfoId:`00000000-0000-0000-0000-00000000000${index+1}`}));
test('route order, unique approvers and no self-approval required',()=>{
 assert.doesNotThrow(()=>V.validateApprovers(steps(),id));
 const repeated=steps();repeated[1].employeeBasicInfoId=repeated[0].employeeBasicInfoId;
 assert.throws(()=>V.validateApprovers(repeated,id),/repeated/);
 const self=steps();self[0].employeeBasicInfoId=id;
 assert.throws(()=>V.validateApprovers(self,id),/Self/);
 assert.throws(()=>V.validateApprovers(steps().reverse(),id),/invalid/);
});
