const crypto = require('node:crypto');
const { fail, GUID } = require('./appraisalDraftValidation');
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function draftToken(formData) { return crypto.createHash('sha256').update(JSON.stringify(canonical(formData))).digest('hex'); }
function validateRequest(body) {
  if (!GUID.test(body?.appraisalId || '')) fail('A complete appraisal ID is required.');
  if (body.confirmed !== true) fail('Confirm the declaration before submitting.');
  if (!/^[a-f0-9]{64}$/.test(body.draftToken || '')) fail('Save the latest draft before submitting.');
}
const publicationFields = {
 technologyTransfer:{label:'III. b) Products / Processes / Technology Transfer / Patents',fields:{particulars:'Particulars',publicationGrantDate:'Date of publication / grant',issuedBy:'Issued by',monthYear:'Month-Year'}},
 specialLectures:{label:'III. c) Continuing Education & Special Lectures',fields:{title:'Lecture title',date:'Date',place:'Place',programme:'Programme',information:'Other relevant information'}},
 departmentLevels:{label:'IV. a) Department / Centre Levels',fields:{responsibility:'Responsibility',activities:'Activities performed',fromDate:'From date',toDate:'To date'}},
 instituteLevels:{label:'IV. b) Institute Levels',fields:{responsibility:'Responsibility',activities:'Activities performed',fromDate:'From date',toDate:'To date'}},

 journals: {label:'Journal papers',fields:{authors:'Authors',title:'Paper title',venue:'Journal name',volume:'Volume',year:'Year',pages:'Pages'}},
 conferences: {label:'Conference papers',fields:{authors:'Authors',title:'Paper title',venue:'Conference name',place:'Place',year:'Year',pages:'Pages'}},
 books: {label:'Books / Monographs',fields:{title:'Title',publisher:'Publisher and year',authors:'Authors',remarks:'Authored / Edited'}},
 reports: {label:'Technical reports',fields:{title:'Report title',particulars:'Particulars',authors:'Authors',remarks:'External / Internal'}},
 awards: {label:'Awards / Prizes / Medals',fields:{name:'Award name',issuer:'Issued by',place:'Place',month:'Month-Year'}},
};
const filled=value=>value!==null && value!==undefined && String(value).trim()!=='';
function validatePublications(form) {
 for(const [key,config] of Object.entries(publicationFields)) {
  for(const [index,row] of (form.rows?.[key] || []).entries()) {
   const fields=Object.keys(config.fields);
   if(!fields.some(field=>filled(row[field])))continue;
   const missing=fields.filter(field=>!filled(row[field])).map(field=>config.fields[field]);
   if(missing.length)fail(`${config.label}, row ${index+1}: complete ${missing.join(', ')} before submission. Supporting document is optional.`);
  }
 }
}
function validateFinal(form) {
  validatePublications(form);
  // Empty optional subsections are valid; partially entered records must have their primary description.
  const titles={projects:'title',phd:'title',journals:'title',conferences:'title',books:'title',reports:'title',awards:'name',technologyTransfer:'particulars',specialLectures:'title',departmentLevels:'responsibility',instituteLevels:'responsibility'};
  for(const [group, field] of Object.entries(titles)) {
    if(Object.hasOwn(publicationFields,group))continue;
    for(const [index,row] of (form.rows?.[group] || []).entries()) {
      if(typeof row[field]!=='string' || !row[field].trim()) fail(`${group} row ${index+1}: ${field} is required before submission.`);
    }
  }
}
module.exports={draftToken,validateRequest,validateFinal};
