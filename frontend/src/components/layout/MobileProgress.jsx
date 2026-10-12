export default function MobileProgress({ section, current, total }) {
  const progress = Math.round((current / total) * 100)
  return (
    <div className="mobile-progress">
      <div><strong>{section.label}</strong><span>{current} of {total}</span></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
    </div>
  )
}
