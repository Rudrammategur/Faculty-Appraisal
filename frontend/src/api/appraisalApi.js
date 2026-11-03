const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '')

const NARRATIVES = ['courseParticulars', 'teachingInnovations', 'otherInstructional', 'otherWork', 'selfAppraisal', 'futureWork', 'otherDepartmentWork', 'sponsoredProjectRemarks', 'consultancyProjectRemarks', 'expectedResearch', 'expectedOutreach', 'expectedProfessional', 'otherExtensionTasks']
const GROUPS = ['projects', 'phd', 'journals', 'conferences', 'books', 'reports', 'awards', 'departmentLevels', 'instituteLevels', 'technologyTransfer', 'specialLectures']

async function request(path, academicYearId, options = {}) {
  const params = new URLSearchParams({ academicYearId: String(academicYearId) })
  const response = await fetch(`${API_BASE}/appraisal/${path}?${params}`, {
    credentials: 'include',
    ...options,
  })
  const result = await response.json()
  if (!response.ok || !result.success) {
    const error = new Error(result.message || 'Unable to access the appraisal draft.')
    error.status = response.status
    throw error
  }
  return result
}

export async function getCurrentDraft(academicYearId, signal) {
  return (await request('current', academicYearId, { signal })).data
}

export async function saveAppraisalDraft(form) {
  const payload = { academicYearId: form.academicYearId, rows: {} }
  for (const key of NARRATIVES) payload[key] = form[key] ?? ''
  for (const key of GROUPS) {
    if (Object.hasOwn(form.rows || {}, key)) {
      if (!Array.isArray(form.rows[key])) throw new Error(`${key} must be an array.`)
      payload.rows[key] = form.rows[key]
    }
  }
  // Browser files cannot be serialized into a persisted upload reference.
  if ((payload.rows.awards || []).some(row => row?.evidence != null || (row?.supportingDoc != null && typeof row.supportingDoc !== 'string') || row?.supportingDocument != null)) {
    throw new Error('Award uploads are pending. Remove the selected award file to save text data, or keep editing until upload support is added.')
  }
  for (const key of ['departmentLevels', 'instituteLevels']) {
    if ((payload.rows[key] || []).some(row => row?.supportingDocument != null || row?.supportingDoc != null || row?.evidence != null)) {
      throw new Error('Responsibility uploads are pending. Selected files are not saved by this text API.')
    }
  }
  return request('draft', form.academicYearId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formData: payload }),
  })
}

// Live project data is read-only and never included in the draft payload.
export async function getFacultyResearchProjects(academicYearId, signal) {
  const params = new URLSearchParams({ academicYearId: String(academicYearId) })
  const response = await fetch(`${API_BASE}/faculty/research-projects?${params}`, { signal, credentials: 'include' })
  const result = await response.json()
  if (!response.ok || !result.success) throw new Error(result.message || 'Unable to fetch research projects.')
  return result
}

export function submitAppraisal(academicYearId, appraisalId, token) {
  return request('submit', academicYearId, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ academicYearId, appraisalId, draftToken: token, confirmed: true }),
  })
}
