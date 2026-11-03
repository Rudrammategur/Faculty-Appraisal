const { requireEditableWindow } = require('../services/fwPeriodAccess');
const express = require('express');
const { sql, poolPromise } = require('../config/db');
const { requireFaculty } = require('../middleware/auth');
const { detectType, decodeDocument, fail } = require('../services/responsibilityDocument');
const router = express.Router();
router.use(requireFaculty);

router.all('/:id', async (req, res, next) => {
  let tx;
  try {
    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
      res.set('Allow', 'GET, PUT, DELETE');
      return res.status(405).json({ success: false, message: 'Method not allowed.' });
    }
    if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) fail('Invalid responsibility ID.');
    const id = Number(req.params.id);
    const buffer = req.method === 'PUT' ? decodeDocument(req.body) : null;
    tx = new sql.Transaction(await poolPromise);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = () => new sql.Request(tx)
      .input('Id', sql.Int, id)
      .input('Employee', sql.VarChar(36), req.user.employeeBasicInfoId);
    // Same transaction protects against a concurrent draft save/deletion/status transition.
    const found = await request().query(`
      SELECT R.SupportingDoc,A.CurrentStatus,A.AcademicYearID
      FROM HR.dbo.FacultyAppraisalDetails A WITH(UPDLOCK,HOLDLOCK)
      JOIN HR.dbo.FacultyAppraisal_Responsibilities R WITH(UPDLOCK,HOLDLOCK)
        ON R.AppraisalID=A.AppraisalID
      WHERE R.ResponsibilityID=@Id AND A.Employeebasicinfoid=@Employee;`);
    if (!found.recordset.length) fail('Responsibility not found.', 404);
    if (found.recordset.length !== 1) fail('Duplicate responsibility IDs exist. Contact ERP support.', 409);
    const row = found.recordset[0];
    if (req.method !== 'GET' && !['Draft','Returned to Faculty'].includes(row.CurrentStatus)) fail('Only draft or returned application documents can be changed.', 409);
    if (req.method !== 'GET') await requireEditableWindow(tx, row.AcademicYearID, row.CurrentStatus);
    let document;
    if (req.method === 'GET') {
      if (!row.SupportingDoc?.length) fail('No supporting document is saved.', 404);
      document = row.SupportingDoc;
    } else {
      await request().input('Document', sql.VarBinary(sql.MAX), buffer).query(`
        UPDATE R SET SupportingDoc=@Document,UpdatedOn=GETDATE()
        FROM HR.dbo.FacultyAppraisal_Responsibilities R
        JOIN HR.dbo.FacultyAppraisalDetails A ON A.AppraisalID=R.AppraisalID
        WHERE R.ResponsibilityID=@Id AND A.Employeebasicinfoid=@Employee;`);
    }
    await tx.commit();
    tx = null;
    res.set('Cache-Control', 'no-store');
    if (document) {
      const type = detectType(document) || { mime: 'application/octet-stream', extension: 'bin' };
      res.set('Content-Type', type.mime);
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Disposition', `attachment; filename="responsibility-${id}.${type.extension}"`);
      return res.send(document);
    }
    return res.json({ success: true, data: { id, hasSupportingDocument: req.method === 'PUT' } });
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    return next(error);
  }
});
module.exports = router;
