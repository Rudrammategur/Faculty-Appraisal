const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../src/services/appraisalDraftValidation');
test('one draft payload includes publication, Others and responsibility writes', () => {
  const result = normalize({
    otherWork: 'Work', selfAppraisal: 'Self', futureWork: 'Future', otherDepartmentWork: 'Other department',
    rows: { journals: [{ title: 'Paper', year: '2026' }], departmentLevels: [{ responsibility: 'Committee', activities: 'Review' }], instituteLevels: [] },
  });
  assert.equal(result.groups.journals[0].title, 'Paper');
  assert.equal(result.extras.others.selfAppraisal, 'Self');
  assert.equal(result.extras.responsibilities.departmentLevels[0].responsibility, 'Committee');
  assert.deepEqual(result.extras.responsibilities.instituteLevels, []);
});
test('extra-section-only requests work without fabricating publication deletion', () => {
  const result = normalize({ futureWork: 'Plan', rows: { instituteLevels: [] } });
  assert.deepEqual(result.groups, {});
  assert.equal(result.extras.others.futureWork, 'Plan');
});
test('omitted fields stay omitted and explicit empty text clears', () => {
  const result = normalize({ selfAppraisal: '' });
  assert.deepEqual(result.extras.others, { selfAppraisal: '' });
  assert.equal(result.extras.responsibilities, undefined);
});
test('invalid responsibility dates reject a mixed payload', () => {
  assert.throws(() => normalize({ rows: { journals: [{ title: 'Valid' }], departmentLevels: [{ fromDate: '2026-02-30' }] } }), /valid date/);
});
test('all Others fields enforce 1000 characters', () => {
  for (const key of ['otherWork','selfAppraisal','futureWork','otherDepartmentWork']) {
    assert.throws(() => normalize({ [key]: 'x'.repeat(1001) }), /1000/);
  }
});
test('publication errors remain explicit and do not become successful empty saves', () => {
  assert.throws(() => normalize({ otherWork: 'Valid', rows: { conferences: [{ title: 'Paper', year: '26' }] } }), /year/);
});
test('selected responsibility files reject text-only saves', () => {
  assert.throws(() => normalize({ rows: { instituteLevels: [{ responsibility: 'Test', supportingDocument: {} }] } }), /uploads/);
});
