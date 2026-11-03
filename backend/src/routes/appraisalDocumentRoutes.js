const express=require('express');
const {createHash}=require('node:crypto');
const {sql,poolPromise}=require('../config/db');
const {requireAuthenticated}=require('../middleware/auth');
const W=require('../repositories/appraisalApprovalRepository');
const D=require('../repositories/appraisalDocumentRepository');
const T=require('../services/appraisalDocumentTargets');
const {decodeDocument,detectType}=require('../services/responsibilityDocument');
const {requireEditableWindow}=require('../services/fwPeriodAccess');
const router=express.Router();router.use(requireAuthenticated);
router.get('/:appraisalId',async(req,res,next)=>{
 try{const pool=await poolPromise;await W.access(pool,req.params.appraisalId,req.user);
  res.set('Cache-Control','no-store');res.json({success:true,data:await D.list(pool,req.params.appraisalId)});
 }catch(e){next(e);}
});
router.all('/:appraisalId/:target/:rowId',async(req,res,next)=>{
 let tx;
 try{
  const id=req.params.appraisalId;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))T.fail('Invalid appraisal ID.');
  const target=T.target(req.params.target,req.params.rowId);
  if(!['GET','PUT','DELETE'].includes(req.method)){res.set('Allow','GET, PUT, DELETE');return res.status(405).json({success:false,message:'Method not allowed.'});}
  const pool=await poolPromise;
  const request=connection=>new sql.Request(connection).input('Id',sql.VarChar(36),id)
   .input('Target',sql.VarChar(50),target.code).input('Row',sql.Int,target.rowId);
  if(req.method==='GET'){
   await W.access(pool,id,req.user);
   const found=(await request(pool).query('SELECT FileName,ContentType,FileContent FROM HR.dbo.FacultyAppraisal_Documents WHERE AppraisalID=@Id AND TargetCode=@Target AND RowID=@Row;')).recordset[0];
   if(!found)T.fail('Document not found.',404);
   res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Content-Type',found.ContentType);
   res.set('Content-Disposition',`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(found.FileName)}`);
   return res.send(found.FileContent);
  }
  if(!req.permissions.canApply)T.fail('Faculty access is required.',403);
  const bytes=req.method==='PUT'?decodeDocument(req.body):null;
  const name=req.method==='PUT'?String(req.body?.fileName || '').trim():'';
  if(req.method==='PUT' && (!name || name.length>200 || /[\x00-\x1f\x7f\\/]/.test(name)))T.fail('Use a filename of 1–200 characters without paths or control characters.');
  tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const master=(await request(tx).input('Employee',sql.VarChar(36),req.user.employeeBasicInfoId)
   .query('SELECT CurrentStatus,AcademicYearID FROM HR.dbo.FacultyAppraisalDetails WITH(UPDLOCK,HOLDLOCK) WHERE AppraisalID=@Id AND Employeebasicinfoid=@Employee;')).recordset[0];
  if(!master)T.fail('Application not found.',404);
  if(!['Draft','Returned to Faculty'].includes(master.CurrentStatus))T.fail('Only drafts or applications returned to you can be changed.',409);
  await requireEditableWindow(tx,master.AcademicYearID,master.CurrentStatus);
  if(target.publication){
   const {table,pk}=target.publication;
   const row=await request(tx).query(`SELECT [${pk}] FROM HR.dbo.[${table}] WHERE AppraisalID=@Id AND [${pk}]=@Row;`);
   if(row.recordset.length!==1)T.fail('Save the publication row before uploading its document.',409);
  }
  const current=(await request(tx).query('SELECT DocumentID FROM HR.dbo.FacultyAppraisal_Documents WHERE AppraisalID=@Id AND TargetCode=@Target AND RowID=@Row;')).recordset[0];
  if(req.method==='DELETE')await request(tx).query('DELETE FROM HR.dbo.FacultyAppraisal_Documents WHERE AppraisalID=@Id AND TargetCode=@Target AND RowID=@Row;');
  else{
   if(current)T.fail('A document is already attached. Delete it before uploading another.',409);
   const type=detectType(bytes);
   await request(tx).input('Name',sql.NVarChar(200),name).input('Type',sql.VarChar(100),type.mime)
    .input('Size',sql.Int,bytes.length).input('Hash',sql.VarChar(64),createHash('sha256').update(bytes).digest('hex'))
    .input('Content',sql.VarBinary(sql.MAX),bytes).input('Actor',sql.NVarChar(256),req.user.username)
    .query('INSERT HR.dbo.FacultyAppraisal_Documents(AppraisalID,TargetCode,RowID,FileName,ContentType,FileSize,ContentHash,FileContent,UpdatedBy) VALUES(@Id,@Target,@Row,@Name,@Type,@Size,@Hash,@Content,@Actor);');
  }
  const data=await D.list(tx,id);await tx.commit();tx=null;res.json({success:true,data});
 }catch(e){if(tx)try{await tx.rollback();}catch{}next(e);}
});
module.exports=router;
