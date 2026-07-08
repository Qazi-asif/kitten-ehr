import { useMemo, useState } from 'react';

function KittenSearchMultiSelect({
  kittens = [],
  selectedIds = [],
  onChange,
  disabled = false,
}) {
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const filteredKittens = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return kittens;
    return kittens.filter((kitten) => kitten.name?.toLowerCase().includes(trimmed));
  }, [kittens, query]);

  const selectedKittens = useMemo(
    () => kittens.filter((kitten) => selectedSet.has(String(kitten.id))),
    [kittens, selectedSet],
  );

  function toggleKitten(id) {
    if (disabled) return;
    const key = String(id);
    const next = selectedSet.has(key)
      ? selectedIds.filter((value) => String(value) !== key)
      : [...selectedIds, id];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Featured Kittens</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search kittens to tag..."
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      </label>

      {selectedKittens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedKittens.map((kitten) => (
            <button
              key={kitten.id}
              type="button"
              onClick={() => toggleKitten(kitten.id)}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-60"
            >
              {kitten.name}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {filteredKittens.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">No kittens match your search.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredKittens.map((kitten) => {
              const checked = selectedSet.has(String(kitten.id));
              return (
                <li key={kitten.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKitten(kitten.id)}
                      disabled={disabled}
                      className="rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <span className="font-medium text-slate-800">{kitten.name}</span>
                    {kitten.status && (
                      <span className="text-xs text-slate-500">{kitten.status}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default KittenSearchMultiSelect;
