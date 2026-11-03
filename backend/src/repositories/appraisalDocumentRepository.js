const {sql}=require('../config/db');
const columns='DocumentID AS id,TargetCode AS target,RowID AS rowId,FileName AS fileName,ContentType AS contentType,FileSize AS fileSize,ContentHash AS contentHash,UpdatedOn AS updatedOn';
async function list(connection,id){
 return(await new sql.Request(connection).input('Id',sql.VarChar(36),id)
 .query(`SELECT ${columns} FROM HR.dbo.FacultyAppraisal_Documents WHERE AppraisalID=@Id ORDER BY DocumentID;`)).recordset;
}
module.exports={list,columns};
