const express = require("express");
const router = express.Router();

const facultyController = require("../controllers/facultyController");
const { requireFaculty } = require("../middleware/auth");
const {
  loadAppraisalPeriod
} = require("../middleware/appraisalPeriod");

const {
  getApprovers
} = require("../controllers/appraisalWorkflowController");

router.use(requireFaculty);

router.get("/profile", facultyController.getFacultyProfile);
router.get("/approvers", getApprovers);

router.get("/period", loadAppraisalPeriod, (req, res) => {
  res.json({
    success: true,
    data: req.appraisalPeriod
  });
});

router.get(
  "/teaching",
  loadAppraisalPeriod,
  facultyController.getTeachingLoad
);

router.get(
  "/project-supervision",
  loadAppraisalPeriod,
  facultyController.getProjectSupervision
);

router.get(
  "/phd-supervision",
  loadAppraisalPeriod,
  facultyController.getPhdSupervision
);

router.get(
  '/research-projects',
  loadAppraisalPeriod,
  require('../controllers/facultyResearchProjectsController').getResearchProjects
);

module.exports = router;