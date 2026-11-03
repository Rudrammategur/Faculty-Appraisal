const { fail } = require('./appraisalExtraValidation');
const definitions = {
  technologyTransfer: {
    table: 'FacultyAppraisal_ProductsandPatents',
    fields: {
      particulars: { column: 'Particulars', max: 10000 },
      publicationGrantDate: { column: 'DateofPublication', date: true },
      issuedBy: { column: 'IssuedBy', max: 200 },
      monthYear: { column: 'Month-Year', max: 20, month: true },
    },
  },
  specialLectures: {
    table: 'ContinuingEducationLectures',
    fields: {
      title: { column: 'TitleofLecture', max: 500 },
      date: { column: 'Date', date: true },
      place: { column: 'Place', max: 200 },
      programme: { column: 'Event', max: 300 },
      information: { column: 'OtherInformation', max: 10000 },
    },
  },
};
function normalizeRD(rows = {}) {
  const result = {};
  for (const [key, definition] of Object.entries(definitions)) {
    if (!Object.hasOwn(rows, key)) continue;
    if (!Array.isArray(rows[key]) || rows[key].length > 200) fail(`${key} must contain at most 200 rows.`);
    result[key] = [];
    const seen = new Set();
    for (const [index, row] of rows[key].entries()) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`${key} row ${index + 1} is invalid.`);
      const clean = {};
      for (const [field, rule] of Object.entries(definition.fields)) {
        const value = row[field];
        const label = `${key}[${index + 1}].${field}`;
        if (value === undefined || value === null || value === '') { clean[field] = null; continue; }
        if (typeof value !== 'string') fail(`${label} must be text.`);
        if (rule.date) {
          const parsed = new Date(`${value}T00:00:00Z`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01' || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`${label} must be a valid YYYY-MM-DD date.`);
        } else {
          if (value.length > rule.max) fail(`${label} exceeds ${rule.max} characters.`);
          if (rule.month && !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) fail(`${label} must use YYYY-MM.`);
        }
        clean[field] = value;
      }
      if (Object.values(clean).some(value => value !== null && value.trim() !== '') || row.id || row.documentPending === true) {
        if(row.id != null && (!Number.isSafeInteger(row.id) || row.id<1 || row.id>2147483647)) fail('Invalid R&D row ID.');
        if(row.id && seen.has(row.id)) fail('Duplicate R&D row ID.');
        if(row.id)seen.add(row.id);
        if(row.clientRowKey != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.clientRowKey))fail('Invalid R&D client row key.');
        if(row.clientRowKey && seen.has(row.clientRowKey))fail('Duplicate R&D client row key.');
        if(row.clientRowKey)seen.add(row.clientRowKey);
        result[key].push({...clean,id:row.id ?? null,clientRowKey:row.clientRowKey ?? null});
      }
    }
  }
  return result;
}
module.exports = { definitions, normalizeRD };
