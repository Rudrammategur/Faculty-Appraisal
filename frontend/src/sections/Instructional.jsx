import { GraduationCap, Plus, ExternalLink } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import SectionCard from '../components/common/SectionCard'
// import TextArea from '../components/common/Fields'
import DynamicTable from '../components/common/DynamicTable'

const EMPTY_TEACHING_ROW = {
  courseType: '',
  course: '',
  evaluated: '',
  studentsUGPG: '',
  weeklyLoad: '',
  feedbackUrl: '',
}

function isEmptyTeachingRow(row = {}) {
  return (
    !row.courseType &&
    !row.course &&
    !row.evaluated &&
    !row.studentsUGPG &&
    !row.weeklyLoad &&
    !row.feedbackUrl
  )
}

function Instructional({ form, update, updateRows }) {
  /*
   * The first time the section is opened, show exactly one empty row.
   *
   * If actual teaching data already exists, preserve it.
   */
  const existingRows = Array.isArray(form?.rows?.teaching)
    ? form.rows.teaching
    : []

  const teachingRows =
    form.rows?.teaching?.length > 0
      ? form.rows.teaching
      : [EMPTY_TEACHING_ROW]

  const handleTeachingRowsChange = (rows) => {
    updateRows('teaching', rows)
  }

  return (
    <>
      <PageHeader
        eyebrow="I. INSTRUCTIONAL ELEMENT"
        title="Teaching Load"
        description="Enter the courses handled during the academic period. Student strength and feedback information will be provided from the institute systems."
        icon={GraduationCap}
      />

      <SectionCard
        title="a) Teaching Load :"
        description="Add one row for each course. Student strength for UG and PG is loaded from the database."
      >
        <div className="teaching-load-wrapper">

          <DynamicTable
            columns={[
              'Course Type (Core/Elective)',
              'Course Code & Title',
              'No. of students evaluated',
              'Number of students for UG and PG',
              'Weekly Load taken LTP',
              'Feedback link',
            ]}
            rows={teachingRows}
            onChange={handleTeachingRowsChange}
            addLabel="Add course"
            renderRow={(row, index, setRow) => (
              <>
                <td>
                  <select
                    value={row.courseType || ''}
                    onChange={(e) =>
                      setRow({ courseType: e.target.value })
                    }
                    required
                  >
                    <option value="">Select</option>
                    <option value="Core">Core</option>
                    <option value="Elective">Elective</option>
                  </select>
                </td>

                <td>
                  <input
                    type="text"
                    value={row.course || ''}
                    onChange={(e) =>
                      setRow({ course: e.target.value })
                    }
                    placeholder="Course code & title"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    min="0"
                    value={row.evaluated || ''}
                    onChange={(e) =>
                      setRow({ evaluated: e.target.value })
                    }
                    placeholder="No. evaluated"
                  />
                </td>

                <td>
                  <div className="db-value-cell">
                    {row.studentsUGPG || (
                      <span className="db-placeholder">
                        From DB
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={row.weeklyLoad || ''}
                    onChange={(e) =>
                      setRow({ weeklyLoad: e.target.value })
                    }
                    placeholder="LTP"
                  />
                </td>

                <td>
                  {row.feedbackUrl ? (
                    <a
                      href={row.feedbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="feedback-link"
                    >
                      View Feedback
                    </a>
                  ) : (
                    <span className="feedback-placeholder">
                      —
                    </span>
                  )}
                </td>
              </>
            )}
          />

        </div>
      </SectionCard>

      <SectionCard
        title="Particulars of courses"
        description="Provide additional information about courses that were taken as part of a semester, where applicable."
      >
        <div className="instructional-textarea">
          <label>Course particulars</label>
          <textarea
            value={form.courseParticulars || ''}
            onChange={(e) =>
              update('courseParticulars', e.target.value)
            }
            maxLength={1000}
            placeholder="Enter additional particulars, if applicable..."
          />

          <div className="textarea-meta">
            <span>Maximum 1000 characters</span>
            <span>
              {(form.courseParticulars || '').length}/1000
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Innovations, if any"
        description="Mention innovations related to teaching, course development, instructional software, educational technology, practical training, etc."
      >
        <div className="instructional-textarea">
          <label>Teaching innovations</label>
          <textarea
            value={form.teachingInnovations || ''}
            onChange={(e) =>
              update('teachingInnovations', e.target.value)
            }
            maxLength={1000}
            placeholder="Describe the teaching innovation and its impact..."
          />

          <div className="textarea-meta">
            <span>Maximum 1000 characters</span>
            <span>
              {(form.teachingInnovations || '').length}/1000
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="b) B.Tech / M.Tech Project Supervision"
        description="Add projects supervised during the appraisal period."
      >
        <DynamicTable
          columns={[
            'Level',
            'Project Title',
            'Names of Students',
            'Registration Year',
            'Status',
            'Co-Supervisor',
            'Remarks',
          ]}
          rows={form.rows?.projects || []}
          onChange={(rows) =>
            updateRows('projects', rows)
          }
          addLabel="Add project"
          renderRow={(row, index, setRow) => (
            <>
              <select
                value={row.level || ''}
                onChange={(e) =>
                  setRow({
                    level: e.target.value,
                  })
                }
              >
                <option value="">Select</option>
                <option value="B.Tech / M.Sc.">
                  B.Tech / M.Sc.
                </option>
                <option value="M.Tech">
                  M.Tech
                </option>
              </select>

              <input
                value={row.title || ''}
                onChange={(e) =>
                  setRow({
                    title: e.target.value,
                  })
                }
                placeholder="Project title"
              />

              <input
                value={row.students || ''}
                onChange={(e) =>
                  setRow({
                    students: e.target.value,
                  })
                }
                placeholder="Student name(s)"
              />

              <input
                value={row.year || ''}
                onChange={(e) =>
                  setRow({
                    year: e.target.value,
                  })
                }
                placeholder="YYYY"
              />

              <select
                value={row.status || ''}
                onChange={(e) =>
                  setRow({
                    status: e.target.value,
                  })
                }
              >
                <option value="">Select</option>
                <option value="On-going">On-going</option>
                <option value="Completed">Completed</option>
              </select>

              <input
                value={row.cosupervisor || ''}
                onChange={(e) =>
                  setRow({
                    cosupervisor: e.target.value,
                  })
                }
                placeholder="If any"
              />

              <input
                value={row.remarks || ''}
                onChange={(e) =>
                  setRow({
                    remarks: e.target.value,
                  })
                }
                placeholder="Remarks"
              />
            </>
          )}
        />
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