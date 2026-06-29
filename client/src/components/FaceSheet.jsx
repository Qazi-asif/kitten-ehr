import KittenPhoto from './KittenPhoto';

function FaceSheetRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-300 py-2 text-sm">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="col-span-2 text-gray-900">{value || '—'}</dd>
    </div>
  );
}

function FaceSheet({ kitten, activeMedications, formatDate }) {
  return (
    <div className="hidden print:block">
      <div className="mx-auto max-w-3xl p-8 font-sans text-gray-900">
        <header className="mb-6 border-b-2 border-gray-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pawsitive Transformations</p>
          <h1 className="mt-1 text-2xl font-bold">Kitten Face Sheet</h1>
          <p className="mt-1 text-sm text-gray-600">Printed {new Date().toLocaleDateString()}</p>
        </header>

        <div className="mb-6 flex gap-6">
          <KittenPhoto
            kitten={kitten}
            allowFallback
            className="h-32 w-32 shrink-0 rounded-lg border-2 border-gray-300"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{kitten.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{kitten.breed} · {kitten.color || 'Mixed'}</p>
          </div>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wide">
            Patient Information
          </h3>
          <dl>
            <FaceSheetRow label="Status" value={kitten.status} />
            <FaceSheetRow label="Date of Birth" value={formatDate(kitten.dateOfBirth)} />
            <FaceSheetRow label="Sex" value={kitten.sex} />
            <FaceSheetRow label="Breed" value={kitten.breed} />
            <FaceSheetRow label="Color" value={kitten.color} />
            <FaceSheetRow label="Microchip" value={kitten.microchipNumber} />
            <FaceSheetRow label="Special Needs" value={kitten.specialNeeds} />
          </dl>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wide">
            Current Foster
          </h3>
          <dl>
            <FaceSheetRow label="Name" value={kitten.currentFoster?.name} />
            <FaceSheetRow label="Phone" value={kitten.currentFoster?.phone} />
          </dl>
        </section>

        <section>
          <h3 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wide">
            Active Medications
          </h3>
          {activeMedications.length === 0 ? (
            <p className="text-sm text-gray-600">None recorded.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-400 text-left">
                  <th className="py-2 pr-4 font-semibold">Medication</th>
                  <th className="py-2 pr-4 font-semibold">Dose</th>
                  <th className="py-2 pr-4 font-semibold">Frequency</th>
                  <th className="py-2 font-semibold">Route</th>
                </tr>
              </thead>
              <tbody>
                {activeMedications.map((med) => (
                  <tr key={med.id} className="border-b border-gray-200">
                    <td className="py-2 pr-4">{med.name}</td>
                    <td className="py-2 pr-4">{med.dose || '—'}</td>
                    <td className="py-2 pr-4">{med.frequency || '—'}</td>
                    <td className="py-2">{med.route || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default FaceSheet;
