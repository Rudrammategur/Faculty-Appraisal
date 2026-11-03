const { readWindow } = require('../services/fwPeriodAccess');
const { sql, poolPromise } = require("../config/db");

async function loadAppraisalPeriod(req, res, next) {
  try {
    let rawYearId = req.query.academicYearId;
    if (rawYearId === undefined) {
      const pool = await poolPromise;
      const published = await pool.request().query(`
        SELECT TOP(1) AcademicYearID
        FROM HR.dbo.FacultyAppraisal_CycleSettings
        WHERE IsPublished=1
        ORDER BY CASE
          WHEN SYSUTCDATETIME()>=ApplicationStartAt AND SYSUTCDATETIME()<ApplicationEndAt THEN 0
          WHEN SYSUTCDATETIME()<ApplicationStartAt THEN 1 ELSE 2 END,
          CASE WHEN SYSUTCDATETIME()<ApplicationStartAt THEN ApplicationStartAt END ASC,
          ApplicationEndAt DESC,AcademicYearID DESC;`);
      if (!published.recordset.length) return res.status(409).json({success:false,message:'Faculty Welfare Office has not published an appraisal cycle yet.'});
      rawYearId = String(published.recordset[0].AcademicYearID);
    }

    if (
      typeof rawYearId !== "string" ||
      !/^[1-9]\d*$/.test(rawYearId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid academicYearId is required."
      });
    }

    const academicYearId = Number(rawYearId);

    if (
      !Number.isSafeInteger(academicYearId) ||
      academicYearId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid academicYearId."
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input("AcademicYearId", sql.Int, academicYearId)
      .query(`
        SELECT
          AcademicYearID,
          AcademicYear,
          StartYear,
          EndYear,
          CONVERT(
            CHAR(10),
            DATEFROMPARTS(StartYear, 8, 1),
            23
          ) AS ReportingFrom,
          CONVERT(
            CHAR(10),
            DATEFROMPARTS(EndYear, 7, 31),
            23
          ) AS ReportingTo,
          CONVERT(
            CHAR(10),
            DATEFROMPARTS(EndYear, 8, 1),
            23
          ) AS ReportingEndExclusive
        FROM Academics.dbo.AcademicYearDetails
        WHERE AcademicYearID = @AcademicYearId;
      `);

    if (result.recordset.length !== 1) {
      return res.status(404).json({
        success: false,
        message: "Appraisal academic year was not found."
      });
    }

    const row = result.recordset[0];

    if (
      row.StartYear < 1 ||
      row.EndYear > 9999 ||
      row.EndYear !== row.StartYear + 1
    ) {
      return res.status(409).json({
        success: false,
        message: "The academic year configuration is invalid."
      });
    }

    req.appraisalPeriod = {
      academicYearId: row.AcademicYearID,
      academicYear: row.AcademicYear,
      reportingFrom: row.ReportingFrom,
      reportingTo: row.ReportingTo,
      reportingEndExclusive: row.ReportingEndExclusive
    };

    req.appraisalPeriod.applicationWindow = await readWindow(pool, academicYearId);
    req.appraisalPeriod.serverNow = new Date().toISOString();
    next();
  } catch (error) {
    next(error);
  }
}

function bindAppraisalPeriod(request, period) {
  if (!period) {
    throw new Error("Appraisal period has not been loaded.");
  }

  return request
    .input("AcademicYearId", sql.Int, period.academicYearId)
    .input("PeriodStart", sql.Date, period.reportingFrom)
    .input(
      "PeriodEndExclusive",
      sql.Date,
      period.reportingEndExclusive
    );
}

module.exports = {
  loadAppraisalPeriod,
  bindAppraisalPeriod
};