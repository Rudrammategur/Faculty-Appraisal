const {createHash}=require('node:crypto');
const {sql,poolPromise}=require('../config/db');
const {fail,windowState}=require('../services/fwPeriodValidation');
const request=(connection,year)=>new sql.Request(connection).input('Year',sql.Int,year);
async function academicYear(connection,id){
 const result=await request(connection,id).query(`SELECT AcademicYearID AS academicYearId,AcademicYear AS academicYear,
 StartYear,EndYear,CONVERT(CHAR(10),DATEFROMPARTS(StartYear,8,1),23) AS reportingFrom,
 CONVERT(CHAR(10),DATEFROMPARTS(EndYear,7,31),23) AS reportingTo
 FROM Academics.dbo.AcademicYearDetails WHERE AcademicYearID=@Year;`);
 if(result.recordset.length!==1)fail('Academic year not found.',404);
 const year=result.recordset[0];if(year.EndYear!==year.StartYear+1)fail('Academic year configuration is invalid.',409);
 return year;
}
const columns=`CycleID AS cycleId,AcademicYearID AS academicYearId,
 CONVERT(CHAR(10),DATEADD(MINUTE,330,ApplicationStartAt),23) AS openingDate,
 CONVERT(CHAR(10),DATEADD(DAY,-1,DATEADD(MINUTE,330,ApplicationEndAt)),23) AS closingDate,
 CONVERT(VARCHAR(23),ApplicationStartAt,126)+'Z' AS startsAtUtc,
 CONVERT(VARCHAR(23),ApplicationEndAt,126)+'Z' AS endsAtUtc,
 IsPublished AS isPublished,LastChangeReason AS lastChangeReason,UpdatedBy AS updatedBy,
 CONVERT(VARCHAR(23),UpdatedOn,126)+'Z' AS updatedOn,
 CycleID AS settingsIdentity`;
async function read(connection,id,lock=false){
 const result=await request(connection,id).query(`SELECT ${columns} FROM HR.dbo.FacultyAppraisal_CycleSettings ${lock?'WITH(UPDLOCK,HOLDLOCK)':''} WHERE AcademicYearID=@Year;`);
 if(result.recordset.length>1)fail('Duplicate settings exist for this academic year.',409);
 const row=result.recordset[0];
 if(!row)return null;
 // Opaque token derived in Node, avoiding SQL rowversion string encoding.
 const version=createHash('sha256').update(JSON.stringify([
 row.cycleId,row.academicYearId,row.startsAtUtc,row.endsAtUtc,
 Boolean(row.isPublished),row.updatedOn,row.updatedBy,row.lastChangeReason
 ])).digest('hex');
 return {...row,version,isPublished:Boolean(row.isPublished),state:windowState(row)};
}
async function listYears(){
 const pool=await poolPromise;
 return(await pool.request().query(`SELECT AcademicYearID AS academicYearId,AcademicYear AS academicYear,StartYear AS startYear,EndYear AS endYear,CONVERT(CHAR(10),DATEFROMPARTS(StartYear,8,1),23) AS reportingFrom,CONVERT(CHAR(10),DATEFROMPARTS(EndYear,7,31),23) AS reportingTo
 FROM Academics.dbo.AcademicYearDetails WHERE StartYear>=1900 AND EndYear=StartYear+1 AND EndYear<=9998 ORDER BY StartYear DESC,AcademicYearID DESC;`)).recordset;
}
async function listCycles(){
 const pool=await poolPromise;
 const ids=await pool.request().query('SELECT AcademicYearID FROM HR.dbo.FacultyAppraisal_CycleSettings ORDER BY AcademicYearID DESC;');
 const records=[];
 for(const row of ids.recordset){
  const academic=await academicYear(pool,row.AcademicYearID);
  const settings=await read(pool,row.AcademicYearID);
  if(settings)records.push({...settings,academicYear:academic.academicYear,reportingFrom:academic.reportingFrom,reportingTo:academic.reportingTo});
 }
 return records;
}
async function get(id){const pool=await poolPromise;return{academicYear:await academicYear(pool,id),settings:await read(pool,id),serverNow:new Date().toISOString()};}
async function save(user,id,input){
 const tx=new sql.Transaction(await poolPromise);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try{
  const lock=await new sql.Request(tx).query(`DECLARE @Result INT;
    EXEC @Result=HR.sys.sp_getapplock @Resource='FacultyAppraisalCycleSettings',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
    SELECT @Result AS LockResult;`);
  if(lock.recordset[0].LockResult<0)fail('Settings are being updated by another office user. Please retry.',409);
  const year=await academicYear(tx,id);
  const existing=await read(tx,id,true);
  if(existing){
   if(!input.version || input.version.toLowerCase()!==existing.version.toLowerCase())fail('Another office user changed these settings. Reload before saving.',409);
   if(!input.reason)fail('Enter a reason for changing existing settings.');
  }else if(input.version)fail('Settings no longer match the selected year. Reload.',409);
  // A published cycle stays published when dates are updated; there is no silent unpublish action.
  const published=Boolean(existing?.isPublished || input.publish);
  if(published){
   const overlap=await request(tx,id).input('Start',sql.DateTime2(3),input.start).input('End',sql.DateTime2(3),input.end)
    .query(`SELECT CycleID FROM HR.dbo.FacultyAppraisal_CycleSettings WITH(UPDLOCK,HOLDLOCK)
     WHERE AcademicYearID<>@Year AND IsPublished=1 AND ApplicationStartAt<@End AND ApplicationEndAt>@Start;`);
   if(overlap.recordset.length)fail('These dates overlap another published appraisal cycle. Use a non-overlapping application window.',409);
  }
  const r=request(tx,id).input('Start',sql.DateTime2(3),input.start).input('End',sql.DateTime2(3),input.end)
   .input('Published',sql.Bit,published).input('Actor',sql.NVarChar(100),user.username).input('Reason',sql.NVarChar(500),input.reason || null);
  if(existing)await r.query(`UPDATE HR.dbo.FacultyAppraisal_CycleSettings SET ApplicationStartAt=@Start,ApplicationEndAt=@End,
   IsPublished=@Published,UpdatedBy=@Actor,UpdatedOn=SYSUTCDATETIME(),LastChangeReason=@Reason WHERE AcademicYearID=@Year;`);
  else await r.query(`INSERT HR.dbo.FacultyAppraisal_CycleSettings(AcademicYearID,ApplicationStartAt,ApplicationEndAt,IsPublished,CreatedBy,UpdatedBy,LastChangeReason)
   VALUES(@Year,@Start,@End,@Published,@Actor,@Actor,@Reason);`);
  const saved=await read(tx,id);
  await tx.commit();return{academicYear:year,settings:saved,serverNow:new Date().toISOString()};
 }catch(error){try{await tx.rollback();}catch{}throw error;}
}
module.exports={listYears,listCycles,get,save};
