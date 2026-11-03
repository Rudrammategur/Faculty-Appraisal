const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '')

async function fetchFaculty(path, signal, parameters = {}) {
  const params = new URLSearchParams()

  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  })

  const query = params.toString()

  const response = await fetch(
    `${API_BASE}/faculty/${path}${query ? `?${query}` : ''}`,
    {
      signal,
      credentials: 'include',
    }
  )

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Unable to fetch faculty details.')
  }

  return result.data
}

export function getFacultyProfile(signal) {
  return fetchFaculty('profile', signal)
}

export function getAppraisalPeriod(signal, academicYearId) {
  return fetchFaculty('period', signal, { academicYearId })
}

export function getFacultyTeachingLoad(
  academicPeriodName,
  signal,
  academicYearId
) {
  return fetchFaculty('teaching', signal, {
    academicPeriodName,
    academicYearId,
  })
}

export function getProjectSupervision(signal, academicYearId) {
  return fetchFaculty('project-supervision', signal, {
    academicYearId,
  })
}

export function getPhdSupervision(signal, academicYearId) {
  return fetchFaculty('phd-supervision', signal, {
    academicYearId,
  })
}