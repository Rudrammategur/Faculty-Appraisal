const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '')

async function request(id, section, { signal, body } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
    throw new Error('Save the initial application draft to obtain an AppraisalID first.')
  }
  const response = await fetch(`${API_BASE}/appraisal/${encodeURIComponent(id)}/${section}`, {
    method: body === undefined ? 'GET' : 'PUT',
    credentials: 'include',
    signal,
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })
  const result = await response.json()
  if (!response.ok || !result.success) throw new Error(result.message || 'Unable to access appraisal details.')
  return result.data
}

export function getOthers(appraisalId, signal) {
  return request(appraisalId, 'others', { signal })
}

export function saveOthers(appraisalId, form) {
  return request(appraisalId, 'others', { body: {
    otherWork: form.otherWork ?? '',
    selfAppraisal: form.selfAppraisal ?? '',
    futureWork: form.futureWork ?? '',
    otherDepartmentWork: form.otherDepartmentWork ?? '',
  } })
}

export function getResponsibilities(appraisalId, signal) {
  return request(appraisalId, 'responsibilities', { signal })
}

export function saveResponsibilities(appraisalId, rows) {
  const body = {}
  for (const key of ['departmentLevels', 'instituteLevels']) {
    if (!Object.hasOwn(rows, key)) continue
    if (!Array.isArray(rows[key])) throw new Error(`${key} must be an array.`)
    body[key] = rows[key].map(row => {
      if (row.supportingDocument != null || row.supportingDoc != null || row.evidence != null) {
        throw new Error('Responsibility document uploads are pending. Save text data separately.')
      }
      return {
        id: row.id ?? row.responsibilityId ?? null,
        responsibility: row.responsibility ?? '',
        activities: row.activities ?? '',
        fromDate: row.fromDate ?? '',
        toDate: row.toDate ?? '',
      }
    })
  }
  return request(appraisalId, 'responsibilities', { body })
}
