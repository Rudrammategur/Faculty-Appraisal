export default function FacultyInfo({ form, loading, error }) {
  return (
    <section className="faculty-info" aria-label="Faculty details">
      {loading ? (
        <p role="status">Loading faculty details...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <dl className="faculty-info-grid">
          <div>
            <dt>Name:</dt>
            <dd>{form.name || '—'}</dd>
          </div>

          <div>
            <dt>Employee ID:</dt>
            <dd>{form.employeeId || '—'}</dd>
          </div>

          <div>
            <dt>Designation:</dt>
            <dd>{form.designation || '—'}</dd>
          </div>

          <div>
            <dt>Department:</dt>
            <dd>{form.department || '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}