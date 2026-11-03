const { fail } = require('./appraisalExtraValidation');
const clean = value => String(value ?? '').trim();
function dateText(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const result = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result + 'T00:00:00Z'))) fail('A project contains an invalid source date.', 409);
  return result;
}
function mapProjects(rows, period) {
  const sourceGroups = new Map();
  for (const row of rows) {
    const identity = clean(row.InstanceId).toLowerCase();
    if (!identity) fail('A project has no source identity. Contact ERP support.', 409);
    if (!sourceGroups.has(identity)) sourceGroups.set(identity, []);
    sourceGroups.get(identity).push(row);
  }
  const data = { sponsored: [], consultancy: [] };
  const warnings = [];
  let excludedCSRCount = 0;
  for (const group of sourceGroups.values()) {
    const row = group[0];
    // Extension joins may repeat base data. Never pick an arbitrary conflicting base row.
    for (const column of ['ProjectCode', 'CategoryName', 'ProjectName', 'FundingAgency', 'ProjectBudget', 'PrincipalInvestigator', 'FromDate', 'ToDate', 'TotalDuration', 'ProjectStatus']) {
      const values = new Set(group.map(r => ['FromDate', 'ToDate'].includes(column) ? dateText(r[column]) : clean(r[column])));
      if (values.size > 1) fail(`Conflicting ${column} values exist for project ${clean(row.ProjectCode)}. Contact ERP support.`, 409);
    }
    const category = clean(row.CategoryName).toLowerCase();
    const key = category === 'sponsored' ? 'sponsored' : category === 'consultancy' ? 'consultancy' : null;
    if (!key) { if (category === 'csr') excludedCSRCount++; continue; }
    const start = dateText(row.FromDate);
    if (!start) { warnings.push(`Project ${clean(row.ProjectCode)} has no start date and could not be classified by period.`); continue; }
    const closures = [...new Set(group.map(r => dateText(r.ClosureDate)).filter(Boolean))];
    if (closures.length > 1) fail(`Multiple closure dates exist for project ${clean(row.ProjectCode)}. Verify the source.`, 409);
    const scheduled = group.flatMap(r => [dateText(r.ToDate), dateText(r.ExtensionEndDate)]).filter(Boolean).sort();
    const end = closures[0] || scheduled.at(-1) || null;
    if (end && end < start) fail(`The end date precedes the start date for project ${clean(row.ProjectCode)}.`, 409);
    if (start >= period.reportingEndExclusive || (end && end < period.reportingFrom)) continue;
    if (!end) warnings.push(`Project ${clean(row.ProjectCode)} has no end date; treated as open-ended.`);
    data[key].push({
      sourceProjectId: clean(row.InstanceId), projectCode: clean(row.ProjectCode),
      title: clean(row.ProjectName), agency: clean(row.FundingAgency), client: clean(row.FundingAgency),
      amount: row.ProjectBudget ?? '', fromDate: start, toDate: dateText(row.ToDate) || '',
      effectiveEndDate: end || '', period: [start, clean(row.TotalDuration)].filter(Boolean).join(' · '),
      people: clean(row.PrincipalInvestigator), status: clean(row.ProjectStatus),
      financialYear: clean(row.FinancialYear), projectType: clean(row.ProjectType),
    });
  }
  for (const group of Object.values(data)) group.sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  return { data, meta: {
    period, periodFiltered: true, periodFilterBasis: 'Start to closure date, otherwise latest scheduled/extended end; overlap includes ongoing projects.',
    facultyMapping: 'VW_ProjectDetails.EmployeeBasicInfoId equals authenticated employee identity; co-investigator coverage is not verified.',
    amountSource: 'ProjectBudget (original budget)', excludedCSRCount, warnings,
  } };
}
module.exports = { mapProjects };
