const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fieldColumns = {
  sponsoredProjectRemarks: 'SponsoredProjectRemarks',
  consultancyProjectRemarks: 'ConsultancyProjectRemarks',
  expectedResearch: 'ExpectedResearchActivity',
  expectedOutreach: 'ExpectedOutReachActivity',
  expectedProfessional: 'ExpectedProfessionalActivity',
  otherExtensionTasks: 'OtherExtensionTasks',
  otherWork: 'MiscellaneousWork',
  selfAppraisal: 'SelfAppraisal',
  futureWork: 'FutureWork',
  otherDepartmentWork: 'AnotherDepartmentWork',
};
const levels = { departmentLevels: 'Department', instituteLevels: 'Institute' };
function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
function text(value, max, name) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') fail(`${name} must be text.`);
  if (value.length > max) fail(`${name} exceeds ${max} characters.`);
  return value;
}
function date(value, name) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${name} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value < '0001-01-01') fail(`${name} is not a valid date.`);
  return value;
}
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('A JSON object is required.');
}
function others(body) {
  object(body);
  const result = {};
  for (const key of Object.keys(fieldColumns)) {
    if (Object.hasOwn(body, key)) {
      const max = ['sponsoredProjectRemarks', 'consultancyProjectRemarks'].includes(key) ? 500 : 1000;
      result[key] = text(body[key], max, key);
    }
  }
  if (!Object.keys(result).length) fail('Supply at least one Others field.');
  return result;
}
function responsibilities(body) {
  object(body);
  const result = {};
  const seen = new Set();
  for (const key of Object.keys(levels)) {
    if (!Object.hasOwn(body, key)) continue;
    if (!Array.isArray(body[key]) || body[key].length > 200) fail(`${key} must contain at most 200 rows.`);
    result[key] = [];
    for (const [index, row] of body[key].entries()) {
      object(row);
      const label = `${key} row ${index + 1}`;
      if (row.supportingDocument != null || row.supportingDoc != null || row.evidence != null) fail(`${label}: document uploads are pending; send text fields only.`);
      const id = row.id ?? row.responsibilityId ?? null;
      if (id !== null && (!Number.isInteger(id) || id < 1 || id > 2147483647)) fail(`${label}: invalid responsibility ID.`);
      if (id !== null && seen.has(id)) fail('Duplicate responsibility ID in the request.');
      if (id !== null) seen.add(id);
      const clean = {
        id,
        responsibility: text(row.responsibility, 500, `${label} responsibility`),
        activities: text(row.activities, 1000, `${label} activities`),
        fromDate: date(row.fromDate, `${label} From date`),
        toDate: date(row.toDate, `${label} To date`),
      };
      if (clean.fromDate && clean.toDate && clean.toDate < clean.fromDate) fail(`${label}: To date cannot precede From date.`);
      if (id === null && !clean.responsibility.trim() && !clean.activities.trim() && !clean.fromDate && !clean.toDate) continue;
      result[key].push(clean);
    }
  }
  if (!Object.keys(result).length) fail('Supply departmentLevels or instituteLevels.');
  return result;
}
module.exports = { GUID, fieldColumns, levels, others, responsibilities, fail };
