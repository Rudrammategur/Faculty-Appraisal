const { sql } = require('../config/db');
const { definitions } = require('../services/appraisalRDValidation');
const { fail } = require('../services/appraisalExtraValidation');
const request = (tx, id) => new sql.Request(tx).input('Id', sql.VarChar(36), id);
async function readAll(tx, id) {
  const groups = {};
  for (const [key, definition] of Object.entries(definitions)) {
    const columns = Object.entries(definition.fields).map(([field, rule]) => rule.date
      ? `CONVERT(CHAR(10),[${rule.column}],23) AS [${field}]`
      : `[${rule.column}] AS [${field}]`);
    const { recordset } = await request(tx, id).query(`SELECT AppraisalRowID AS id,Sno,${columns.join(',')} FROM HR.dbo.[${definition.table}] WHERE AppraisalID=@Id ORDER BY Sno;`);
    const seen = new Set();
    groups[key] = recordset.map(row => {
      if (seen.has(row.Sno)) fail(`Duplicate Sno values exist in ${definition.table}. Contact ERP support.`, 409);
      seen.add(row.Sno);
      return {id:row.id,...Object.fromEntries(Object.keys(definition.fields).map(field => [field, row[field] ?? '']))};
    });
  }
  return groups;
}
async function saveAll(tx, id, groups = {}) {
  const mappings = {};
  for (const [key, rows] of Object.entries(groups)) {
    const definition = definitions[key];
    const existing=(await request(tx,id).query(`SELECT AppraisalRowID AS id FROM HR.dbo.[${definition.table}] WHERE AppraisalID=@Id;`)).recordset;
    const known=new Set(existing.map(row=>row.id));
    const retained=new Set(rows.filter(row=>row.id).map(row=>row.id));
    for(const row of rows)if(row.id && !known.has(row.id))fail('An R&D row does not belong to this application. Reload the draft.',409);
    for(const row of existing)if(!retained.has(row.id)){
      await request(tx,id).input('Target',sql.VarChar(50),key).input('Row',sql.Int,row.id).query('DELETE FROM HR.dbo.FacultyAppraisal_Documents WHERE AppraisalID=@Id AND TargetCode=@Target AND RowID=@Row;');
      await request(tx,id).input('Row',sql.Int,row.id).query(`DELETE FROM HR.dbo.[${definition.table}] WHERE AppraisalID=@Id AND AppraisalRowID=@Row;`);
    }
    mappings[key]={};
    for (const [index, row] of rows.entries()) {
      const r = request(tx, id).input('Order', sql.Int, index + 1);
      const columns = ['AppraisalID', 'Sno'];
      const params = ['@Id', '@Order'];
      for (const [field, rule] of Object.entries(definition.fields)) {
        const name = `Value${columns.length}`;
        r.input(name, rule.date ? sql.Date : sql.NVarChar(rule.max > 4000 ? sql.MAX : rule.max), row[field]);
        columns.push(rule.column); params.push(`@${name}`);
      }
      let rowId=row.id;
      if(rowId){
        await r.input('Row',sql.Int,rowId).query(`UPDATE HR.dbo.[${definition.table}] SET ${columns.slice(1).map((c,i)=>`[${c}]=${params[i+1]}`).join(',')} WHERE AppraisalID=@Id AND AppraisalRowID=@Row;`);
      }else{
        rowId=(await r.query(`INSERT HR.dbo.[${definition.table}](${columns.map(c=>`[${c}]`).join(',')}) OUTPUT inserted.AppraisalRowID AS id VALUES(${params.join(',')});`)).recordset[0].id;
      }
      if(row.clientRowKey)mappings[key][row.clientRowKey]=rowId;
    }
  }
  return mappings;
}
module.exports = { readAll, saveAll };
