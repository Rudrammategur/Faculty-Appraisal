const repository = require('../repositories/appraisalDraftRepository');
const { normalize, fail } = require('../services/appraisalDraftValidation');

exports.getCurrent = async (req, res, next) => {
  try {
    const data = await repository.getCurrent(
      req.user,
      req.appraisalPeriod
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.saveDraft = async (req, res, next) => {
  // Temporary diagnostics: field names and counts only.
  console.log('[SAVE DRAFT] Controller reached', {
    method: req.method,
    url: req.originalUrl,
    formKeys: Object.keys(req.body?.formData || {}),
    rowKeys: Object.keys(req.body?.formData?.rows || {}),
  });

  try {
    const form = req.body?.formData;

    if (
      form?.academicYearId !== undefined &&
      form.academicYearId !== req.appraisalPeriod.academicYearId
    ) {
      fail('The form academic year does not match the request.');
    }

    const data = normalize(form);

    console.log('[SAVE DRAFT] Validation completed', {
      receivedTextLengths: {
        otherWork: form.otherWork?.length ?? 0,
        selfAppraisal: form.selfAppraisal?.length ?? 0,
        futureWork: form.futureWork?.length ?? 0,
        otherDepartmentWork: form.otherDepartmentWork?.length ?? 0,
      },
      normalizedOtherFields: Object.keys(data.extras?.others || {}),
      rdRowCounts: Object.fromEntries(Object.entries(data.rdGroups || {}).map(([key, rows]) => [key, rows.length])),
      responsibilityCounts: Object.fromEntries(
        Object.entries(data.extras?.responsibilities || {})
          .map(([key, rows]) => [key, rows.length])
      ),
    });

    const record = await repository.saveDraft(
      req.user,
      req.appraisalPeriod,
      data
    );

    console.log('[SAVE DRAFT] Transaction committed', {
      appraisalId: record.appraisalId,
      savedRowCounts: record.savedRowCounts,
      savedTextLengths: {
        otherWork: record.formData?.otherWork?.length ?? 0,
        selfAppraisal: record.formData?.selfAppraisal?.length ?? 0,
        futureWork: record.formData?.futureWork?.length ?? 0,
        otherDepartmentWork:
          record.formData?.otherDepartmentWork?.length ?? 0,
      },
    });

    return res.json({
      success: true,
      message:
        'Draft text saved for sections I–VII. Fetched project data is read-only. Documents use separate upload APIs.',
      data: record,
    });
  } catch (error) {
    console.error('[SAVE DRAFT] Failed:', error.message);
    return next(error);
  }
};