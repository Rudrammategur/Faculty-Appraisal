export default function PageHeader({ eyebrow, title, description, icon: Icon }) {
  return (
    <div className="page-header">
      <div className="header-icon"><Icon size={23} /></div>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}
