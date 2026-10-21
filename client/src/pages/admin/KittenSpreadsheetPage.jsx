import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSpreadsheet, patchSpreadsheetCell } from '../../services/api';

const COLUMNS = [
  { field: 'name', label: 'Name' },
  { field: 'dateOfBirth', label: 'DOB', type: 'date' },
  { field: 'intakeDate', label: 'Intake', type: 'date' },
  { field: 'vaccines', label: 'FVRCP', type: 'date' },
  { field: 'rabies', label: 'Rabies', type: 'date' },
  { field: 'fixedStatus', label: 'Fixed' },
  { field: 'microchipNumber', label: 'Microchip' },
  { field: 'gender', label: 'Gender' },
  { field: 'breed', label: 'Breed' },
  { field: 'color', label: 'Color' },
  { field: 'coatPattern', label: 'Pattern' },
  { field: 'fivFelvStatus', label: 'FIV/FeLV' },
  { field: 'status', label: 'Status' },
  { field: 'weight', label: 'Weight (g)', type: 'number' },
];

function toInputValue(value, type) {
  if (value == null || value === '') return '';
  if (type === 'date') return String(value).slice(0, 10);
  return String(value);
}

function KittenSpreadsheetPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  useEffect(() => {
    fetchSpreadsheet()
      .then((data) => setRows(data.rows || []))
      .catch((err) => setError(err.message || 'Failed to load spreadsheet'));
  }, []);

  async function commitCell(row, field, type, event) {
    const next = type === 'number' ? Number(event.target.value) : event.target.value;
    const current = toInputValue(row[field], type);
    if (String(next ?? '') === current) return;
    setSavingKey(`${row.id}:${field}`);
    setError('');
    try {
      const result = await patchSpreadsheetCell({ id: row.id, field, value: next });
      setRows((prev) => prev.map((item) => (item.id === row.id ? result.row : item)));
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Active cats only. Edit a cell and leave it to save. Max 500 rows.
        </p>
        <Link to="/admin/kittens" className="text-sm font-semibold text-brand hover:underline">
          Back to cats
        </Link>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-3 py-2">ID</th>
              {COLUMNS.map((column) => (
                <th key={column.field} className="whitespace-nowrap px-3 py-2">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="sticky left-0 bg-white px-3 py-1 font-mono text-slate-500">
                  <Link to={`/admin/kittens/${row.id}`} className="text-brand hover:underline">
                    {row.externalId || row.id}
                  </Link>
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.field} className="px-1 py-1">
                    <input
                      key={`${row.id}:${column.field}:${toInputValue(row[column.field], column.type)}`}
                      defaultValue={toInputValue(row[column.field], column.type)}
                      type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                      disabled={savingKey === `${row.id}:${column.field}`}
                      onBlur={(event) => commitCell(row, column.field, column.type, event)}
                      className="min-w-[8rem] rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-brand focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default KittenSpreadsheetPage;
