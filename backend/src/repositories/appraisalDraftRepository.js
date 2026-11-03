const documentRepository = require('./appraisalDocumentRepository');
const publicationRepository = require('./appraisalPublicationRepository');
const { requireEditableWindow } = require('../services/fwPeriodAccess');
const { draftToken } = require('../services/appraisalSubmissionValidation');
const rdRepository = require('./appraisalRDRepository');
const extraRepository = require('./appraisalExtraRepository');
const { sql, poolPromise } = require('../config/db');
const { groups, narratives, fail } = require('../services/appraisalDraftValidation');
const masterColumns = `AppraisalID AS appraisalId, AcademicYearID AS academicYearId,
 CurrentStatus AS status, CreatedOn AS createdOn`;
function request(tx, appraisalId) {
  const r = new sql.Request(tx);
  if (appraisalId) r.input('Id', sql.VarChar(36), appraisalId);
  return r;
}
async function getMaster(tx, user, yearId) {
  const result = await request(tx)
    .input('Employee', sql.VarChar(36), user.employeeBasicInfoId)
    .input('Year', sql.Int, yearId)
    .query(`SELECT ${masterColumns} FROM HR.dbo.FacultyAppraisalDetails WITH(UPDLOCK,HOLDLOCK)
      WHERE Employeebasicinfoid=@Employee AND AcademicYearID=@Year;`);
  if (result.recordset.length > 1) fail('Multiple applications exist for this faculty and academic year. Resolve duplicate master records before saving.', 409);
  return result.recordset[0] || null;
}
async function readRecord(tx, master) {
  if (!master) return null;
  const formData = { academicYearId: master.academicYearId, rows: { projects: [], phd: [] } };
  const instructions = (await request(tx, master.appraisalId).query(`SELECT Particulars, Innovations, OtherInstructionalTasks
    FROM HR.dbo.FacultyAppraisal_InstructionalElement WHERE AppraisalID=@Id;`)).recordset;
  if (instructions.length > 1) fail('Duplicate instructional records exist for this appraisal.', 409);
  for (const [key, rule] of Object.entries(narratives)) formData[key] = instructions[0]?.[rule.column] ?? '';
  const supervision = (await request(tx, master.appraisalId).query(`
    SELECT F.*, SAD.StudentDetailsID AS SourceSupervisionID,
      DGM.DegreeName, SM.RollNo, SM.DisplayName AS StudentName
    FROM HR.dbo.FacultyAppraisal_ProjectSupervision F
    LEFT JOIN Academics.dbo.StudentMaster SM ON SM.StudentMasterID=F.StudentMasterID
    LEFT JOIN Academics.dbo.StudentAcademicDetails SAD ON SAD.StudentMasterID=F.StudentMasterID
    LEFT JOIN Academics.dbo.ProgramMaster PM ON PM.ProgramID=SAD.ProgramId
    LEFT JOIN Academics.dbo.DegreeMaster DGM ON DGM.DegreeID=PM.DegreeID
    WHERE F.AppraisalID=@Id ORDER BY F.ProjectSupervisionID;`)).recordset;
  const seen = new Set();
  for (const row of supervision) {
    const studentId = String(row.StudentMasterID).toLowerCase();
    if (seen.has(studentId)) fail('A saved student has multiple supervision/academic records. Existing columns cannot distinguish them.', 409);
    seen.add(studentId);
    const key = row.DegreeName === 'PhD' ? 'phd' : ['MTech','MTech-R'].includes(row.DegreeName) ? 'projects' : null;
    if (!key || !row.SourceSupervisionID) fail('A saved supervision record cannot be classified from the student academic source. Verify its source mapping.', 409);
    const config = groups[key];
    const item = { id: row.ProjectSupervisionID, supervisionType: config.type,
      sourceSupervisionId: row.SourceSupervisionID, studentMasterId: row.StudentMasterID,
      studentName: row.StudentName || '', rollNo: row.RollNo || '',
      student: row.StudentName || '', students: row.StudentName || '' };
    for (const [field, rule] of Object.entries(config.fields)) item[field] = row[rule.column] ?? '';
    formData.rows[key].push(item);
  }
  for (const [key, config] of Object.entries(groups)) {
    if (config.type) continue;
    const result = await request(tx, master.appraisalId).query(`SELECT * FROM HR.dbo.[${config.table}]
      WHERE AppraisalID=@Id ORDER BY ${['books','reports','awards'].includes(key) ? 'Sno,' : ''} [${config.pk}];`);
    formData.rows[key] = result.recordset.map(row => {
      const item = { id: row[config.pk] };
      for (const [field, rule] of Object.entries(config.fields)) item[field] = row[rule.column] ?? '';
      if (key === 'awards' && row.SupportingDoc) item.supportingDoc = row.SupportingDoc;
      return item;
    });
  }
  Object.assign(formData.rows, await rdRepository.readAll(tx, master.appraisalId));
  const extra = await extraRepository.readAll(tx, master.appraisalId);
  Object.assign(formData, extra.text);
  Object.assign(formData.rows, extra.rows);
  formData.attachments = await documentRepository.list(tx,master.appraisalId);
  const workflow=(await request(tx,master.appraisalId).query(`
    SELECT ReviewRound AS reviewRound,StageOrder AS stageOrder,StageCode AS stage,AssignedName AS assignedName,StageStatus AS status,CompletedOn AS completedOn
    FROM HR.dbo.FacultyAppraisal_Workflow WHERE AppraisalID=@Id ORDER BY ReviewRound,StageOrder;`)).recordset;
  const history=(await request(tx,master.appraisalId).query(`
    SELECT HistoryID AS id,ReviewRound AS reviewRound,StageCode AS stage,Action AS action,ActorName AS actorName,
    ActionOn AS actionAt,CASE WHEN Action='Returned to Faculty' THEN CorrectionInstructions ELSE NULL END AS correctionInstructions
    FROM HR.dbo.FacultyAppraisal_WorkflowHistory WHERE AppraisalID=@Id ORDER BY HistoryID;`)).recordset.map(({comments,...event})=>event);
  const pending=workflow.find(step=>step.status==='Pending');
  return { ...master, steps:workflow, correctionInstructions:master.status==='Returned to Faculty'?[...history].reverse().find(event=>event.action==='Returned to Faculty')?.correctionInstructions || '':null, history, pendingWith:pending?.assignedName || null, pendingStage:pending?.stage || null, draftToken: draftToken({formData,status:master.status,reviewRound:Math.max(0,...workflow.map(step=>step.reviewRound || 0))}), formData, savedRowCounts: Object.fromEntries(Object.entries(formData.rows).map(([key, rows]) => [key, rows.length])), savedScope: ['instructional', 'research', 'rd', 'institutional', 'self', 'futureWork', 'otherDepartmentWork'], attachmentsSaved: false, mappedAttachmentsSaved: true,
    concurrencyMode: 'Last successful save wins; the original schema has no version column.' };
}
async function transact(work) {
  const tx = new sql.Transaction(await poolPromise);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try { await tx.rollback(); } catch { /* retain the original error */ }
    throw error;
  }
}
async function validateSupervision(tx, user, period, config, row) {
  const result = await request(tx)
    .input('Source', sql.VarChar(36), row.sourceSupervisionId)
    .input('Student', sql.VarChar(36), row.studentMasterId)
    .input('Employee', sql.VarChar(36), user.employeeBasicInfoId)
    .input('Start', sql.Date, period.reportingFrom)
    .input('End', sql.Date, period.reportingEndExclusive)
    .input('Type', sql.VarChar(10), config.type)
    .query(`SELECT COUNT(*) AS Matches
      FROM Academics.dbo.StudentAcademicDetails SAD
      JOIN Academics.dbo.StudentMaster SM ON SM.StudentMasterID=SAD.StudentMasterID
      JOIN Academics.dbo.ProgramMaster PM ON PM.ProgramID=SAD.ProgramId
      JOIN Academics.dbo.DegreeMaster DGM ON DGM.DegreeID=PM.DegreeID
      WHERE SAD.StudentDetailsID=@Source AND SAD.StudentMasterID=@Student
      AND (LTRIM(RTRIM(SAD.Guide))=@Employee OR LTRIM(RTRIM(SAD.CoGuide))=@Employee)
      AND ((@Type='PHD' AND DGM.DegreeType=3)
        OR (@Type='PROJECT' AND DGM.DegreeName IN(N'MTech',N'MTech-R')))
      AND SM.DOJ<@End AND (SAD.CourseCompletionDate IS NULL OR SAD.CourseCompletionDate>=@Start);`);
  if (result.recordset[0].Matches !== 1) fail('A supervision row no longer matches the faculty, degree or reporting period. Refresh and verify the student mapping.', 409);
}
async function getCurrent(user, period) {
  return transact(async tx => readRecord(tx, await getMaster(tx, user, period.academicYearId)));
}
async function saveDraft(user, period, data) {
  return transact(async tx => {
    let master = await getMaster(tx, user, period.academicYearId);
    await requireEditableWindow(tx, period.academicYearId, master?.status);
    if (master) {
      if (!['Draft','Returned to Faculty'].includes(master.status)) fail('Only drafts or applications returned to you can be edited.', 409);
    } else {
      const result = await request(tx)
        .input('Employee', sql.VarChar(36), user.employeeBasicInfoId)
        .input('Year', sql.Int, period.academicYearId)
        .input('Actor', sql.NVarChar(100), user.username)
        .query(`INSERT HR.dbo.FacultyAppraisalDetails
          (AppraisalID,Employeebasicinfoid,AcademicYearID,CurrentStatus,CreatedBy,CreatedOn)
          OUTPUT inserted.AppraisalID AS appraisalId
          VALUES(CONVERT(VARCHAR(36),NEWID()),@Employee,@Year,'Draft',@Actor,GETDATE());`);
      master = { appraisalId: result.recordset[0].appraisalId };
    }
    const id = master.appraisalId;
    if (Object.keys(data.narratives).length) {
      const found = await request(tx, id).query(`SELECT InstructionalElementID FROM HR.dbo.FacultyAppraisal_InstructionalElement WHERE AppraisalID=@Id;`);
      if (!found.recordset.length) await request(tx, id).query(`INSERT HR.dbo.FacultyAppraisal_InstructionalElement(AppraisalID,UpdatedOn) VALUES(@Id,GETDATE());`);
      const r = request(tx, id);
      const assignments = Object.entries(data.narratives).map(([key, value], index) => {
        r.input(`N${index}`, sql.NVarChar(1000), value);
        return `[${narratives[key].column}]=@N${index}`;
      });
      await r.query(`UPDATE HR.dbo.FacultyAppraisal_InstructionalElement SET ${assignments.join(',')},UpdatedOn=GETDATE() WHERE AppraisalID=@Id;`);
    }
    // The original supervision table has no PROJECT/PHD discriminator.
    // Validate both supplied groups first, then replace the shared table once.
    if (Object.hasOwn(data.groups, 'projects')) {
      for (const key of ['projects', 'phd']) {
        for (const row of data.groups[key]) await validateSupervision(tx, user, period, groups[key], row);
      }
      await request(tx, id).query('DELETE FROM HR.dbo.FacultyAppraisal_ProjectSupervision WHERE AppraisalID=@Id;');
    }
    const publicationRowIds = {};
    for (const [key, rows] of Object.entries(data.groups)) {
      const config = groups[key];
      if (!config.type) {
        publicationRowIds[key] = await publicationRepository.save(tx,id,key,rows,config);
        continue;
      }
      for (const [index, row] of rows.entries()) {
        const r = request(tx, id);
        const columns = ['AppraisalID', 'UpdatedOn'];
        const parameters = ['@Id', 'GETDATE()'];
        for (const [field, rule] of Object.entries(config.fields)) {
          // This source identity is validated, but original table has no column for it.
          if (field === 'sourceSupervisionId') continue;
          const name = `F${columns.length}`;
          // Original title/name columns remain NOT NULL. Empty text is allowed for drafts.
          const input = row[field] ?? (['title', 'name'].includes(field) ? '' : null);
          r.input(name, rule.year ? sql.Int : sql.NVarChar(rule.max), input);
          columns.push(rule.column); parameters.push(`@${name}`);
        }
        if (['books', 'reports', 'awards'].includes(key)) {
          columns.push('Sno'); parameters.push('@Order');
          r.input('Order', sql.Int, index + 1);
        }
        await r.query(`INSERT HR.dbo.[${config.table}](${columns.map(c => `[${c}]`).join(',')}) VALUES(${parameters.join(',')});`);
      }
    }
    await extraRepository.saveAll(tx, id, data.extras || {});
    Object.assign(publicationRowIds,await rdRepository.saveAll(tx, id, data.rdGroups || {}));
    const record = await readRecord(tx, await getMaster(tx, user, period.academicYearId));
    return {...record, publicationRowIds};
  });
}
async function readForSubmission(tx,user,period) {
  return readRecord(tx,await getMaster(tx,user,period.academicYearId));
}
module.exports = { getCurrent, saveDraft, readForSubmission, readRecord };
