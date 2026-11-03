const repository = require('../repositories/mockAppraisalRepository')

const APPRAISAL_PERIOD = '01.08.2025 – 31.07.2026'

function getCurrentPeriod() {
  return APPRAISAL_PERIOD
}

async function getCurrent(username) {
  const period = getCurrentPeriod()

  return repository.findByFacultyAndPeriod(username, period)
}

async function saveDraft(username, formData) {
  if (
    !formData ||
    typeof formData !== 'object' ||
    Array.isArray(formData)
  ) {
    const error = new Error('Valid formData object is required')
    error.statusCode = 400
    throw error
  }

  if (
    !formData.rows ||
    typeof formData.rows !== 'object' ||
    Array.isArray(formData.rows)
  ) {
    const error = new Error('FormData must contain rows')
    error.statusCode = 400
    throw error
  }

  const period = getCurrentPeriod()

  if (formData.period !== period) {
    const error = new Error('Invalid appraisal period')
    error.statusCode = 400
    throw error
  }

  for (const [key, rows] of Object.entries(formData.rows)) {
    if (!Array.isArray(rows)) {
      const error = new Error(`${key} must be an array`)
      error.statusCode = 400
      throw error
    }
  }

  const existing = await repository.findByFacultyAndPeriod(
    username,
    period
  )

  if (existing && existing.status !== 'Draft') {
    const error = new Error('Submitted appraisal cannot be edited')
    error.statusCode = 409
    throw error
  }

  // Browser File objects must be uploaded through a separate API.
  const { documents, ...jsonForm } = formData

  const now = new Date().toISOString()

  const record = {
    username,
    period,
    status: 'Draft',
    formData: structuredClone(jsonForm),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    submittedAt: null
  }

  return repository.save(record)
}

module.exports = {
  getCurrent,
  saveDraft
}