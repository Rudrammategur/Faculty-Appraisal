import { GraduationCap } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
// import TextArea from '../components/common/Fields'
import DynamicTable from '../components/common/DynamicTable'
import TeachingSemesterTable from '../components/common/TeachingSemesterTable'
import SupervisionTable from '../components/common/SupervisionTable'

function Instructional({
  form,
  update,
  updateRows,
  teachingLoading,
  teachingError,
  onRetryTeaching,
  projectLoading,
  projectError,
  onRetryProjects,
}) {
  const teachingRows = Array.isArray(form.rows?.teaching)
    ? form.rows.teaching
    : []

  return (
    <>
      <PageHeader
        title="I. INSTRUCTIONAL ELEMENT"
        description="Courses handled during the academic period."
        icon={GraduationCap}
      />

      <SectionCard title="a) Teaching Load :">
        <div className="teaching-load-wrapper">
          {teachingLoading ? (
            <p role="status">Loading teaching details...</p>
          ) : teachingError ? (
            <div role="alert">
              <p>{teachingError}</p>
              <button type="button" onClick={onRetryTeaching}>
                Retry
              </button>
            </div>
          ) : teachingRows.length === 0 ? (
            <p>No teaching records found for this reporting period.</p>
          ) : (

            <TeachingSemesterTable rows={teachingRows} />
          )}

          <div className="instructional-textarea">
            <p className="course-particulars-statement">
              Particulars to be given below, in respect of any courses above,
              which are taken as part of a semester:
            </p>

            <textarea
              value={form.courseParticulars || ''}
              onChange={(e) =>
                update('courseParticulars', e.target.value)
              }
              maxLength={1000}
              rows={4}
              placeholder="Enter particulars here..."
              aria-label="Course particulars"
            />

            <div className="textarea-meta">
              <span>Maximum 1000 characters</span>
              <span>
                {(form.courseParticulars || '').length}/1000
              </span>
            </div>
          </div>

          <div className="instructional-textarea">
            <label htmlFor="teachingInnovations">
              Innovations, if any:
            </label>

            <textarea
              id="teachingInnovations"
              value={form.teachingInnovations || ''}
              onChange={(e) =>
                update('teachingInnovations', e.target.value)
              }
              maxLength={1000}
              rows={4}
              placeholder="Enter innovations, if any..."
            />

            <div className="textarea-meta">
              <span>Maximum 1000 characters</span>
              <span>
                {(form.teachingInnovations || '').length}/1000
              </span>
            </div>
          </div>

        </div>
      </SectionCard>


      <SectionCard title="b) B.Tech & M.Tech Project Supervision">
        <SupervisionTable
          type="projects"
          rows={form.rows?.projects}
          onChange={rows => updateRows('projects', rows)}
          loading={projectLoading}
          error={projectError}
          onRetry={onRetryProjects}
        />

        {form.rows?.projects?.length > 0 && (
          <p className="project-supervision-note">
            *Mention if industry is hardware-related.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="c) Other Instructional Tasks"
        description="Include other instructional activities such as lab/course development, educational technology, summer or modular courses and practical training supervision."
      >
        <div className="instructional-textarea">
          <label>Other instructional tasks</label>
          <textarea
            value={form.otherInstructional || ''}
            onChange={(e) =>
              update('otherInstructional', e.target.value)
            }
            maxLength={1000}
            placeholder="Enter other instructional tasks..."
          />

          <div className="textarea-meta">
            <span>Maximum 1000 characters</span>
            <span>
              {(form.otherInstructional || '').length}/1000
            </span>
          </div>
        </div>
      </SectionCard>
    </>
  )
}

export default Instructional