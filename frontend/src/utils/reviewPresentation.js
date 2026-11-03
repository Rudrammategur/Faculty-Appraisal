const key=value=>String(value ?? '').trim().toLowerCase()
export function prepareSupervision(source=[],saved=[],type='phd'){
 return saved.map(row=>{
  const item=source.find(candidate=>key(candidate.studentMasterId)===key(row.studentMasterId)) || {}
  const merged={...item,...row}
  const name=row.studentName || row.student || row.students || item.studentName || ''
  merged.studentName=name
  merged.student=name
  merged.students=name
  if(type==='phd'){
   merged.reg=row.reg || `${item.registrationYear ?? '—'} / ${item.studyMode || '—'}`
  }else{
   merged.year=row.year ?? item.registrationYear ?? ''
  }
  return merged
 })
}
