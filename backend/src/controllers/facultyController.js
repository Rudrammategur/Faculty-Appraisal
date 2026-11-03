const { sql, poolPromise } = require("../config/db");
const {
  bindAppraisalPeriod
} = require("../middleware/appraisalPeriod");

exports.getFacultyProfile = async (req, res, next) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee identity is not available."
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input("EmployeeId", sql.NVarChar, String(employeeId))
      .query(`
  SELECT
    e.EmployeeBasicInfoId,
    e.EmployeeId,
    e.EmployeeName,
    e.OfficialMailID,
    e.DepartmentName,
    e.EmployeeDesignationName,
    CONVERT(char(10), e.JoiningDate, 23) AS JoiningDate,
    e.DepartmentId,
    e.EmployeeDesignationId,
    e.UserName,
    a.BasicPay,
    a.PayLevel
  FROM HR.dbo.VW_EmployeeBasicDetails e
  LEFT JOIN HR.dbo.EmployeeAppointmentDetails a
    ON a.EmployeeBasicInfoId = e.EmployeeBasicInfoId
  WHERE e.EmployeeId = @EmployeeId;
`);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Faculty employee details not found."
      });
    }

    if (result.recordset.length > 1) {
      return res.status(409).json({
        success: false,
        message: "Multiple employee records found. Please contact ERP support."
      });
    }

    const employee = result.recordset[0];

    return res.status(200).json({
      success: true,
      data: {
        employeeBasicInfoId: employee.EmployeeBasicInfoId,
        employeeId: employee.EmployeeId,
        name: employee.EmployeeName || "",
        email: employee.OfficialMailID || "",
        designation: employee.EmployeeDesignationName || "",
        department: employee.DepartmentName || "",
        departmentId: employee.DepartmentId,
        designationId: employee.EmployeeDesignationId,
        joiningDate: employee.JoiningDate || "",
        username: employee.UserName || "",
        payLevel: employee.PayLevel ?? "",
        basicPay: employee.BasicPay ?? ""
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTeachingLoad = async (req, res, next) => {
  try {
    const employeeId = req.user?.employeeId;
    const academicPeriodName = req.query.academicPeriodName;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee identity is not available."
      });
    }

    if (
      academicPeriodName !== undefined &&
      (
        typeof academicPeriodName !== "string" ||
        !academicPeriodName.trim() ||
        academicPeriodName.length > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid academicPeriodName is required when provided."
      });
    }

    const pool = await poolPromise;

    const result = await bindAppraisalPeriod(
      pool.request(),
      req.appraisalPeriod
    )
      .input("EmployeeId", sql.NVarChar, String(employeeId))
      .input(
        "AcademicPeriodName",
        sql.NVarChar(100),
        academicPeriodName?.trim() || null
      )
      .query(`
        SELECT
          TL.CourseCode,
          TL.CourseName,
          TL.L,
          TL.T,
          TL.P,
          TL.C,
          TL.CourseType,
          TL.Segment,
          TL.AcademicPeriodName,
          TL.EmployeeID,
          TL.UGPGLevel,
          TL.NoofStudentsRegistered,
          F.TimeTableId,
          F.FeedbackMappingCount
        FROM ACADEMICS.dbo.VW_FacultyTeachingLoad TL
        OUTER APPLY (
          SELECT
            COUNT(*) AS FeedbackMappingCount,
            CASE WHEN COUNT(*) = 1
                 THEN MAX(M.TimeTableId)
            END AS TimeTableId
          FROM (
            SELECT DISTINCT TCD.TimeTableId
            FROM ACADEMICS.dbo.VW_SP_TimeTableCourseDetailsNew TCD
            WHERE TCD.EmployeeId = TL.EmployeeID
              AND TCD.CourseCode = TL.CourseCode
              AND TCD.AcademicPeriodName = TL.AcademicPeriodName
              AND (
                TCD.CourseType = TL.CourseType
                OR (TCD.CourseType IS NULL AND TL.CourseType IS NULL)
              )
              AND (
                TCD.Segment = TL.Segment
                OR (TCD.Segment IS NULL AND TL.Segment IS NULL)
              )
              AND TCD.IsFeedbackReq = 1
          ) M
        ) F
        WHERE TL.EmployeeID = @EmployeeId
        AND UPPER(LTRIM(RTRIM(COALESCE(TL.CourseType, ''))))
      NOT IN ('P', 'PROJECT')
          AND EXISTS (
  SELECT 1
  FROM Academics.dbo.AcademicPeriod AS AP
  WHERE AP.AcademicYearID = @AcademicYearId
    AND AP.AcademicPeriodName = TL.AcademicPeriodName
)
        ORDER BY
          TL.UGPGLevel,
          TL.CourseCode,
          TL.CourseType,
          TL.Segment;
      `);

    const data = result.recordset.map(row => {
      const period = String(row.AcademicPeriodName ?? "").trim();
      const courseType = String(row.CourseType ?? "").trim();
      const ugpgLevel = String(row.UGPGLevel ?? "")
        .trim()
        .toUpperCase();

      const semesterOrder = /^Autumn\b/i.test(period)
        ? 1
        : /^Spring\b/i.test(period)
          ? 2
          : null;

      const folder = `FeedBack_${period}`;
      const filename = `${row.TimeTableId}_${row.EmployeeID}.pdf`;

      return {
        timeTableId: row.TimeTableId,
        academicPeriodName: period,
        semesterOrder,
        ugpgLevel,
        segment: row.Segment,

        courseCode: row.CourseCode,
        courseName: row.CourseName,
        course: `${row.CourseCode} — ${row.CourseName}`,
        courseType:
          courseType === "T" ? "Theory" :
            courseType === "L" ? "Lab" :
              courseType,

        l: row.L,
        t: row.T,
        p: row.P,
        c: row.C,
        ltpc: [row.L, row.T, row.P, row.C]
          .map(value => value ?? "—")
          .join(", "),

        registeredStudents: row.NoofStudentsRegistered,

        feedbackUrl: row.TimeTableId
          ? "https://cims.iitdh.ac.in/FeedBackReports_1/" +
          encodeURIComponent(folder) + "/" +
          encodeURIComponent(filename)
          : null,

        feedbackMappingCount: row.FeedbackMappingCount
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

function createSupervisionHandler(supervisionType) {
  const isPhd = supervisionType === "PHD";

  return async (req, res, next) => {
    try {
      const employeeBasicInfoId = req.user?.employeeBasicInfoId;

      if (!employeeBasicInfoId) {
        return res.status(401).json({
          success: false,
          message: "Faculty employee identity is not available."
        });
      }

      const pool = await poolPromise;

      const result = await bindAppraisalPeriod(
        pool.request(),
        req.appraisalPeriod
      )
        .input(
          "EmployeeBasicInfoId",
          sql.VarChar(36),
          employeeBasicInfoId
        )
        .input("SupervisionType", sql.VarChar(10), supervisionType)
        .query(`
          SELECT
            SAD.StudentDetailsID AS SourceSupervisionID,
            SM.StudentMasterID,
            SM.RollNo,
            SM.DisplayName AS StudentName,
            DGM.DegreeName,
            PM.ProgramName,
            SAD.Batch,
            SAD.AdmissionYear,

            SM.FundingType,

            CASE
              WHEN @SupervisionType <> 'PHD' THEN NULL
              WHEN TRY_CONVERT(
                INT,
                NULLIF(LTRIM(RTRIM(SM.FundingType)), '')
              ) IN (6, 7, 10, 12) THEN 'PT'
              WHEN TRY_CONVERT(
                INT,
                NULLIF(LTRIM(RTRIM(SM.FundingType)), '')
              ) IS NOT NULL THEN 'FT'
              ELSE NULL
            END AS StudyMode,

            SAD.Guide,
            SAD.CoGuide,
            CG.DisplayName AS CoSupervisorName,

            TH.ThesisRecordCount,
            TH.ProjectTitle

          FROM Academics.dbo.StudentAcademicDetails AS SAD

          JOIN Academics.dbo.StudentMaster AS SM
            ON SM.StudentMasterID = SAD.StudentMasterID

          JOIN Academics.dbo.ProgramMaster AS PM
            ON PM.ProgramID = SAD.ProgramId

          JOIN Academics.dbo.DegreeMaster AS DGM
            ON DGM.DegreeID = PM.DegreeID

          LEFT JOIN HR.dbo.EmployeeBasicInfo AS CG
            ON CG.EmployeeBasicInfoId =
               LTRIM(RTRIM(SAD.CoGuide))

          OUTER APPLY (
            SELECT
              COUNT(*) AS ThesisRecordCount,
              CASE
                WHEN COUNT(*) = 1 THEN MAX(TM.ThesisTitle)
                ELSE NULL
              END AS ProjectTitle
            FROM Academics.dbo.ThesisMaster AS TM
            WHERE TM.RollNo = SM.RollNo
          ) AS TH

          WHERE (
            LTRIM(RTRIM(SAD.Guide)) = @EmployeeBasicInfoId
            OR LTRIM(RTRIM(SAD.CoGuide)) = @EmployeeBasicInfoId
          )
          AND (
            (
              @SupervisionType = 'PHD'
              AND DGM.DegreeType = 3
            )
            OR
            (
              @SupervisionType = 'PROJECT'
              AND DGM.DegreeName IN (N'MTech', N'MTech-R')
            )
          )
          AND SM.DOJ < @PeriodEndExclusive
          AND (
            SAD.CourseCompletionDate IS NULL
            OR SAD.CourseCompletionDate >= @PeriodStart
          )

          ORDER BY
            DGM.DegreeName,
            SM.RollNo,
            SAD.StudentDetailsID;
        `);

      const seenStudents = new Set();

      for (const row of result.recordset) {
        const studentKey = String(row.StudentMasterID)
          .trim()
          .toLowerCase();

        if (seenStudents.has(studentKey)) {
          return res.status(409).json({
            success: false,
            message:
              "Multiple academic records were found for a supervised student. " +
              "Please contact ERP support to verify the mapping."
          });
        }

        seenStudents.add(studentKey);
      }

      const normalizeId = value =>
        String(value ?? "").trim().toLowerCase();

      const currentFacultyId = normalizeId(employeeBasicInfoId);

      const data = result.recordset.map(row => ({
        sourceSupervisionId: row.SourceSupervisionID,
        studentMasterId: row.StudentMasterID,
        supervisionType,

        rollNo: row.RollNo ?? "",
        studentName: row.StudentName ?? "",
        level:
          row.DegreeName === "MTech" ? "M.Tech" :
            row.DegreeName === "MTech-R" ? "M.Tech-R" :
              row.DegreeName === "PhD" ? "Ph.D." :
                row.DegreeName ?? "",
        programName: row.ProgramName ?? "",

        batch: String(row.Batch ?? "").trim(),
        admissionYear: row.AdmissionYear ?? "",

        registrationYear: /^\d{4}$/.test(
          String(row.Batch ?? "").trim()
        )
          ? Number(String(row.Batch).trim())
          : null,

        fundingType: row.FundingType ?? null,
        studyMode: row.StudyMode ?? null,

        facultyRole:
          normalizeId(row.Guide) === currentFacultyId
            ? "Guide"
            : "Co-guide",

        projectTitle: row.ProjectTitle ?? "",
        coSupervisor: row.CoSupervisorName ?? "",
        status: "Ongoing",
        remarks: "",

        thesisRecordCount: row.ThesisRecordCount,
        titleNeedsReview: row.ThesisRecordCount > 1,

        coSupervisorNeedsReview: Boolean(
          String(row.CoGuide ?? "").trim() &&
          !String(row.CoSupervisorName ?? "").trim()
        )
      }));

      return res.json({
        success: true,
        data,
        meta: {
          supervisionType,
          scope: "Current guide/co-guide assignments with enrolment overlap",
          period: req.appraisalPeriod,
          periodFiltered: true,
          periodFilterBasis: "Student joining and course completion dates",
          historicalSupervisionVerified: false,
          registrationYearVerified: false,

          studyModeVerified: isPhd,
          studyModeSource: isPhd
            ? "StudentMaster.FundingType: 6,7,10,12 = PT; other numeric codes = FT"
            : null,

          ...(!isPhd && {
            btechSourceAvailable: false
          })
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

exports.getProjectSupervision = createSupervisionHandler("PROJECT");
exports.getPhdSupervision = createSupervisionHandler("PHD");