import { UserRound } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { AutoField } from '../components/common/Fields'

export default function Profile({ form }) {
  return (
    <>
      <PageHeader
        title="Faculty Basic Details"
        icon={UserRound}
      />

      <div className="form-grid two faculty-profile">
        <AutoField
          label="Name of the Faculty"
          value={form.name}
        />

        <AutoField
          label="Employee ID"
          value={form.employeeId}
        />

        <AutoField
          label="Designation"
          value={form.designation}
        />

        <AutoField
          label="Department / Centre / Programme / School"
          value={form.department}
        />
      </div>
    </>
  )
}