import { Link } from 'react-router-dom';
import KittenPhoto from './KittenPhoto';
import { formatKittenAgeShort } from '../utils/kittenAge';

function PublicKittenCard({ kitten }) {
  // CR-92: single shared age helper everywhere — was previously a duplicate,
  // divergent formula that only ever showed months (e.g. "2 months old").
  const rawAge = formatKittenAgeShort(kitten.dateOfBirth);
  const age = rawAge && rawAge !== '—' ? `${rawAge} old` : null;
  const bondedLabel = kitten.bondedWithKitten?.name || kitten.bondedWithName;

  const profilePath = `/kittens/${kitten.id}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,168,158,0.15)]">
      <Link to={profilePath} className="block" aria-label={`View ${kitten.name || 'kitten'} profile`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
          <KittenPhoto
            kitten={kitten}
            allowFallback
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 pt-16">
            <h3 className="text-xl font-bold text-white">{kitten.name}</h3>
            <p className="mt-1 text-sm text-white/85">
              {kitten.breed}{kitten.color ? ` · ${kitten.color}` : ''}
            </p>
          </div>
          {kitten.status === 'Available for Adoption' && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand shadow-sm">
              Available
            </span>
          )}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {kitten.status === 'In Foster Care' && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              In Foster Care
            </span>
          )}
          {kitten.sex && (
            <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand-dark">
              {kitten.sex}
            </span>
          )}
          {age && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {age}
            </span>
          )}
          {kitten.isBondedPair && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              Bonded Pair{bondedLabel ? ` · ${bondedLabel}` : ''}
            </span>
          )}
          {kitten.isMedicalSpecialNeeds && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              Medical / Special Needs
            </span>
          )}
        </div>
        {kitten.rescueStory && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{kitten.rescueStory}</p>
        )}
        <Link
          to={profilePath}
          className="mt-5 inline-block w-full rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Meet Me
        </Link>
      </div>
    </article>
  );
}

export default PublicKittenCard;
