import { Plus, Trash2 } from 'lucide-react'
import './DynamicTable.css'

function DynamicTable({ columns = [], rows = [], onChange, renderRow, addLabel = 'Add row', showActions = true, className = '', headerRows, colGroup, bodyRows }) {
  const safeRows = Array.isArray(rows) && rows.length ? rows : [{}]
  const hasSerial = /^(sl\.?\s*no\.?|s\.?\s*no\.?|serial\s*(number|no\.?)?)$/i.test(String(columns[0] || '').trim())
  const addRow = () => onChange([...safeRows, {}])
  const deleteRow = index => onChange(safeRows.filter((_, i) => i !== index))
  const updateRow = (index, patch) => onChange(safeRows.map((row, i) => i === index ? { ...row, ...patch } : row))

  return (
    <div className={`dynamic-table ${hasSerial ? 'has-serial-column' : 'no-serial-column'} ${className}`} >
      <div className="dynamic-table-scroll">
        <table className="dynamic-table-grid">
          {colGroup}
          <thead>{headerRows || <tr>
            {columns.map((column, index) => <th key={index} scope="col">{column}</th>)}
            {showActions && (
              <th className="table-actions-header">Actions</th>
            )}
          </tr>}</thead>
          <tbody>
            {bodyRows || safeRows.map((row, index) => (
              <tr key={index}>
                {renderRow(row, index, patch => updateRow(index, patch))}
                {showActions && (
                <td className="table-actions">
                  {index === safeRows.length - 1 && (
                    <button type="button" className="row-action add" onClick={addRow}
                      title={addLabel} aria-label={addLabel}><Plus size={17} /></button>
                  )}
                  {index > 0 && (
                    <button type="button" className="row-action delete" onClick={() => deleteRow(index)}
                      title="Delete row" aria-label="Delete row"><Trash2 size={15} /></button>
                  )}
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DynamicTable
