import { Plus, Pencil, Trash2 } from 'lucide-react'
import './DynamicTable.css'

function DynamicTable({
  columns = [],
  rows = [],
  onChange,
  renderRow,
  addLabel = 'Add row',
}) {
  const addRow = () => {
    onChange([
      ...rows,
      {},
    ])
  }

  const deleteRow = (index) => {
    onChange(rows.filter((_, i) => i !== index))
  }

  const updateRow = (index, patch) => {
    const updatedRows = [...rows]

    updatedRows[index] = {
      ...updatedRows[index],
      ...patch,
    }

    onChange(updatedRows)
  }

  return (
    <div className="dynamic-table">

      <div className="dynamic-table-scroll">
        <table className="dynamic-table-grid">

          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}

              <th className="table-actions-header">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>

                {renderRow(
                  row,
                  index,
                  (patch) => updateRow(index, patch)
                )}

                <td className="table-actions">

  {/* + is ALWAYS shown on the last row */}
  {index === rows.length - 1 && (
    <button
      type="button"
      className="row-action add"
      onClick={addRow}
      title="Add row"
      aria-label="Add row"
    >
      <Plus size={17} />
    </button>
  )}

  {/* Delete is shown only for rows after the first row */}
  {index > 0 && (
    <button
      type="button"
      className="row-action delete"
      onClick={() => deleteRow(index)}
      title="Delete row"
      aria-label="Delete row"
    >
      <Trash2 size={15} />
    </button>
  )}

</td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  )
}

export default DynamicTable