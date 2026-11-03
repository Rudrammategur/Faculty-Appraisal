import PublicationCompletionDialog from './components/PublicationCompletionDialog'
import { incompletePublications,clearIncompletePublications,sectionRequiredGroups } from './utils/publicationCompleteness'
import { MappedDocumentsProvider } from './components/common/MappedDocuments'
import { getMyAppraisals } from './api/approvalApi'
import './styles/return-flow.css'
import PortalNavigation from './components/PortalNavigation'
import ReviewDashboard from './components/ReviewDashboard'
import FWOfficeDashboard from './components/FWOfficeDashboard'
import { getFwAccess, getFacultyApplicationWindow } from './api/fwOfficeApi'
import { useEffect, useRef, useState } from 'react'
import { getCurrentDraft, saveAppraisalDraft, getFacultyResearchProjects, submitAppraisal } from './api/appraisalApi'
import ApplicationView from './components/ApplicationView'
import {
  getAppraisalPeriod,
  getFacultyProfile,
  getFacultyTeachingLoad,
  getProjectSupervision,
  getPhdSupervision,
} from './api/facultyApi'

import Topbar from './components/layout/Topbar'
import Sidebar from './components/layout/Sidebar'
import MobileProgress from './components/layout/MobileProgress'
import FooterNav from './components/layout/FooterNav'
import FacultyInfo from './components/layout/FacultyInfo'
import SectionDocument from './components/common/SectionDocument'
import ApplicantDashboard from './components/ApplicantDashboard'

import { APPRAISAL_SECTIONS, INITIAL_FORM } from './data/sections'
import Instructional from './sections/Instructional'
import Research from './sections/Research'
import RD from './sections/RD'
import Institutional from './sections/Institutional'
import SelfAppraisal from './sections/SelfAppraisal'
import FutureWork from './sections/FutureWork'
import OtherDepartmentWork from './sections/OtherDepartmentWork'

import './styles/applicant-dashboard.css'

function supervisionKey(row) {
  return row.sourceSupervisionId && row.studentMasterId
    ? `${row.sourceSupervisionId}:${row.studentMasterId}`.toLowerCase()
    : null
}

function mapSupervision(row, type) {
  const mode = String(row.studyMode ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')

  const studyMode =
    ['FT', 'FULLTIME'].includes(mode) ? 'FT' :
      ['PT', 'PARTTIME'].includes(mode) ? 'PT' :
        '—'

  const common = {
    ...row,
    title: row.projectTitle ?? '',
    status: row.status ?? 'Ongoing',
    remarks: row.remarks ?? '',
  }

  if (type === 'phd') {
    return {
      ...common,
      student: row.studentName ?? '',
      reg: `${row.registrationYear ?? '—'} / ${studyMode}`,
      co: row.coSupervisor ?? '',
    }
  }

  return {
    ...common,
    students: row.studentName ?? '',
    year: row.registrationYear ?? '',
    cosupervisor: row.coSupervisor ?? '',
  }
}

function mergeSupervision(existing, incoming, type) {
  const previousByKey = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter(row => row && supervisionKey(row))
      .map(row => [supervisionKey(row), row])
  )

  const editableKeys = [
    'title',
    'status',
    'remarks',
    type === 'phd' ? 'co' : 'cosupervisor',
  ]

  const incomingKeys = new Set(incoming.map(supervisionKey))
  const missingSavedRows = [...previousByKey.entries()]
    .filter(([key]) => !incomingKeys.has(key))
    .map(([, row]) => ({
      ...row,
      studentName: row.studentName || 'Saved student — source mapping unavailable',
      student: row.student || 'Saved student — source mapping unavailable',
      students: row.students || 'Saved student — source mapping unavailable',
    }))

  const merged = incoming.map(source => {
    const next = mapSupervision(source, type)
    const previous = previousByKey.get(supervisionKey(next))

    if (previous) {
      editableKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(previous, key)) {
          next[key] = previous[key]
        }
      })
    }

    return next
  })

  return [...merged, ...missingSavedRows]
}

function formatReportingDate(value) {
  return value.split('-').reverse().join('.')
}

/*
 * Shared fetching for projects and Ph.D.
 * Updates source fields while preserving existing editable values.
 */
function useSupervisionData({
  appraisalPeriod,
  type,
  fetchRows,
  setForm,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!appraisalPeriod) return

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')

      try {
        const rows = await fetchRows(
          controller.signal,
          appraisalPeriod.academicYearId
        )

        if (controller.signal.aborted) return

        if (!Array.isArray(rows)) {
          throw new Error('Invalid supervision response.')
        }

        setForm(previous => {
          if (
            previous.academicYearId !==
            appraisalPeriod.academicYearId
          ) {
            return previous
          }

          return {
            ...previous,
            rows: {
              ...previous.rows,
              [type]: mergeSupervision(
                previous.rows?.[type],
                rows,
                type
              ),
            },
          }
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error.message || 'Unable to load supervision details.'
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [appraisalPeriod, type, fetchRows, setForm, retry])

  return {
    loading,
    error,
    retry: () => setRetry(value => value + 1),
  }
}

const PUBLICATION_KEYS=['journals','conferences','books','reports','awards','technologyTransfer','specialLectures']
function applyPublicationIds(form,record) {
 const rows={...form.rows}
 for(const key of PUBLICATION_KEYS)if(Array.isArray(rows[key]))rows[key]=rows[key].map(row=>{
   const id=record.publicationRowIds?.[key]?.[row.clientRowKey]
   return id && !row.id ? {...row,id}:row
 })
 return {...form,rows}
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [active, setActive] = useState(0)
  const [publicationIssues,setPublicationIssues]=useState(null)
  const publicationContinuation=useRef(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasApplication, setHasApplication] = useState(false)
  const [application, setApplication] = useState(null)
  const [myApplications, setMyApplications] = useState([])
  const [myApplicationsLoading, setMyApplicationsLoading] = useState(true)
  const [myApplicationsError, setMyApplicationsError] = useState('')
  const [myApplicationsRetry, setMyApplicationsRetry] = useState(0)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null)
  const openingApplication = useRef(null)
  const [submittingApplication, setSubmittingApplication] = useState(false)

  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    // Populate these from the backend period endpoint.
    period: '',
    academicYearId: null,
    documents: { ...(INITIAL_FORM.documents || {}) },
    rows: { ...(INITIAL_FORM.rows || {}) },
  }))

  const section = APPRAISAL_SECTIONS[active]

  const [canReview, setCanReview] = useState(false)
  const [canApply, setCanApply] = useState(false)
  const [accessLoading, setAccessLoading] = useState(true)
  const [accessRetry, setAccessRetry] = useState(0)
  const [fwAccess, setFwAccess] = useState(false)
  const [fwAccessError, setFwAccessError] = useState('')
  const [windowInfo, setWindowInfo] = useState(null)
  const [windowError, setWindowError] = useState('')
  const [windowClock, setWindowClock] = useState(Date.now)
  const [windowOffset, setWindowOffset] = useState(0)
  const [appraisalPeriod, setAppraisalPeriod] = useState(null)
  const [periodLoading, setPeriodLoading] = useState(true)
  const [periodError, setPeriodError] = useState('')
  const [periodRetry, setPeriodRetry] = useState(0)

  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const [teachingLoading, setTeachingLoading] = useState(true)
  const [teachingError, setTeachingError] = useState('')
  const [teachingRetry, setTeachingRetry] = useState(0)
  const [researchProjectsLoading, setResearchProjectsLoading] = useState(true)
  const [researchProjectsError, setResearchProjectsError] = useState('')
  const [researchProjectsWarnings, setResearchProjectsWarnings] = useState([])
  const [researchProjectsRetry, setResearchProjectsRetry] = useState(0)
  const [draftLoading, setDraftLoading] = useState(true)
  const [draftError, setDraftError] = useState('')
  const [draftRetry, setDraftRetry] = useState(0)
  const [attachmentJobs, setAttachmentJobs] = useState(0)
  const [savingDraft, setSavingDraft] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [saveError, setSaveError] = useState('')
  const editSequence = useRef(0)
  const lastSavedSequence = useRef(0)
  const savingLock = useRef(false)


  useEffect(() => {
    const controller = new AbortController()
    setAccessLoading(true)
    setFwAccessError('')
    getFwAccess(controller.signal).then(result => {
      if (!controller.signal.aborted) { setCanReview(result.canReview === true); setFwAccess(result.hasFwOfficeAccess === true); setCanApply(result.canApply === true); setFwAccessError('') }
    }).catch(error => { if (!controller.signal.aborted) setFwAccessError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setAccessLoading(false) })
    return () => controller.abort()
  }, [accessRetry])

  useEffect(() => {
    if (!appraisalPeriod) return
    const controller = new AbortController()
    function apply(data) {
      const receivedAt = Date.now()
      setWindowInfo(data.applicationWindow)
      setWindowOffset(Date.parse(data.serverNow) - receivedAt)
      setWindowClock(receivedAt)
      setWindowError('')
    }
    apply(appraisalPeriod)
    const refresh = () => getFacultyApplicationWindow(appraisalPeriod.academicYearId, controller.signal)
      .then(data => { if (!controller.signal.aborted) apply(data) })
      .catch(error => { if (!controller.signal.aborted) setWindowError(error.message) })
    const poll = setInterval(refresh, 60000)
    const clock = setInterval(() => setWindowClock(Date.now()), 15000)
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { controller.abort(); clearInterval(poll); clearInterval(clock); document.removeEventListener('visibilitychange', visible) }
  }, [appraisalPeriod])

  const windowOpen = Boolean(!windowError && windowInfo?.isPublished &&
    windowClock + windowOffset >= Date.parse(windowInfo.startsAtUtc) &&
    windowClock + windowOffset < Date.parse(windowInfo.endsAtUtc))
  const returnedForCorrection = application?.status === 'Returned to Faculty'
  const editWindowOpen = windowOpen || returnedForCorrection
  const windowNote = returnedForCorrection ? 'Returned for correction. You can edit and resubmit this application; review will restart with the HOD.' : windowError || (!windowInfo?.isPublished
    ? 'The appraisal application window has not been published.'
    : `Application dates: ${formatReportingDate(windowInfo.openingDate)} – ${formatReportingDate(windowInfo.closingDate)} (IST). ${windowOpen ? 'The form is open.' : 'The form is read-only outside these dates.'}`)

  useEffect(() => {
    if (!canApply) return
    const controller = new AbortController()

    async function loadPeriod() {
      setPeriodLoading(true)
      setPeriodError('')

      try {
        const period = await getAppraisalPeriod(controller.signal, selectedAcademicYear ?? undefined)

        if (controller.signal.aborted) return

        if (
          !Number.isInteger(period?.academicYearId) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(period.reportingFrom || '') ||
          !/^\d{4}-\d{2}-\d{2}$/.test(period.reportingTo || '')
        ) {
          throw new Error('Invalid appraisal period response.')
        }

        setForm(previous => ({
          ...(previous.academicYearId && previous.academicYearId !== period.academicYearId ? {
            ...INITIAL_FORM,
            ...Object.fromEntries(['name','employeeId','designation','department','joiningDate','payLevel','basicPay'].map(key=>[key,previous[key]])),
            documents:{}, rows:{...(INITIAL_FORM.rows || {})},
          } : previous),
          academicYearId: period.academicYearId,
          period:
            `${formatReportingDate(period.reportingFrom)} – ` +
            formatReportingDate(period.reportingTo),
        }))

        setAppraisalPeriod(period)
      } catch (error) {
        if (!controller.signal.aborted) {
          setPeriodError(
            error.message || 'Unable to load the appraisal period.'
          )
        }
      } finally {
        if (!controller.signal.aborted) setPeriodLoading(false)
      }
    }

    loadPeriod()
    return () => controller.abort()
  }, [periodRetry, canApply, selectedAcademicYear])

  useEffect(() => {
    if (!canApply) return
    const controller = new AbortController()

    async function loadProfile() {
      setProfileLoading(true)
      setProfileError('')

      try {
        const profile = await getFacultyProfile(controller.signal)

        if (controller.signal.aborted) return

        setForm(previous => ({
          ...previous,
          name: profile.name ?? '',
          employeeId: profile.employeeId ?? '',
          designation: profile.designation ?? '',
          department: profile.department ?? '',
          joiningDate: profile.joiningDate ?? '',
          payLevel: profile.payLevel ?? '',
          basicPay: profile.basicPay ?? '',
        }))
      } catch (error) {
        if (!controller.signal.aborted) {
          setProfileError(
            error.message || 'Unable to load faculty details.'
          )
        }
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false)
      }
    }

    loadProfile()
    return () => controller.abort()
  }, [canApply])

  useEffect(() => {
    if (!appraisalPeriod) return
    const controller = new AbortController()

    async function loadDraft() {
      setDraftLoading(true)
      setDraftError('')
      try {
        const record = await getCurrentDraft(
          appraisalPeriod.academicYearId,
          controller.signal
        )
        if (controller.signal.aborted) return
        if (record) {
          setHasApplication(true)
          setApplication(record)
          setForm(previous => ({
            ...previous,
            ...record.formData,
            // Preserve period/profile/source data that this API does not store.
            documents: previous.documents,
            rows: { ...previous.rows, ...record.formData.rows },
          }))
          if (openingApplication.current === record.appraisalId) {
            openingApplication.current = null
            setPage((record.status === 'Returned to Faculty' || (record.status === 'Draft' && appraisalPeriod.applicationWindow?.isOpen)) ? 'form' : 'preview')
          }
        } else {
          setApplication(null)
          setHasApplication(false)
          if (openingApplication.current) throw new Error('The selected application was not found.')
        }
      } catch (error) {
        if (!controller.signal.aborted) setDraftError(error.message)
      } finally {
        if (!controller.signal.aborted) setDraftLoading(false)
      }
    }
    loadDraft()
    return () => controller.abort()
  }, [appraisalPeriod, draftRetry])

  useEffect(() => {
    if (!canApply) return
    const controller = new AbortController()
    setMyApplicationsLoading(true)
    setMyApplicationsError('')
    getMyAppraisals(controller.signal).then(rows=>{
      if (!controller.signal.aborted) setMyApplications(rows)
    }).catch(error=>{
      if (!controller.signal.aborted) setMyApplicationsError(error.message)
    }).finally(()=>{if (!controller.signal.aborted) setMyApplicationsLoading(false)})
    return ()=>controller.abort()
  }, [canApply, myApplicationsRetry, application?.status, application?.appraisalId])

  function openStoredApplication(item) {
    openingApplication.current = item.appraisalId
    setDraftLoading(true)
    setMobileOpen(false)
    setApplication(null)
    if (item.academicYearId !== appraisalPeriod?.academicYearId) {
      setAppraisalPeriod(null)
      setSelectedAcademicYear(item.academicYearId)
    } else setDraftRetry(value=>value+1)
  }

  useEffect(() => {
    if (!appraisalPeriod) return

    const controller = new AbortController()

    async function loadTeaching() {
      setTeachingLoading(true)
      setTeachingError('')

      try {
        // The teaching endpoint returns both semesters for the selected year.
        const rows = await getFacultyTeachingLoad(
          undefined,
          controller.signal,
          appraisalPeriod.academicYearId
        )

        if (controller.signal.aborted) return

        if (!Array.isArray(rows)) {
          throw new Error('Invalid teaching details response.')
        }

        setForm(previous => {
          if (
            previous.academicYearId !==
            appraisalPeriod.academicYearId
          ) {
            return previous
          }

          return {
            ...previous,
            rows: {
              ...previous.rows,
              teaching: rows,
            },
          }
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          setTeachingError(
            error.message || 'Unable to load teaching details.'
          )
        }
      } finally {
        if (!controller.signal.aborted) setTeachingLoading(false)
      }
    }

    loadTeaching()
    return () => controller.abort()
  }, [appraisalPeriod, teachingRetry])

  useEffect(() => {
    if (!appraisalPeriod) return
    const controller = new AbortController()
    setResearchProjectsLoading(true)
    setResearchProjectsError('')
    setResearchProjectsWarnings([])
    getFacultyResearchProjects(appraisalPeriod.academicYearId, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        if (!Array.isArray(result.data?.sponsored) || !Array.isArray(result.data?.consultancy)) throw new Error('Invalid research-project response.')
        setForm(previous => ({
          ...previous,
          rows: { ...previous.rows, sponsored: result.data.sponsored, consultancy: result.data.consultancy },
        }))
        setResearchProjectsWarnings(result.meta?.warnings || [])
      })
      .catch(error => { if (!controller.signal.aborted) setResearchProjectsError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setResearchProjectsLoading(false) })
    return () => controller.abort()
  }, [appraisalPeriod, researchProjectsRetry])

  const projects = useSupervisionData({
    appraisalPeriod: draftLoading || draftError ? null : appraisalPeriod,
    type: 'projects',
    fetchRows: getProjectSupervision,
    setForm,
  })

  const phd = useSupervisionData({
    appraisalPeriod: draftLoading || draftError ? null : appraisalPeriod,
    type: 'phd',
    fetchRows: getPhdSupervision,
    setForm,
  })

  const openAppraisal = () => {
    if (!appraisalPeriod || periodLoading || periodError || draftLoading || draftError) return

    setHasApplication(true)
    setPage((!editWindowOpen || (application?.status && !['Draft','Returned to Faculty'].includes(application.status))) ? 'preview' : 'form')
    setMobileOpen(false)
  }

  function leavePublications(action) {
    if (page==='form' && (attachmentJobs || savingLock.current)) return
    const groups=sectionRequiredGroups[APPRAISAL_SECTIONS[active]?.id] || []
    const issues=page==='form' ? incompletePublications(form,groups) : []
    if(issues.length){publicationContinuation.current=action;setPublicationIssues(issues);return}
    action()
  }
  function changeSection(index) {
    if(index===active)return
    leavePublications(()=>{setActive(index);setMobileOpen(false)})
  }
  function clearAndContinuePublications(){
    setForm(previous=>clearIncompletePublications(previous,[...new Set((publicationIssues || []).map(issue=>issue.group))]))
    editSequence.current+=1
    setSaved(false);setSaveFeedback('');setSaveError('')
    const next=publicationContinuation.current
    publicationContinuation.current=null;setPublicationIssues(null);next?.()
  }
  const openDashboard = () => {
    leavePublications(()=>{
      setMyApplicationsRetry(value=>value+1)
      setMobileOpen(false)
      setPage('dashboard')
    })
  }

  const update = (key, value) => {
    if (!editWindowOpen || (application?.status && !['Draft','Returned to Faculty'].includes(application.status)) || submittingApplication) return
    editSequence.current += 1
    setSaveFeedback('')
    setSaveError('')
    setSaved(false)
    setForm(previous => ({ ...previous, [key]: value }))
  }

  const updateRows = (key, rows) => {
    if (!editWindowOpen || (application?.status && !['Draft','Returned to Faculty'].includes(application.status)) || submittingApplication) return
    editSequence.current += 1
    setSaveFeedback('')
    setSaveError('')
    setSaved(false)
    setForm(previous => ({
      ...previous,
      rows: { ...previous.rows, [key]: PUBLICATION_KEYS.includes(key)?rows.map(row=>row.clientRowKey?row:{...row,clientRowKey:crypto.randomUUID()}):rows },
    }))
  }

  const updateDocument = (key, file) => {
    if (!editWindowOpen || (application?.status && !['Draft','Returned to Faculty'].includes(application.status)) || submittingApplication) return
    editSequence.current += 1
    setSaveFeedback('')
    setSaveError('')
    setSaved(false)
    setForm(previous => ({
      ...previous,
      documents: { ...previous.documents, [key]: file },
    }))
  }

  const saveDraft = async (options = {}) => {
    const upload = options.forUpload === true
    const rejectSave = message => { setSaveError(message); if (upload) throw new Error(message) }
    if (attachmentJobs && !upload) { rejectSave('Wait for the document upload to finish.'); return }
    if (savingLock.current) { rejectSave('A save is already in progress. Please try again shortly.'); return }
    if ((application?.status && !['Draft','Returned to Faculty'].includes(application.status))) { rejectSave('Submitted applications cannot be edited.'); return }
    const blockers = [
      !editWindowOpen && windowNote,
      !appraisalPeriod && 'Appraisal period is unavailable.',
      periodLoading && 'Appraisal period is loading.',
      periodError && `Appraisal period: ${periodError}`,
      draftLoading && 'Saved draft is loading.',
      draftError && `Saved draft: ${draftError}`,
      teachingLoading && 'Teaching data is loading.',
      teachingError && `Teaching data: ${teachingError}`,
      projects.loading && 'Project supervision is loading.',
      projects.error && `Project supervision: ${projects.error}`,
      phd.loading && 'Ph.D. supervision is loading.',
      phd.error && `Ph.D. supervision: ${phd.error}`,
    ].filter(Boolean)

    if (blockers.length) {
      const message = `Draft was not saved. ${blockers.join(' ')}`
      setSaveError(message)
      setSaveFeedback('')
      console.warn('[SAVE DRAFT] Blocked before API request:', blockers)
      if (upload) throw new Error(message)
      return
    }

    savingLock.current = true
    setSavingDraft(true)
    setSaveFeedback('')
    setSaveError('')
    const startedAt = editSequence.current
    try {
      console.info('[SAVE DRAFT] Calling draft API')
      const result = await saveAppraisalDraft(options.formOverride || form)
      const record = result.data
      lastSavedSequence.current = startedAt
      setApplication(record)
      setForm(previous=>applyPublicationIds(previous,record))
      setHasApplication(true)

      // Retain server-generated responsibility IDs for the next save.
      // Never replace edits made while this request was in progress.
      if (startedAt === editSequence.current) {
        setForm(previous => ({
          ...previous,
          rows: {
            ...previous.rows,
            departmentLevels: record.formData.rows.departmentLevels,
            instituteLevels: record.formData.rows.instituteLevels,
          },
        }))
      }

      setSaved(startedAt === editSequence.current)
      setSaveFeedback(
        startedAt === editSequence.current
          ? 'Sections I–VII text saved. Project lists are fetched separately; documents use their upload controls.'
          : 'Sections I–VII text saved. Newer edits still need saving. Documents use their upload controls.'
      )
      return record
    } catch (error) {
      setSaved(false)
      setSaveError(error.message || 'Unable to save the draft.')
      console.error('[SAVE DRAFT] Failed:', error.message)
      if (upload) throw error
    } finally {
      savingLock.current = false
      setSavingDraft(false)
    }
  }

  const prepareDocumentTarget = async (target, rowIndex) => {
    let prepared = form
    let clientKey
    const responsibility = ['departmentLevels','instituteLevels'].includes(target)
    const responsibilityRows = form.rows?.[target] || []
    const meaningfulResponsibility = row => row.id || [row.responsibility,row.activities,row.fromDate,row.toDate].some(value=>String(value ?? '').trim())
    if (responsibility && !meaningfulResponsibility(responsibilityRows[rowIndex] || {})) throw new Error('Enter responsibility details before uploading a document.')
    const savedIndex = responsibility ? responsibilityRows.slice(0,rowIndex).filter(meaningfulResponsibility).length : rowIndex
    if (PUBLICATION_KEYS.includes(target)) {
      const rows = [...(form.rows?.[target]?.length ? form.rows[target] : [{}])]
      if (!Number.isInteger(rowIndex) || !rows[rowIndex]) throw new Error('Publication row is unavailable.')
      clientKey = rows[rowIndex].clientRowKey || crypto.randomUUID()
      rows[rowIndex] = {...rows[rowIndex], clientRowKey: clientKey, documentPending: true}
      prepared = {...form, rows: {...form.rows, [target]: rows}}
      setForm(prepared)
    }
    const record = await saveDraft({forUpload: true, formOverride: prepared})
    if (!record?.appraisalId) throw new Error('Unable to prepare the application for upload.')
    const id = clientKey ? record.publicationRowIds?.[target]?.[clientKey] : responsibility ? record.formData.rows[target]?.[savedIndex]?.id : 0
    if (responsibility && !id) throw new Error('Enter responsibility details before uploading a document.')
    if (clientKey && !id) throw new Error('Unable to prepare the publication for upload.')
    return {appraisalId: record.appraisalId, rowId: id}
  }

  const handleSubmission = async () => {
    if (attachmentJobs) throw new Error('Wait for the document upload to finish.')
    if (!editWindowOpen) throw new Error(windowNote)
    if (savingLock.current) throw new Error('Wait for the current save to finish.')
    if (researchProjectsLoading || researchProjectsError) throw new Error('Research project details must load successfully before submission.')
    if (periodLoading || periodError || draftLoading || draftError || profileLoading || profileError || teachingLoading || teachingError || projects.loading || projects.error || phd.loading || phd.error) throw new Error('All application details must load successfully before submission.')
    if ((application?.status && !['Draft','Returned to Faculty'].includes(application.status))) return
    if (Object.values(form.documents || {}).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))) throw new Error('Section-level attachments are not yet persisted. Keep a copy of the files and complete upload integration before submitting them.')
    savingLock.current = true
    setSubmittingApplication(true)
    const startedAt = editSequence.current
    try {
      const saved = await saveAppraisalDraft(form)
      setApplication(saved.data)
      setForm(previous=>applyPublicationIds(previous,saved.data))
      if (startedAt === editSequence.current) {
        setForm(previous => ({ ...previous, rows: {
          ...previous.rows,
          departmentLevels: saved.data.formData.rows.departmentLevels,
          instituteLevels: saved.data.formData.rows.instituteLevels,
        } }))
      }
      if (startedAt !== editSequence.current) throw new Error('The form changed while saving. Review it again before submitting.')
      const result = await submitAppraisal(form.academicYearId, saved.data.appraisalId, saved.data.draftToken)
      setApplication(result.data)
      setHasApplication(true)
      setSaveFeedback('Application submitted successfully.')
      openDashboard()
    } catch (error) {
      // A successful commit may have lost its HTTP response. Restore server state before retrying.
      try {
        const current = await getCurrentDraft(form.academicYearId)
        if ((current?.status && !['Draft','Returned to Faculty'].includes(current.status))) {
          setApplication(current)
          setHasApplication(true)
          openDashboard()
          setSaveFeedback('Application submission confirmed by server.')
          return
        }
      } catch { /* Keep the original submission error. */ }
      throw error
    } finally {
      savingLock.current = false
      setSubmittingApplication(false)
    }
  }

  const sectionProps = { form, update, updateRows }

  const renderSection = () => {
    switch (section?.id) {
      case 'instructional':
        return (
          <Instructional
            {...sectionProps}
            teachingLoading={teachingLoading}
            teachingError={teachingError}
            onRetryTeaching={() =>
              setTeachingRetry(value => value + 1)
            }
            projectLoading={projects.loading}
            projectError={projects.error}
            onRetryProjects={projects.retry}
          />
        )

      case 'research':
        return (
          <Research
            {...sectionProps}
            phdLoading={phd.loading}
            phdError={phd.error}
            onRetryPhd={phd.retry}
          />
        )

      case 'rd':
        return <RD {...sectionProps}
          projectsLoading={researchProjectsLoading}
          projectsError={researchProjectsError}
          projectWarnings={researchProjectsWarnings}
          onRetryProjects={() => setResearchProjectsRetry(value => value + 1)}
        />

      case 'institutional':
        return <Institutional {...sectionProps} />

      case 'self':
        return <SelfAppraisal {...sectionProps} />

      case 'futureWork':
        return <FutureWork {...sectionProps} />

      case 'otherDepartmentWork':
        return <OtherDepartmentWork {...sectionProps} />

      default:
        return null
    }
  }

  const isPreview =
    page === 'preview' ||
    (page === 'form' && section?.id === 'review')

  const backToEditing = () => {
    if (!editWindowOpen || (application?.status && !['Draft','Returned to Faculty'].includes(application.status))) { openDashboard(); return }
    const reviewIndex = APPRAISAL_SECTIONS.findIndex(
      item => item.id === 'review'
    )

    setActive(Math.max(reviewIndex - 1, 0))
    setMobileOpen(false)
    setPage('form')
  }

  if (accessLoading) return <main style={{ padding: 32 }} role="status">Checking access…</main>

  if (fwAccessError) return <main style={{ padding: 32 }} role="alert">
    <p>{fwAccessError}</p>
    <button type="button" className="outline-btn" onClick={() => setAccessRetry(value => value + 1)}>Retry</button>
  </main>

  function navigatePortal(target) {
    if (attachmentJobs) return
    if (target === page) return
    if (page === 'form' && editSequence.current > lastSavedSequence.current &&
        !window.confirm('Leave the form with unsaved changes?')) return
    setMobileOpen(false)
    if (target === 'dashboard') openDashboard()
    else setPage(target)
  }
  const portalNavigation = <PortalNavigation page={page} canApply={canApply}
    canReview={canReview} canManage={fwAccess} onNavigate={navigatePortal} />

  if (canReview && page === 'reviews') return <ReviewDashboard onBack={openDashboard}
    onNavigate={navigatePortal} permissions={{canApply,canManage:fwAccess}} />

  if (!canApply && !(fwAccess && page === 'fw-office')) return (
    <div className="app-shell">
      <Topbar isDashboard showFormActions={false} />
      {portalNavigation}
      <main className="review-content">
        <div className="review-page-heading"><div><h1>Welcome to the Appraisal Portal</h1>
          <p>{canReview || fwAccess ? 'Choose your workspace from the navigation above.' : 'Appraisal applications are available only to users with an active IITDH Faculty role.'}</p>
        </div></div>
      </main>
    </div>
  )

  if (fwAccess && page === 'fw-office') return <FWOfficeDashboard onBack={() => {
    setPeriodRetry(value => value + 1)
    openDashboard()
  }} />

  if (isPreview) {
    return (
      <>
      {(researchProjectsLoading || researchProjectsError) && <p role="status" style={{ padding: 12 }}>
        Research projects: {researchProjectsLoading ? 'Loading; preview may be incomplete.' : researchProjectsError}
      </p>}
      <ApplicationView
        submissionAllowed={editWindowOpen}
        submissionBlockReason={windowNote}
        steps={application?.steps || []}
        history={application?.history || []}
        application={application}
        onSubmit={handleSubmission}
        form={form}
        onBack={backToEditing}
        onDashboard={openDashboard}
        profileLoading={profileLoading}
        profileError={profileError}
        teachingLoading={teachingLoading}
        teachingError={teachingError}
        supervisionLoading={
          periodLoading ||
          draftLoading ||
          !appraisalPeriod ||
          projects.loading ||
          phd.loading || researchProjectsLoading
        }
        supervisionError={[
          periodError,
          draftError,
          projects.error,
          phd.error,
          researchProjectsError,
        ].filter(Boolean).join(' ')}
      />
      </>
    )
  }

  return (
    <div className="app-shell">
      {publicationIssues && <PublicationCompletionDialog issues={publicationIssues} onEdit={()=>{publicationContinuation.current=null;setPublicationIssues(null)}} onClear={clearAndContinuePublications}/> }
      <Topbar
        saved={saved}
        onSave={saveDraft}
        onMenu={() => setMobileOpen(value => !value)}
        onDashboard={openDashboard}
        period={form.period}
        showFormActions={page === 'form' && editWindowOpen}
        isDashboard={page === 'dashboard'}
      />

      {page !== 'form' && portalNavigation}
      <FacultyInfo
        form={form}
        loading={profileLoading}
        error={profileError}
      />

      {page === 'form' && returnedForCorrection && <section className="return-instruction-card" aria-label="Correction instructions"><strong>Corrections requested</strong><p>{application.correctionInstructions}</p></section>}
      {page === 'form' && <p className="appraisal-window-notice" role="status">{appraisalPeriod && windowNote}</p>}
      {(page === 'form' || saveFeedback) && <div role="status" style={{ padding: '8px 20px', fontSize: 13, color: '#697386' }}>
        {savingDraft
          ? 'Saving supported draft text…'
          : saveFeedback || 'Draft saving covers sections I–VII text. Project lists are read-only. Documents use their upload controls.'}
      </div>}

      {saveError && (
        <div role="alert" style={{ margin: '0 20px 12px', padding: 12, color: '#b42318', background: '#fff4f2', border: '1px solid #fecdca', borderRadius: 6 }}>
          <strong>Draft not saved.</strong> {saveError}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {teachingError && <button type="button" onClick={() => setTeachingRetry(value => value + 1)}>Retry teaching</button>}
            {projects.error && <button type="button" onClick={projects.retry}>Retry projects</button>}
            {phd.error && <button type="button" onClick={phd.retry}>Retry Ph.D.</button>}
          </div>
        </div>
      )}

      {periodLoading ? (
        <div style={{ padding: '16px 20px' }} role="status">
          Loading appraisal period…
        </div>
      ) : periodError ? (
        <div
          role="alert"
          style={{ padding: '16px 20px', color: '#b42318' }}
        >
          <p>{periodError}</p>
          <button
            type="button"
            className="outline-btn"
            onClick={() => setPeriodRetry(value => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : draftLoading ? (
        <p role="status" style={{ padding: '16px 20px' }}>Loading saved draft…</p>
      ) : draftError ? (
        <div role="alert" style={{ padding: '16px 20px', color: '#b42318' }}>
          <p>{draftError}</p>
          <button type="button" className="outline-btn" onClick={() => setDraftRetry(value => value + 1)}>
            Retry loading draft
          </button>
        </div>
      ) : page === 'dashboard' ? (
        <ApplicantDashboard
          onCurrentCycle={selectedAcademicYear !== null ? ()=>{
            openingApplication.current=null
            setApplication(null)
            setHasApplication(false)
            setAppraisalPeriod(null)
            setPeriodLoading(true)
            setSelectedAcademicYear(null)
          } : null}
          applications={myApplications}
          listLoading={myApplicationsLoading}
          listError={myApplicationsError}
          onRefresh={()=>setMyApplicationsRetry(value=>value+1)}
          onOpenApplication={openStoredApplication}
          period={form.period}
          hasApplication={hasApplication}
          application={application}
          canStart={editWindowOpen}
          windowNote={windowNote}
          onOpen={openAppraisal}
        />
      ) : (
        <div
          className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''
            }`}
        >
          <Sidebar
            sections={APPRAISAL_SECTIONS}
            active={active}
            period={form.period}
            mobileOpen={mobileOpen}
            onSelect={changeSection}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() =>
              setSidebarCollapsed(value => !value)
            }
          />

          <main className="main">
            <MobileProgress
              section={section}
              current={active + 1}
              total={APPRAISAL_SECTIONS.length}
            />

            <div className="content-wrap">
              <fieldset disabled={!editWindowOpen || submittingApplication || savingDraft || attachmentJobs>0} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <MappedDocumentsProvider appraisalId={application?.appraisalId} onPrepare={prepareDocumentTarget} onResponsibilitySaved={(target,id,hasSupportingDocument)=>setForm(previous=>({...previous,rows:{...previous.rows,[target]:(previous.rows[target] || []).map(row=>row.id===id?{...row,hasSupportingDocument,supportingDocument:null}:row)}}))} onActivity={delta=>setAttachmentJobs(count=>Math.max(0,count+delta))}>
                {renderSection()}
              </MappedDocumentsProvider>

              {section?.id === 'instructional' && (
                  <SectionDocument
                    file={form.documents?.[section.id]}
                    onChange={file =>
                      updateDocument(section.id, file)
                    }
                  />
                )}

              </fieldset>
              <FooterNav
                isFirst={active === 0}
                isLast={active === APPRAISAL_SECTIONS.length - 1}
                onBack={() => changeSection(Math.max(active-1,0))}
                onNext={() => changeSection(Math.min(active+1,APPRAISAL_SECTIONS.length-1))}
                onSave={saveDraft}
              />
            </div>
          </main>
        </div>
      )}
    </div>
  )
}