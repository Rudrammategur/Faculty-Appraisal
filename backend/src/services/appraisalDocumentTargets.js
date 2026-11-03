const publications={
 technologyTransfer:{table:'FacultyAppraisal_ProductsandPatents',pk:'AppraisalRowID'},
 specialLectures:{table:'ContinuingEducationLectures',pk:'AppraisalRowID'},
 journals:{table:'FacultyAppraisal_JournalPapers',pk:'JournalPaperID'},
 conferences:{table:'FacultyAppraisal_ConferenceResearchPapers',pk:'ConferencePaperID'},
 books:{table:'FacultyAppraisal_Books',pk:'BookID'},
 reports:{table:'FacultyAppraisal_TechnicalReports',pk:'TechnicalReportID'},
 awards:{table:'FacultyAppraisal_AwardsRecognitions',pk:'AwardRecognitionID'},
};
const fields=new Set(['expectedResearch','expectedOutreach','expectedProfessional','otherExtensionTasks','otherWork','selfAppraisal','futureWork','otherDepartmentWork']);
function fail(message,statusCode=400){throw Object.assign(new Error(message),{statusCode});}
function target(code,row){
 if(!Object.hasOwn(publications,code) && !fields.has(code))fail('Unsupported attachment target.');
 if(!/^\d+$/.test(String(row)) || !Number.isSafeInteger(Number(row)) || Number(row)>2147483647)fail('Invalid attachment row.');
 const rowId=Number(row);
 if(Object.hasOwn(publications,code)?rowId<1:rowId!==0)fail('Attachment row does not match its target.');
 return{code,rowId,publication:publications[code]};
}
module.exports={publications,fields,target,fail};
