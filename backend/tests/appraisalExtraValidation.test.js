const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../src/services/appraisalExtraValidation');
test('Others uses supplied fields only and preserves intentional clearing', () => {
  assert.deepEqual(V.others({ otherWork: '', selfAppraisal: 'Draft', employeeId: 'ignored' }), { otherWork: '', selfAppraisal: 'Draft' });
});
test('all narratives have the 1000-character form limit', () => {
  for (const key of Object.keys(V.fieldColumns)) {
    assert.equal(V.others({ [key]: 'x'.repeat(1000) })[key].length, 1000);
    assert.throws(() => V.others({ [key]: 'x'.repeat(1001) }), /exceeds/);
  }
});
test('empty placeholders skipped, partial drafts retained, explicit [] clears', () => {
  const result = V.responsibilities({ departmentLevels: [{}, { activities: 'Draft activity' }] });
  assert.equal(result.departmentLevels.length, 1);
  assert.equal(result.departmentLevels[0].responsibility, '');
  assert.deepEqual(V.responsibilities({ instituteLevels: [] }), { instituteLevels: [] });
});
test('saved row IDs are kept and duplicate IDs across levels are rejected', () => {
  assert.equal(V.responsibilities({ departmentLevels: [{ id: 3 }] }).departmentLevels[0].id, 3);
  assert.throws(() => V.responsibilities({ departmentLevels: [{ id: 3 }], instituteLevels: [{ id: 3 }] }), /Duplicate/);
  assert.throws(() => V.responsibilities({ departmentLevels: [{ id: '3' }] }), /invalid/);
});
test('real calendar dates and interval ordering checked', () => {
  assert.equal(V.responsibilities({ departmentLevels: [{ fromDate: '2024-02-29' }] }).departmentLevels[0].fromDate, '2024-02-29');
  for (const fromDate of ['2025-02-29', '2026-04-31', '2026-13-01', '01/08/2025']) {
    assert.throws(() => V.responsibilities({ departmentLevels: [{ fromDate }] }), /date|YYYY/);
  }
  assert.throws(() => V.responsibilities({ instituteLevels: [{ fromDate: '2026-10-01', toDate: '2026-09-01' }] }), /precede/);
});
test('pending document uploads cannot be silently serialized', () => {
  assert.throws(() => V.responsibilities({ departmentLevels: [{ supportingDocument: {} }] }), /uploads/);
});
test('limits and wrong JSON shapes rejected', () => {
  assert.throws(() => V.responsibilities({ departmentLevels: [{ responsibility: 'x'.repeat(501) }] }), /exceeds/);
  assert.throws(() => V.responsibilities({ instituteLevels: [{ activities: 'x'.repeat(1001) }] }), /exceeds/);
  assert.throws(() => V.others([]), /object/);
  assert.throws(() => V.responsibilities({ instituteLevels: {} }), /200/);
});
