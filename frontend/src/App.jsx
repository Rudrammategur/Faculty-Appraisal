import { useMemo, useState } from 'react'
import Topbar from './components/layout/Topbar'
import Sidebar from './components/layout/Sidebar'
import MobileProgress from './components/layout/MobileProgress'
import FooterNav from './components/layout/FooterNav'
import { APPRAISAL_SECTIONS, INITIAL_FORM } from './data/sections'
import Profile from './sections/Profile'
import Instructional from './sections/Instructional'
import Research from './sections/Research'
import RD from './sections/RD'
import Institutional from './sections/Institutional'
import SelfAppraisal from './sections/SelfAppraisal'
import Innovations from './sections/Innovations'
import Review from './sections/Review'

export default function App() {
  const [active, setActive] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [form, setForm] = useState(INITIAL_FORM)
  const section = APPRAISAL_SECTIONS[active]

  const update = (key, value) => { setSaved(false); setForm(prev => ({ ...prev, [key]: value })) }
  const updateRows = (key, rows) => { setSaved(false); setForm(prev => ({ ...prev, rows: { ...prev.rows, [key]: rows } })) }
  const saveDraft = () => setSaved(true)

  const totals = useMemo(() => ({
    courses: form.rows.teaching.length,
    projects: form.rows.projects.length,
    phd: form.rows.phd.length,
    publications: form.rows.journals.length + form.rows.conferences.length,
    awards: form.rows.awards.length,
  }), [form.rows])

  const sectionProps = { form, update, updateRows }
  const renderSection = () => {
    switch (section.id) {
      case 'profile': return <Profile {...sectionProps} />
      case 'instructional': return <Instructional {...sectionProps} />
      case 'research': return <Research {...sectionProps} />
      case 'rd': return <RD {...sectionProps} />
      case 'institutional': return <Institutional {...sectionProps} />
      case 'self': return <SelfAppraisal {...sectionProps} />
      case 'innovations': return <Innovations {...sectionProps} />
      case 'review': return <Review form={form} totals={totals} />
      default: return null
    }
  }

  return <div className="app-shell">
    <Topbar saved={saved} onSave={saveDraft} onMenu={() => setMobileOpen(v => !v)} />
    <div className="app-layout">
      <Sidebar sections={APPRAISAL_SECTIONS} active={active} period={form.period} mobileOpen={mobileOpen} onSelect={index => { setActive(index); setMobileOpen(false) }} />
      <main className="main">
        <MobileProgress section={section} current={active + 1} total={APPRAISAL_SECTIONS.length} />
        <div className="content-wrap">
          {renderSection()}
          <FooterNav isFirst={active === 0} isLast={active === APPRAISAL_SECTIONS.length - 1} onBack={() => setActive(v => Math.max(v - 1, 0))} onNext={() => setActive(v => Math.min(v + 1, APPRAISAL_SECTIONS.length - 1))} onSave={saveDraft} />
        </div>
      </main>
    </div>
  </div>
}
