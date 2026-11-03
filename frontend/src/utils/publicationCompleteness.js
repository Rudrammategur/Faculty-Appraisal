export const publicationFields={
 technologyTransfer:{label:'III. b) Products / Processes / Technology Transfer / Patents',fields:{particulars:'Particulars',publicationGrantDate:'Date of publication / grant',issuedBy:'Issued by',monthYear:'Month-Year'}},
 specialLectures:{label:'III. c) Continuing Education & Special Lectures',fields:{title:'Lecture title',date:'Date',place:'Place',programme:'Programme',information:'Other relevant information'}},
 departmentLevels:{label:'IV. a) Department / Centre Levels',fields:{responsibility:'Responsibility',activities:'Activities performed',fromDate:'From date',toDate:'To date'}},
 instituteLevels:{label:'IV. b) Institute Levels',fields:{responsibility:'Responsibility',activities:'Activities performed',fromDate:'From date',toDate:'To date'}},

 journals:{label:'Journal papers',fields:{authors:'Authors',title:'Paper title',venue:'Journal name',volume:'Volume',year:'Year',pages:'Pages'}},
 conferences:{label:'Conference papers',fields:{authors:'Authors',title:'Paper title',venue:'Conference name',place:'Place',year:'Year',pages:'Pages'}},
 books:{label:'Books / Monographs',fields:{title:'Title',publisher:'Publisher and year',authors:'Authors',remarks:'Authored / Edited'}},
 reports:{label:'Technical reports',fields:{title:'Report title',particulars:'Particulars',authors:'Authors',remarks:'External / Internal'}},
 awards:{label:'Awards / Prizes / Medals',fields:{name:'Award name',issuer:'Issued by',place:'Place',month:'Month-Year'}},
}
const filled=value=>value!==undefined && value!==null && String(value).trim()!==''
export function publicationMissingFields(group,row){
 const fields=Object.keys(publicationFields[group]?.fields || {})
 return fields.some(field=>filled(row[field]))?fields.filter(field=>!filled(row[field])):[]
}
export const sectionRequiredGroups={research:['journals','conferences','books','reports','awards'],rd:['technologyTransfer','specialLectures'],institutional:['departmentLevels','instituteLevels']}
export function incompletePublications(form,groups=Object.keys(publicationFields)){
 return groups.flatMap(group=>(form.rows?.[group] || []).flatMap((row,index)=>{
  const missing=publicationMissingFields(group,row)
  return missing.length?[{group,index,label:publicationFields[group].label,missing:missing.map(field=>publicationFields[group].fields[field])}]:[]
 }))
}
export function clearIncompletePublications(form,groups=Object.keys(publicationFields)){
 const rows={...form.rows}
 for(const group of groups){
  if(!Array.isArray(rows[group]))continue
  rows[group]=rows[group].flatMap(row=>{
   if(!publicationMissingFields(group,row).length)return [row]
   // Keep an existing responsibility document while clearing its text.
   // The old binary-document API does not support deleting it in a text save.
   if(['departmentLevels','instituteLevels'].includes(group) && row.hasSupportingDocument){
    return [{...row,...Object.fromEntries(Object.keys(publicationFields[group].fields).map(field=>[field,'']))}]
   }
   return []
  })
 }
 return {...form,rows}
}
