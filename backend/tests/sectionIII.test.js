const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../src/services/appraisalDraftValidation');
const { mapProjects } = require('../src/services/facultyResearchProjects');
const period = { reportingFrom: '2025-08-01', reportingEndExclusive: '2026-08-01' };
const project = overrides => ({ InstanceId: 'P1', ProjectCode: 'CS001', CategoryName: 'Sponsored', ProjectName: 'Test', FundingAgency: 'Agency', ProjectBudget: 100, PrincipalInvestigator: 'PI', FromDate: '2024-01-01', ToDate: '2026-07-31', TotalDuration: '2 Year', ProjectStatus: 'Ongoing', ...overrides });

test('normalizes all six new narrative keys without manufacturing omitted groups', () => {
  const keys = ['sponsoredProjectRemarks', 'consultancyProjectRemarks', 'expectedResearch', 'expectedOutreach', 'expectedProfessional', 'otherExtensionTasks'];
  const form = Object.fromEntries(keys.map(key => [key, `${key} test`]));
  const result = normalize(form);
  assert.equal(Object.keys(result.extras.others).length, 6);
  assert.deepEqual(result.rdGroups, {});
  assert.deepEqual(result.groups, {});
});
test('round-trip input shape supports exact products/patents and lecture field keys', () => {
  const result = normalize({ rows: {
    technologyTransfer: [{ particulars: 'Patent', publicationGrantDate: '2026-02-28', issuedBy: 'Office', monthYear: '2026-02' }],
    specialLectures: [{ title: 'Lecture', date: '2025-08-01', place: 'Dharwad', programme: 'Workshop', information: 'Details' }],
  } });
  assert.equal(result.rdGroups.technologyTransfer[0].particulars, 'Patent');
  assert.equal(result.rdGroups.specialLectures[0].programme, 'Workshop');
});
test('explicit empty arrays clear only supplied RD group; placeholders skipped', () => {
  assert.deepEqual(normalize({ rows: { technologyTransfer: [] } }).rdGroups, { technologyTransfer: [] });
  assert.deepEqual(normalize({ rows: { specialLectures: [{}] } }).rdGroups, { specialLectures: [] });
});
test('rejects impossible dates, malformed month and database-length overflow', () => {
  for (const row of [{ publicationGrantDate: '2025-02-29' }, { monthYear: '2026-13' }, { issuedBy: 'x'.repeat(201) }]) {
    assert.throws(() => normalize({ rows: { technologyTransfer: [row] } }), error => error.statusCode === 400);
  }
  assert.throws(() => normalize({ expectedResearch: 'x'.repeat(1001) }), /1000/);
});
test('drafts may save partially completed lecture rows', () => {
  const result = normalize({ rows: { specialLectures: [{ place: 'Dharwad' }] } });
  assert.equal(result.rdGroups.specialLectures[0].title, null);
});
test('invalid existing publication still rejects the combined payload', () => {
  assert.throws(() => normalize({ expectedResearch: 'valid', rows: { journals: [{ title: 'Paper', year: '99' }] } }), /year/);
});
test('empty source projects returns empty lists successfully', () => {
  assert.deepEqual(mapProjects([], period).data, { sponsored: [], consultancy: [] });
});
test('ongoing older projects included; projects after and before period excluded', () => {
  const result = mapProjects([
    project(),
    project({ InstanceId: 'P2', FromDate: '2026-08-01', ToDate: '2027-01-01' }),
    project({ InstanceId: 'P3', ToDate: '2025-07-31' }),
  ], period);
  assert.equal(result.data.sponsored.length, 1);
});
test('extension duplicates become one project and latest extension preserves overlap', () => {
  const result = mapProjects([
    project({ ToDate: '2025-06-30', ExtensionEndDate: '2025-07-31' }),
    project({ ToDate: '2025-06-30', ExtensionEndDate: '2026-01-01' }),
  ], period);
  assert.equal(result.data.sponsored.length, 1);
  assert.equal(result.data.sponsored[0].effectiveEndDate, '2026-01-01');
});
test('closure overrides scheduled extension; conflicting closures rejected', () => {
  assert.equal(mapProjects([project({ ClosureDate: '2025-07-31', ExtensionEndDate: '2027-01-01' })], period).data.sponsored.length, 0);
  assert.throws(() => mapProjects([project({ ClosureDate: '2026-01-01' }), project({ ClosureDate: '2026-01-02' })], period), /closure dates/);
});
test('classifies by category, excludes CSR and refuses conflicting base records', () => {
  const result = mapProjects([project({ CategoryName: 'Consultancy', ProjectType: 'Domestic' }), project({ InstanceId: 'P2', CategoryName: 'CSR' })], period);
  assert.equal(result.data.consultancy.length, 1);
  assert.equal(result.meta.excludedCSRCount, 1);
  assert.throws(() => mapProjects([project(), project({ ProjectBudget: 200 })], period), /Conflicting/);
});
test('missing start dates are flagged and missing ends treated as open-ended', () => {
  const result = mapProjects([project({ FromDate: null }), project({ InstanceId: 'P2', ToDate: null })], period);
  assert.equal(result.data.sponsored.length, 1);
  assert.equal(result.meta.warnings.length, 2);
});
