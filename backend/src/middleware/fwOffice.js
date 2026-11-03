function resolveAccess(req, res, next) {
  req.fwOfficeAccess = Boolean(req.permissions?.canManageAppraisalPeriods);
  return next();
}
function requireAccess(req, res, next) {
  if (!req.fwOfficeAccess) {
    return res.status(403).json({
      success: false,
      message: 'Faculty Welfare Office access is required.',
    });
  }
  return next();
}
module.exports = { resolveAccess, requireAccess };
