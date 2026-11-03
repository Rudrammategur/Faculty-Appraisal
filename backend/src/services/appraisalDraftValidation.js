const { normalizeRD } = require('./appraisalRDValidation');
const extraValidation = require('./appraisalExtraValidation');
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
const text = (column, max, extra = {}) => ({ column, max, ...extra });
const year = { column: 'Year', year: true };
const supervision = {
  sourceSupervisionId: text('SourceSupervisionID', 36, { guid: true, required: true }),
  studentMasterId: text('StudentMasterID', 36, { guid: true, required: true }),
  title: text('ProjectTitle', 500),
  status: text('Status', 20, { values: ['Ongoing', 'Completed'], required: true }),
  remarks: text('Remarks', 1000),
};
const groups = {
  projects: { table: 'FacultyAppraisal_ProjectSupervision', pk: 'ProjectSupervisionID', type: 'PROJECT', fields: { ...supervision, cosupervisor: text('CoSupervisor', 500) } },
  phd: { table: 'FacultyAppraisal_ProjectSupervision', pk: 'ProjectSupervisionID', type: 'PHD', fields: { ...supervision, co: text('CoSupervisor', 500) } },
  journals: { table: 'FacultyAppraisal_JournalPapers', pk: 'JournalPaperID', fields: { authors: text('AuthorsNames', 1000), title: text('PaperTitle', 1000), venue: text('JournalName', 500), volume: text('VolNo', 50), year, pages: text('PageNos', 100) } },
  conferences: { table: 'FacultyAppraisal_ConferenceResearchPapers', pk: 'ConferencePaperID', fields: { authors: text('AuthorsNames', 1000), title: text('PaperTitle', 1000), venue: text('ConferenceName', 500), place: text('Place', 200), year, pages: text('PageNos', 100) } },
  books: { table: 'FacultyAppraisal_Books', pk: 'BookID', fields: { title: text('ArticleTitle', 500), publisher: text('PublisherName', 300), year, authors: text('Authors', 1000), remarks: text('Remarks', 50, { values: ['Authored', 'Edited'] }) } },
  reports: { table: 'FacultyAppraisal_TechnicalReports', pk: 'TechnicalReportID', fields: { title: text('ReportTitle', 500), particulars: text('Particulars', 1000), authors: text('Authors', 1000), remarks: text('Remarks', 20, { values: ['External', 'Internal'] }) } },
  awards: { table: 'FacultyAppraisal_AwardsRecognitions', pk: 'AwardRecognitionID', fields: { name: text('Name', 500), issuer: text('IssuedBy', 300), place: text('Place', 200), month: text('MonthYear', 30, { month: true }) } },
};
const narratives = {
  courseParticulars: text('Particulars', 1000),
  teachingInnovations: text('Innovations', 1000),
  otherInstructional: text('OtherInstructionalTasks', 1000),
};
function value(input, rule, label) {
  if (input === undefined || input === null || input === '') {
    if (rule.required) fail(`${label} is required.`);
    return null;
  }
  if (rule.year) {
    if (!/^\d{4}$/.test(String(input)) || Number(input) < 1900 || Number(input) > 2100) fail(`${label} must be a year between 1900 and 2100.`);
    return Number(input);
  }
  if (typeof input !== 'string') fail(`${label} must be text.`);
  const result = input.trim();
  if (!result) {
    if (rule.required) fail(`${label} is required.`);
    return null;
  }
  if (result.length > rule.max) fail(`${label} exceeds ${rule.max} characters.`);
  if (rule.guid && !GUID.test(result)) fail(`${label} must be a complete GUID.`);
  if (rule.values && !rule.values.includes(result)) fail(`${label} has an invalid selection.`);
  if (rule.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(result)) fail(`${label} must use YYYY-MM.`);
  return result;
}
function normalize(form) {
  if (!form || typeof form !== 'object' || Array.isArray(form)) fail('A formData object is required.');
  if (form.rows !== undefined && (!form.rows || typeof form.rows !== 'object' || Array.isArray(form.rows))) fail('formData.rows must be an object.');
  const result = { narratives: {}, groups: {}, extras: {}, rdGroups: normalizeRD(form.rows) };
  const others = {};
  for (const key of Object.keys(extraValidation.fieldColumns)) {
    if (Object.hasOwn(form, key)) others[key] = form[key];
  }
  if (Object.keys(others).length) result.extras.others = extraValidation.others(others);
  const responsibilities = {};
  for (const key of Object.keys(extraValidation.levels)) {
    if (Object.hasOwn(form.rows || {}, key)) responsibilities[key] = form.rows[key];
  }
  if (Object.keys(responsibilities).length) result.extras.responsibilities = extraValidation.responsibilities(responsibilities);
  for (const [key, rule] of Object.entries(narratives)) {
    if (Object.hasOwn(form, key)) result.narratives[key] = value(form[key], rule, key);
  }
  for (const [key, config] of Object.entries(groups)) {
    if (!Object.hasOwn(form.rows || {}, key)) continue;
    const rows = form.rows[key];
    if (!Array.isArray(rows) || rows.length > 500) fail(`${key} must be an array with at most 500 rows.`);
    const seen = new Set();
    result.groups[key] = [];
    for (const [index, row] of rows.entries()) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`${key} row ${index + 1} is invalid.`);
      if (key === 'awards' && (row.evidence != null || row.supportingDocument != null || (row.supportingDoc != null && typeof row.supportingDoc !== 'string'))) {
        fail('Upload award documents using the document endpoint after saving the publication row. Do not send files in the text draft.');
      }
      // Ignore untouched publication placeholders, but retain fetched supervision rows.
      const meaningful = Boolean(!config.type && (row.id || row.documentPending === true)) || Object.keys(config.fields).some(field => row[field] !== null && row[field] !== undefined && String(row[field]).trim() !== '');
      if (!meaningful) continue;
      const clean = {};
      if (!config.type) {
        if (row.id != null && (!Number.isSafeInteger(row.id) || row.id<1 || row.id>2147483647)) fail('Invalid publication row ID.');
        clean.id = row.id ?? null;
        if (clean.id && seen.has(clean.id)) fail('Duplicate publication row ID.');
        if (clean.id) seen.add(clean.id);
        if (row.clientRowKey != null && (typeof row.clientRowKey!=='string' || !GUID.test(row.clientRowKey))) fail('Invalid publication client row key.');
        clean.clientRowKey = row.clientRowKey ?? null;
        if (clean.clientRowKey && seen.has(clean.clientRowKey)) fail('Duplicate publication client row key.');
        if (clean.clientRowKey) seen.add(clean.clientRowKey);
      }
      for (const [field, rule] of Object.entries(config.fields)) clean[field] = value(row[field], rule, `${key}[${index + 1}].${field}`);
      if (config.type) {
        const identity = `${clean.sourceSupervisionId}:${clean.studentMasterId}`.toLowerCase();
        if (seen.has(identity)) fail(`Duplicate supervision record in ${key}.`);
        seen.add(identity);
      }
      result.groups[key].push(clean);
    }
  }
  const hasProjects = Object.hasOwn(result.groups, 'projects');
  const hasPhd = Object.hasOwn(result.groups, 'phd');
  if (hasProjects !== hasPhd) fail('Supply both projects and phd arrays together; they share one storage table.');
  if (hasProjects) {
    const studentIds = [...result.groups.projects, ...result.groups.phd].map(row => row.studentMasterId.toLowerCase());
    if (new Set(studentIds).size !== studentIds.length) fail('Only one supervision record per student per appraisal is supported by the existing columns.');
  }
  if (!Object.keys(result.narratives).length && !Object.keys(result.groups).length && !Object.keys(result.extras).length && !Object.keys(result.rdGroups).length) fail('No supported draft fields were supplied.');
  return result;
}
module.exports = { GUID, groups, narratives, normalize, fail };
