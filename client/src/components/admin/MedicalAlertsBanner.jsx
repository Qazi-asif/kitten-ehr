function MedicalAlertsBanner({ flags = [], dismissed = false, onDismiss }) {
  if (dismissed || !flags.length) return null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3">
      <div>
        <p className="text-sm font-bold text-red-800">Medical Alerts</p>
        <ul className="mt-1 list-inside list-disc text-sm text-red-700">
          {flags.map((flag) => (
            <li key={`${flag.type}-${flag.label}`}>{flag.label}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
      >
        Dismiss
      </button>
    </div>
  );
}

export default MedicalAlertsBanner;
