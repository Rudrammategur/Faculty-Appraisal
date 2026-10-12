export default function SectionCard({ title, description, children, action }) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
