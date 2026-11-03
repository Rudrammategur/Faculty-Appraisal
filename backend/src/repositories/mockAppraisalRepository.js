const records = new Map()

function getKey(username, period) {
  return JSON.stringify([username, period])
}

async function findByFacultyAndPeriod(username, period) {
  const record = records.get(getKey(username, period))
  return record ? structuredClone(record) : null
}

async function save(record) {
  const key = getKey(record.username, record.period)
  records.set(key, structuredClone(record))
  return structuredClone(record)
}

module.exports = {
  findByFacultyAndPeriod,
  save
}