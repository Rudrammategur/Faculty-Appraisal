const { sql } = require('../config/db');
const V = require('../services/appraisalExtraValidation');
function request(tx, id) {
  return new sql.Request(tx).input('Id', sql.VarChar(36), id);
}
async function readOthers(tx, id) {
  const result = await request(tx, id).query(`SELECT OtherWorkID,${Object.values(V.fieldColumns).map(column => `[${column}]`).join(',')},UpdatedOn FROM HR.dbo.FacultyAppraisal_Others
    WHERE AppraisalID=@Id;`);
  if (result.recordset.length > 1) V.fail('Duplicate Others records exist for this application. Resolve them before saving.', 409);
  const row = result.recordset[0];
  const resultData = { otherWorkId: row?.OtherWorkID ?? null, updatedOn: row?.UpdatedOn ?? null };
  for (const [key, column] of Object.entries(V.fieldColumns)) resultData[key] = row?.[column] ?? '';
  return resultData;
}
async function readResponsibilities(tx, id) {
  const result = await request(tx, id).query(`SELECT ResponsibilityID,SNo,Level,Responsibility,
    ActivtiesPerformed,CONVERT(CHAR(10),Fromdate,23) AS FromDate,
    CONVERT(CHAR(10),Todate,23) AS ToDate,UpdatedOn,
    CASE WHEN SupportingDoc IS NULL THEN 0 ELSE 1 END AS HasSupportingDocument
    FROM HR.dbo.FacultyAppraisal_Responsibilities WHERE AppraisalID=@Id
    ORDER BY Level,SNo,ResponsibilityID;`);
  const data = { departmentLevels: [], instituteLevels: [] };
  const seen = new Set();
  for (const row of result.recordset) {
    if (seen.has(row.ResponsibilityID)) V.fail('Duplicate responsibility identity values exist.', 409);
    seen.add(row.ResponsibilityID);
    const key = row.Level === 'Department' ? 'departmentLevels' : row.Level === 'Institute' ? 'instituteLevels' : null;
    if (!key) V.fail('An unsupported responsibility level exists in this application.', 409);
    data[key].push({
      id: row.ResponsibilityID,
      responsibility: row.Responsibility ?? '',
      activities: row.ActivtiesPerformed ?? '',
      fromDate: row.FromDate ?? '', toDate: row.ToDate ?? '',
      hasSupportingDocument: Boolean(row.HasSupportingDocument),
      updatedOn: row.UpdatedOn,
    });
  }
  return data;
}

async function saveOthers(tx, id, values) {
  const existing = await readOthers(tx, id);
  if (!existing.otherWorkId) {
    await request(tx, id).query(`INSERT HR.dbo.FacultyAppraisal_Others(OtherWorkID,AppraisalID,UpdatedOn)
      VALUES(CONVERT(VARCHAR(36),NEWID()),@Id,GETDATE());`);
  }
  const r = request(tx, id);
  const updates = Object.entries(values).map(([key, value], index) => {
    r.input(`T${index}`, sql.NVarChar(1000), value);
    return `[${V.fieldColumns[key]}]=@T${index}`;
  });
  await r.query(`UPDATE HR.dbo.FacultyAppraisal_Others SET ${updates.join(',')},UpdatedOn=GETDATE() WHERE AppraisalID=@Id;`);
  return readOthers(tx, id);
}
async function saveResponsibilities(tx, id, groups) {
  const existing = await readResponsibilities(tx, id);
  for (const [key, rows] of Object.entries(groups)) {
    const level = V.levels[key];
    const existingById = new Map(existing[key].map(row => [row.id, row]));
    const incomingIds = new Set(rows.filter(row => row.id !== null).map(row => row.id));
    for (const row of rows) {
      if (row.id !== null && !existingById.has(row.id)) V.fail('A responsibility ID does not belong to this application and level. Reload the draft.', 409);
    }
    for (const row of existing[key]) {
      if (!incomingIds.has(row.id)) {
        if (row.hasSupportingDocument) V.fail('A removed responsibility contains a document. Document-aware deletion must be implemented first.', 409);
        await request(tx, id).input('Row', sql.Int, row.id).input('Level', sql.VarChar(20), level)
          .query(`DELETE FROM HR.dbo.FacultyAppraisal_Responsibilities
            WHERE AppraisalID=@Id AND ResponsibilityID=@Row AND Level=@Level AND SupportingDoc IS NULL;`);
      }
    }
    for (const [index, row] of rows.entries()) {
      const r = request(tx, id).input('Level', sql.VarChar(20), level)
        .input('SNo', sql.Int, index + 1)
        .input('Responsibility', sql.NVarChar(500), row.responsibility)
        .input('Activities', sql.NVarChar(1000), row.activities)
        .input('From', sql.Date, row.fromDate).input('To', sql.Date, row.toDate);
      if (row.id === null) {
        await r.query(`INSERT HR.dbo.FacultyAppraisal_Responsibilities
          (AppraisalID,SNo,Level,Responsibility,ActivtiesPerformed,Fromdate,Todate,UpdatedOn)
          VALUES(@Id,@SNo,@Level,@Responsibility,@Activities,@From,@To,GETDATE());`);
      } else {
        await r.input('Row', sql.Int, row.id).query(`UPDATE HR.dbo.FacultyAppraisal_Responsibilities
          SET SNo=@SNo,Responsibility=@Responsibility,ActivtiesPerformed=@Activities,
            Fromdate=@From,Todate=@To,UpdatedOn=GETDATE()
          WHERE AppraisalID=@Id AND ResponsibilityID=@Row AND Level=@Level;`);
      }
    }
  }
  return readResponsibilities(tx, id);
}
async function readAll(tx, id) {
  // Sequential requests on the same transaction/connection.
  const others = await readOthers(tx, id);
  const rows = await readResponsibilities(tx, id);
  const { otherWorkId, updatedOn, ...text } = others;
  return { text, rows };
}
async function saveAll(tx, id, extras) {
  if (extras.others) await saveOthers(tx, id, extras.others);
  if (extras.responsibilities) await saveResponsibilities(tx, id, extras.responsibilities);
}
module.exports = { readAll, saveAll };
