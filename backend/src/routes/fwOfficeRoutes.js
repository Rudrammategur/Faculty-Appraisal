const express=require('express');
const {requireAuthenticated}=require('../middleware/auth');
const {resolveAccess,requireAccess}=require('../middleware/fwOffice');
const V=require('../services/fwPeriodValidation');
const repository=require('../repositories/fwPeriodRepository');
const router=express.Router();router.use(requireAuthenticated,resolveAccess);
router.get('/access',(req,res)=>res.json({success:true,data:{hasFwOfficeAccess:req.fwOfficeAccess,canReview:req.permissions.canReview,canApply:req.permissions.canApply,canManageAppraisalPeriods:req.permissions.canManageAppraisalPeriods,username:req.user.username,name:req.user.name}}));
router.use(requireAccess);
function handle(work){return async(req,res,next)=>{try{res.json({success:true,data:await work(req)})}catch(error){next(error)}};}
router.get('/cycles',handle(()=>repository.listCycles()));
router.get('/academic-years',handle(()=>repository.listYears()));
router.get('/cycles/:year',handle(req=>repository.get(V.yearId(req.params.year))));
router.put('/cycles/:year',handle(req=>repository.save(req.user,V.yearId(req.params.year),V.normalize(req.body))));
module.exports=router;
