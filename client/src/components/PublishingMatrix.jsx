import { Check } from 'lucide-react';
import { getPublishPlatformLabel, normalizePublishTargets } from '../utils/publishTargets';

function PublishTargetBadges({ targets = [], emptyLabel = 'None' }) {
  const selected = normalizePublishTargets(targets);

  if (selected.length === 0) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        {emptyLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((target) => (
        <span
          key={target}
          className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100"
        >
          {getPublishPlatformLabel(target)}
        </span>
      ))}
    </div>
  );
}

function PublishingMatrix({
  currentTargets = [],
  onChange,
  title = 'Publishing Matrix',
  description = 'Select every platform where this content should appear.',
  compact = false,
}) {
  const selected = normalizePublishTargets(currentTargets);

  function togglePlatform(platformId) {
    const next = selected.includes(platformId)
      ? selected.filter((id) => id !== platformId)
      : [...selected, platformId];
    onChange(normalizePublishTargets(next));
  }

  const platforms = [
    { id: 'WEBSITE', label: 'Website', hint: 'Public website' },
    { id: 'FACEBOOK', label: 'Facebook', hint: 'Facebook page' },
    { id: 'INSTAGRAM', label: 'Instagram', hint: 'Instagram feed' },
    { id: 'X', label: 'X (Twitter)', hint: 'X / Twitter' },
    { id: 'TIKTOK', label: 'TikTok', hint: 'TikTok videos' },
  ];

  return (
    <div className={`rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 ${compact ? 'p-4' : 'p-5 shadow-sm'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Publishing Matrix</p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {selected.length}/{platforms.length} selected
        </div>
      </div>

      <div className={`mt-4 space-y-2 ${compact ? '' : ''}`}>
        {platforms.map((platform) => {
          const isActive = selected.includes(platform.id);
          return (
            <label
              key={platform.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    isActive ? 'border-white bg-white text-slate-900' : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {platform.label}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{platform.hint}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => togglePlatform(platform.id)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default PublishingMatrix;
export { PublishTargetBadges };
