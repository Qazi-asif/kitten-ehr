import { CAPABILITY_LABELS, parseCapabilityFlags } from '../../utils/fosterCapabilities';

function FosterCapabilityBadges({ capabilityFlags }) {
  const flags = parseCapabilityFlags(capabilityFlags);

  if (flags.length === 0) {
    return <span className="text-sm text-slate-500">No special capabilities listed</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((flag) => (
        <span
          key={flag}
          className="inline-flex rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark"
        >
          {CAPABILITY_LABELS[flag] || flag.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

export default FosterCapabilityBadges;
