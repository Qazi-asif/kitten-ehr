import LitterSelect from './LitterSelect';

function LitterGroupsPanel({ litters, kittens, litterFilter, onLittersChange, onFilterChange }) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Litter Groups</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Group kittens from the same intake. Assign a group when adding a kitten or on the kitten profile page.
          </p>
        </div>
        {litterFilter && (
          <button
            type="button"
            onClick={() => onFilterChange('')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear litter filter
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Create a litter group</h3>
          <p className="mt-1 text-xs text-slate-500">Use this before linking kittens, or create while adding a kitten.</p>
          <LitterSelect
            value=""
            litters={litters}
            onChange={() => {}}
            onLittersChange={onLittersChange}
            className="mt-3"
          />
        </div>

        <div className="rounded-lg border border-white bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Existing groups {litters.length > 0 ? `(${litters.length})` : ''}
          </h3>
          {litters.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No litter groups yet. Create one on the left.</p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {litters.map((litter) => {
                const count =
                  litter._count?.kittens ?? kittens.filter((k) => k.litter?.id === litter.id).length;
                const isActive = litterFilter === String(litter.id);
                return (
                  <li
                    key={litter.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                      isActive ? 'border-brand bg-brand-light/40' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{litter.name}</p>
                      <p className="text-xs text-slate-500">
                        Intake {new Date(litter.intakeDate).toLocaleDateString()} · {count} kitten(s)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFilterChange(isActive ? '' : String(litter.id))}
                      className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isActive ? 'Show all' : 'Filter'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default LitterGroupsPanel;
