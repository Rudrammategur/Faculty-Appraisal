const { sql, poolPromise } = require('../config/db');
const { mapProjects } = require('../services/facultyResearchProjects');
exports.getResearchProjects = async (req, res, next) => {
  try {
    if (!req.user?.employeeBasicInfoId) return res.status(401).json({ success: false, message: 'Faculty identity is unavailable.' });
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Employee', sql.NVarChar(36), req.user.employeeBasicInfoId)
      .query(`SELECT InstanceId,ProjectCode,CategoryName,FinancialYear,ProjectType,
        ProjectName,FundingAgency,ProjectBudget,PrincipalInvestigator,
        FromDate,ToDate,TotalDuration,ProjectStatus,ClosureDate,ExtensionEndDate
        FROM Projects.dbo.VW_ProjectDetails
        WHERE LTRIM(RTRIM(EmployeeBasicInfoId))=@Employee;`);
    const mapped = mapProjects(result.recordset, req.appraisalPeriod);
    return res.json({ success: true, ...mapped });
  } catch (error) { next(error); }
};
