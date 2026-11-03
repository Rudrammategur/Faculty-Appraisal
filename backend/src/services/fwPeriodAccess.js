const {sql}=require('../config/db');
const {fail}=require('./fwPeriodValidation');
async function readWindow(connection,year){
 const result=await new sql.Request(connection).input('Year',sql.Int,year).query(`
 SELECT IsPublished AS isPublished,
 CONVERT(CHAR(10),DATEADD(MINUTE,330,ApplicationStartAt),23) AS openingDate,
 CONVERT(CHAR(10),DATEADD(DAY,-1,DATEADD(MINUTE,330,ApplicationEndAt)),23) AS closingDate,
 CONVERT(VARCHAR(23),ApplicationStartAt,126)+'Z' AS startsAtUtc,
 CONVERT(VARCHAR(23),ApplicationEndAt,126)+'Z' AS endsAtUtc,
 CASE WHEN IsPublished=1 AND SYSUTCDATETIME()>=ApplicationStartAt AND SYSUTCDATETIME()<ApplicationEndAt THEN 1 ELSE 0 END AS isOpen
 FROM HR.dbo.FacultyAppraisal_CycleSettings WHERE AcademicYearID=@Year;`);
 if(result.recordset.length>1)fail('Duplicate appraisal windows exist.',409);
 const row=result.recordset[0];return row?{...row,isPublished:Boolean(row.isPublished),isOpen:Boolean(row.isOpen)}:null;
}
async function requireOpenWindow(connection,year){
 const window=await readWindow(connection,year);
 if(!window?.isOpen)fail('The application window is closed or not yet published. You can view and print saved applications.',409);
 return window;
}
async function requireEditableWindow(connection,year,status){
 // Callers supply status from their locked, owner-checked database record.
 // An explicit faculty return grants correction access, even after the original deadline.
 if(status==='Returned to Faculty')return {correction:true};
 return requireOpenWindow(connection,year);
}
module.exports={readWindow,requireOpenWindow,requireEditableWindow};
