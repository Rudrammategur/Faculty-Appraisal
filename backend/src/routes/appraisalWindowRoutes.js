const express = require('express');
const { requireFaculty } = require('../middleware/auth');
const { poolPromise } = require('../config/db');
const { readWindow } = require('../services/fwPeriodAccess');
const { yearId } = require('../services/fwPeriodValidation');

const router = express.Router();

router.use(requireFaculty);

router.get('/application-window', async (req, res, next) => {
  try {
    const academicYearId = yearId(req.query.academicYearId);
    const pool = await poolPromise;

    const applicationWindow = await readWindow(
      pool,
      academicYearId
    );

    return res.json({
      success: true,
      data: {
        academicYearId,
        applicationWindow,
        serverNow: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;