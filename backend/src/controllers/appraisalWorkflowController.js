const {
  resolveAppraisalApprovers,
} = require('../services/appraisalWorkflowService');

exports.getApprovers = async (req, res, next) => {
  try {
    const approvers = await resolveAppraisalApprovers(req.user);

    return res.json({
      success: true,
      data: {
        applicant: {
          employeeBasicInfoId: req.user.employeeBasicInfoId,
          employeeId: req.user.employeeId,
          name: req.user.name,
          departmentId: req.user.departmentId,
          departmentName: req.user.departmentName,
        },
        approvers,
      },
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};