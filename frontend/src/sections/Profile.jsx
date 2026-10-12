import { UserRound, Info, Upload } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { AutoField, TextField } from '../components/common/Fields'

function Profile({ form, update }) {
  return (
    <>
      <PageHeader
        title="Faculty Basic Details"
        icon={UserRound}
      />

        <div className="form-grid two">

          {/* From ERP */}
          <AutoField
            label="Name of faculty"
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
            label="Pay level"
            value={form.payLevel}
          />

          {/* Faculty input */}
          <TextField
            label="Basic Pay"
            value={form.basicPay}
            onChange={(value) => update('basicPay', value)}
            type="number"
            placeholder="Enter basic pay"
          />

          <TextField
            label="Date of Ph.D. defence"
            value={form.phdDefence}
            onChange={(value) => update('phdDefence', value)}
            type="date"
          />

          {/* From ERP */}
          <AutoField
            label="Date of joining to Institute"
            value={form.joiningDate || 'Will be loaded from ERP'}
          />

          <AutoField
            label="Department / Centre / Programme / School"
            value={form.department}
          />

        </div>
      
    </>
  )
}

export default Profile