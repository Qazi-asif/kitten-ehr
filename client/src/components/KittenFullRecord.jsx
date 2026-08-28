import KittenPhoto from './KittenPhoto';
import { formatPacificDisplay } from '../utils/pacificDate.js';
import { formatKittenAgeShort } from '../utils/kittenAge';

/**
 * CR-105: the complete cat record as a single printable document.
 *
 * The on-screen panel mounts only the active tab, so `window.print()` could
 * never capture more than whichever tab happened to be open. This component
 * renders every section from data the panel has already loaded, independent of
 * which tab is selected, and is visible only to the printer.
 */

function fmt(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

function fmtDate(value) {
  return value ? formatPacificDisplay(value) : '—';
}

function fmtDateTime(value) {
  return value ? formatPacificDisplay(value, { withTime: true }) : '—';
}

function Section({ title, children, count }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b-2 border-gray-800 pb-1 text-sm font-bold uppercase tracking-wide text-gray-900">
        {title}
        {count != null && <span className="ml-2 font-normal text-gray-500">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children = 'None on record.' }) {
  return <p className="py-2 text-xs italic text-gray-500">{children}</p>;
}

function Table({ columns, rows, renderRow }) {
  if (!rows || rows.length === 0) return <Empty />;
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column}
              className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold text-gray-700"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </table>
  );
}

function Cell({ children }) {
  return <td className="border border-gray-300 px-2 py-1 align-top text-gray-800">{children}</td>;
}

function FieldRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-200 py-1 text-xs">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="col-span-2 text-gray-900">{fmt(value)}</dd>
    </div>
  );
}

function KittenFullRecord({
  kitten,
  medical = { vaccines: [], medications: [], vetAppointments: [] },
  weightLogs = [],
  updates = [],
  documents = [],
  placements = [],
  contracts = [],
}) {
  if (!kitten) return null;

  const vaccines = medical.vaccines || [];
  const medications = medical.medications || [];
  const vetAppointments = medical.vetAppointments || [];
  const latestWeight = weightLogs[0];

  return (
    <div className="hidden bg-white p-6 text-gray-900 print:block">
      <header className="flex items-start justify-between gap-4 border-b-4 border-gray-900 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Pawsitive Transformations
          </p>
          <h1 className="mt-1 text-2xl font-bold">{kitten.name} — Complete Record</h1>
          <p className="mt-1 text-xs text-gray-600">
            Printed {formatPacificDisplay(new Date(), { withTime: true })} (US Pacific)
          </p>
        </div>
        {kitten.primaryPhotoUrl && (
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded border border-gray-300">
            <KittenPhoto kitten={kitten} className="h-full w-full object-cover" />
          </div>
        )}
      </header>

      <Section title="Profile">
        <div className="grid grid-cols-2 gap-x-8">
          <dl>
            <FieldRow label="Name" value={kitten.name} />
            <FieldRow label="Status" value={kitten.status} />
            <FieldRow label="Sex" value={kitten.sex} />
            <FieldRow label="Breed" value={kitten.breed} />
            <FieldRow label="Coat Color" value={kitten.color} />
            <FieldRow label="Date of Birth" value={fmtDate(kitten.dateOfBirth)} />
            <FieldRow label="Age" value={formatKittenAgeShort(kitten.dateOfBirth)} />
          </dl>
          <dl>
            <FieldRow label="Spay/Neuter" value={kitten.fixedStatus || 'Unknown'} />
            <FieldRow label="FIV/FeLV" value={kitten.fivFelvStatus} />
            <FieldRow label="Microchip" value={kitten.microchipNumber} />
            <FieldRow label="Intake Date" value={fmtDate(kitten.intakeDate)} />
            <FieldRow label="Intake Source" value={kitten.intakeSource} />
            <FieldRow label="Outcome Date" value={fmtDate(kitten.outcomeDate)} />
            <FieldRow label="Current Weight" value={latestWeight ? `${Math.round(latestWeight.weightGrams)} g` : '—'} />
          </dl>
        </div>
        {kitten.currentFoster && (
          <div className="mt-2 rounded border border-gray-300 bg-gray-50 p-2 text-xs">
            <p className="font-semibold text-gray-700">Current Foster</p>
            <p className="text-gray-800">
              {fmt(kitten.currentFoster.name)}
              {kitten.currentFoster.phone ? ` · ${kitten.currentFoster.phone}` : ''}
              {kitten.currentFoster.email ? ` · ${kitten.currentFoster.email}` : ''}
            </p>
          </div>
        )}
        {kitten.specialNeeds && (
          <p className="mt-2 rounded border border-gray-300 bg-gray-50 p-2 text-xs">
            <span className="font-semibold">Special Needs: </span>
            {kitten.specialNeeds}
          </p>
        )}
      </Section>

      <Section title="Vaccinations" count={vaccines.length}>
        <Table
          columns={['Type', 'Date Given', 'Next Due', 'Lot #', 'Administered By', 'Notes']}
          rows={vaccines}
          renderRow={(v) => (
            <tr key={v.id}>
              <Cell>{fmt(v.type)}</Cell>
              <Cell>{fmtDate(v.dateGiven)}</Cell>
              <Cell>{fmtDate(v.nextDueDate)}</Cell>
              <Cell>{fmt(v.lotNumber)}</Cell>
              <Cell>{fmt(v.administeredBy)}</Cell>
              <Cell>{fmt(v.notes)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Medications" count={medications.length}>
        <Table
          columns={['Name', 'Dose', 'Frequency', 'Route', 'Start', 'End', 'Status']}
          rows={medications}
          renderRow={(m) => (
            <tr key={m.id}>
              <Cell>{fmt(m.name)}</Cell>
              <Cell>{fmt(m.dose)}</Cell>
              <Cell>{fmt(m.frequency)}</Cell>
              <Cell>{fmt(m.route)}</Cell>
              <Cell>{fmtDate(m.startDate)}</Cell>
              <Cell>{fmtDate(m.endDate)}</Cell>
              <Cell>{fmt(m.status)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Vet Visits" count={vetAppointments.length}>
        <Table
          columns={['Date', 'Clinic', 'Vet', 'Reason', 'Diagnosis', 'Treatment', 'Follow-Up']}
          rows={vetAppointments}
          renderRow={(a) => (
            <tr key={a.id}>
              <Cell>{fmtDate(a.date)}</Cell>
              <Cell>{fmt(a.clinic)}</Cell>
              <Cell>{fmt(a.vetName)}</Cell>
              <Cell>{fmt(a.reason)}</Cell>
              <Cell>{fmt(a.diagnosis)}</Cell>
              <Cell>{fmt(a.treatment)}</Cell>
              <Cell>{fmtDate(a.followUpDate)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Weight History" count={weightLogs.length}>
        <Table
          columns={['Date & Time', 'Weight (g)', 'Logged By', 'Notes']}
          rows={weightLogs}
          renderRow={(w) => (
            <tr key={w.id}>
              <Cell>{fmtDateTime(w.date)}</Cell>
              <Cell>{Math.round(w.weightGrams)}</Cell>
              <Cell>{fmt(w.loggedBy)}</Cell>
              <Cell>{fmt(w.notes)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Placements" count={placements.length}>
        <Table
          columns={['Foster', 'Placed', 'Discharged', 'Discharge Type', 'Notes']}
          rows={placements}
          renderRow={(p) => (
            <tr key={p.id}>
              <Cell>{fmt(p.foster?.name ?? p.fosterName)}</Cell>
              <Cell>{fmtDate(p.intakeDate)}</Cell>
              <Cell>{fmtDate(p.dischargeDate)}</Cell>
              <Cell>{fmt(p.dischargeType)}</Cell>
              <Cell>{fmt(p.notes)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Contracts" count={contracts.length}>
        <Table
          columns={['Type', 'Status', 'Signer', 'Signed']}
          rows={contracts}
          renderRow={(c) => (
            <tr key={c.id}>
              <Cell>{fmt(c.templateKey ?? c.type)}</Cell>
              <Cell>{fmt(c.status)}</Cell>
              <Cell>{fmt(c.signerName ?? c.personName)}</Cell>
              <Cell>{fmtDateTime(c.signedAt)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Documents" count={documents.length}>
        <Table
          columns={['File Name', 'Type', 'Description', 'Uploaded']}
          rows={documents}
          renderRow={(d) => (
            <tr key={d.id}>
              <Cell>{fmt(d.fileName)}</Cell>
              <Cell>{fmt(d.docType)}</Cell>
              <Cell>{fmt(d.description)}</Cell>
              <Cell>{fmtDate(d.uploadedAt)}</Cell>
            </tr>
          )}
        />
      </Section>

      <Section title="Updates" count={updates.length}>
        {updates.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {updates.map((update) => (
              <li key={update.id} className="break-inside-avoid border-b border-gray-200 pb-2 text-xs">
                <p className="font-semibold text-gray-700">
                  {fmtDate(update.createdAt ?? update.date)}
                  {update.title ? ` — ${update.title}` : ''}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-gray-800">{fmt(update.content ?? update.body)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Notes">
        {kitten.notes || kitten.internalNotes ? (
          <div className="space-y-2 text-xs">
            {kitten.notes && (
              <div>
                <p className="font-semibold text-gray-700">General</p>
                <p className="whitespace-pre-wrap text-gray-800">{kitten.notes}</p>
              </div>
            )}
            {kitten.internalNotes && (
              <div>
                <p className="font-semibold text-gray-700">Internal</p>
                <p className="whitespace-pre-wrap text-gray-800">{kitten.internalNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <Empty>No notes recorded.</Empty>
        )}
      </Section>

      {kitten.rescueStory && (
        <Section title="Rescue Story">
          <p className="whitespace-pre-wrap text-xs text-gray-800">{kitten.rescueStory}</p>
        </Section>
      )}
    </div>
  );
}

export default KittenFullRecord;
