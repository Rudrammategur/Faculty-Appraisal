const approval = require('../repositories/appraisalApprovalRepository');
const { requireEditableWindow } = require('../services/fwPeriodAccess');
const { sql, poolPromise } = require('../config/db');
const repository = require('../repositories/appraisalDraftRepository');
const { fail } = require('../services/appraisalDraftValidation');
const { validateRequest, validateFinal } = require('../services/appraisalSubmissionValidation');
exports.submit = async (req, res, next) => {
  let tx;
  try {
    validateRequest(req.body);
    if (req.body.academicYearId !== req.appraisalPeriod.academicYearId) fail('The academic year does not match the request.');
    tx = new sql.Transaction(await poolPromise);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const record = await repository.readForSubmission(tx, req.user, req.appraisalPeriod);
    if (!record || record.appraisalId.toLowerCase() !== req.body.appraisalId.toLowerCase()) fail('Application not found.', 404);
    if (['Submitted','HOD Recommended','Dean FW Recommended','Approved'].includes(record.status)) {
      await tx.commit(); tx = null;
      return res.json({ success: true, alreadySubmitted: true, data: record });
    }
    if (!['Draft','Returned to Faculty'].includes(record.status)) fail('Only a draft or returned application can be submitted.', 409);
    if (record.draftToken !== req.body.draftToken) fail('The draft changed after saving. Reload and review before submitting.', 409);
    await requireEditableWindow(tx, req.appraisalPeriod.academicYearId, record.status);
    validateFinal(record.formData);
    await approval.start(tx, record, req.user);
    const result = await new sql.Request(tx)
      .input('Id', sql.VarChar(36), record.appraisalId)
      .input('Employee', sql.VarChar(36), req.user.employeeBasicInfoId)
      .input('Year', sql.Int, req.appraisalPeriod.academicYearId)
      .query(`UPDATE HR.dbo.FacultyAppraisalDetails
        SET CurrentStatus='Submitted'
        WHERE AppraisalID=@Id AND Employeebasicinfoid=@Employee
          AND AcademicYearID=@Year AND CurrentStatus IN ('Draft','Returned to Faculty');`);
    if (result.rowsAffected[0] !== 1) fail('The application changed. Reload before submitting.', 409);
    const submitted = await repository.readRecord(tx, {...record, status:'Submitted'});
    await tx.commit(); tx = null;
    return res.json({ success: true, alreadySubmitted: false, data: submitted });
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    next(error);
  }
};
