const {sql}=require('../config/db');
const {fail}=require('../services/appraisalDraftValidation');
async function save(connection,id,key,rows,config){
 const req=()=>new sql.Request(connection).input('Id',sql.VarChar(36),id);
 const existing=(await req().query(`SELECT [${config.pk}] AS id FROM HR.dbo.[${config.table}] WHERE AppraisalID=@Id;`)).recordset;
 const known=new Set(existing.map(row=>row.id));
 const incoming=new Set(rows.filter(row=>row.id).map(row=>row.id));
 for(const row of rows)if(row.id && !known.has(row.id))fail('A publication row does not belong to this application. Reload the draft.',409);
 for(const row of existing)if(!incoming.has(row.id)){
  await req().input('Target',sql.VarChar(50),key).input('Row',sql.Int,row.id)
   .query('DELETE FROM HR.dbo.FacultyAppraisal_Documents WHERE AppraisalID=@Id AND TargetCode=@Target AND RowID=@Row;');
  await req().input('Row',sql.Int,row.id).query(`DELETE FROM HR.dbo.[${config.table}] WHERE AppraisalID=@Id AND [${config.pk}]=@Row;`);
 }
 const mappings={};
 for(const [index,row] of rows.entries()){
  const r=req();const columns=[],parameters=[];
  for(const [field,rule] of Object.entries(config.fields)){
   const name='F'+columns.length;
   r.input(name,rule.year?sql.Int:sql.NVarChar(rule.max),row[field] ?? (['title','name'].includes(field)?'':null));
   columns.push(rule.column);parameters.push('@'+name);
  }
  if(['books','reports','awards'].includes(key)){r.input('Order',sql.Int,index+1);columns.push('Sno');parameters.push('@Order');}
  let rowId=row.id;
  if(rowId){
   r.input('Row',sql.Int,rowId);
   await r.query(`UPDATE HR.dbo.[${config.table}] SET ${columns.map((c,i)=>`[${c}]=${parameters[i]}`).join(',')},UpdatedOn=GETDATE() WHERE AppraisalID=@Id AND [${config.pk}]=@Row;`);
  }else{
   const result=await r.query(`INSERT HR.dbo.[${config.table}](AppraisalID,UpdatedOn,${columns.map(c=>`[${c}]`).join(',')}) OUTPUT inserted.[${config.pk}] AS id VALUES(@Id,GETDATE(),${parameters.join(',')});`);
   rowId=result.recordset[0].id;
  }
  if(row.clientRowKey)mappings[row.clientRowKey]=rowId;
 }
 return mappings;
}
module.exports={save};
