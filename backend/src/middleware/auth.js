const { sql, poolPromise } = require('../config/db');

async function requireAuthenticated(req, res, next) {
  const isMockDevelopment =
    process.env.NODE_ENV === 'development' &&
    process.env.AUTH_MODE === 'mock';

  if (!isMockDevelopment) {
    return res.status(401).json({
      success: false,
      message: 'Production authentication is not configured.',
    });
  }

  const employeeId = process.env.DEV_EMPLOYEE_ID?.trim();
  const expectedUsername = process.env.DEV_USERNAME?.trim();

  if (!employeeId) {
    return res.status(500).json({
      success: false,
      message: 'DEV_EMPLOYEE_ID is not configured.',
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input('EmployeeId', sql.NVarChar(100), employeeId)
      .query(`
        SELECT DISTINCT
          EmployeeBasicInfoId,
          EmployeeId,
          EmployeeName,
          UserName,
          DepartmentId,
          DepartmentName
        FROM HR.dbo.VW_EmployeeBasicDetails
        WHERE EmployeeId = @EmployeeId;
      `);

    if (result.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'The configured mock employee was not found in HR.',
      });
    }

    if (result.recordset.length !== 1) {
      return res.status(409).json({
        success: false,
        message:
          'Multiple HR records match this employee. Check the employee mapping.',
      });
    }

    const employee = result.recordset[0];

    const employeeBasicInfoId =
      employee.EmployeeBasicInfoId?.trim();
    const username = employee.UserName?.trim();
    const departmentId = employee.DepartmentId?.trim();

    if (!employeeBasicInfoId || !username || !departmentId) {
      return res.status(403).json({
        success: false,
        message:
          'The HR record must contain an employee identity, username and department.',
      });
    }

    // Optional check to catch an incorrectly configured test account.
    if (
      expectedUsername &&
      expectedUsername.toLowerCase() !== username.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'DEV_USERNAME does not match the configured employee in HR.',
      });
    }

    req.user = {
      employeeBasicInfoId,
      employeeId: employee.EmployeeId.trim(),
      username,
      name: employee.EmployeeName,
      departmentId,
      departmentName: employee.DepartmentName,
      authMode: 'mock',
    };

    const roles = await pool
      .request()
      .input('Username', sql.NVarChar(256), username)
      .query(`
    SELECT DISTINCT
      U.UserId,
      RM.RoleId
    FROM Proof.dbo.UserMaster AS U
    JOIN Proof.dbo.OrgUnitUserMapping AS UM
      ON UM.UserId = U.UserId
      AND UM.IsActive = 1
    JOIN Proof.dbo.OrgUnitRoleMapping AS RM
      ON RM.RoleMapId = UM.RoleMapId
      AND RM.IsActive = 1
    WHERE LTRIM(RTRIM(U.UserName)) = @Username
      AND U.IsLockedOut = 0
      AND (
        (
          RM.RoleId = 239
          AND RM.RoleMapId = 242
          AND RM.OrganizationUnitId = 133
        )
        OR (
          RM.RoleId = 245
          AND RM.RoleMapId = 248
          AND RM.OrganizationUnitId = 133
        )
        OR (
          RM.RoleId = 254
          AND RM.RoleMapId = 257
          AND RM.OrganizationUnitId = 141
        )
      );
  `);

    const accounts = new Set(roles.recordset.map(row => String(row.UserId)));

    if (accounts.size > 1) {
      return res.status(409).json({
        success: false,
        message: 'Multiple active portal accounts match this username. Contact ERP support.',
      });
    }

    const roleIds = new Set(roles.recordset.map(row => Number(row.RoleId)));
    req.permissions = {
      canApply: roleIds.has(239),
      canManageAppraisalPeriods: roleIds.has(254),
    };

    req.reviewMappings = await require('../services/appraisalWorkflowService')
      .reviewMemberships(pool, req.user);
    req.permissions.canReview = req.reviewMappings.length > 0;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireFaculty(req, res, next) {
  return requireAuthenticated(req, res, error => {
    if (error) return next(error);
    if (!req.permissions?.canApply) {
      return res.status(403).json({
        success: false,
        message: 'Only users with an active IITDH Faculty role can access appraisal applications.',
      });
    }
    return next();
  });
}

module.exports = { requireAuthenticated, requireFaculty };