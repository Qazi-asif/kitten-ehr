import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import KittenPhoto from './KittenPhoto';
import { formatKittenAge } from '../utils/kittenImages';

function PublicKittenCard({ kitten }) {
  const age = formatKittenAge(kitten.dateOfBirth);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,168,158,0.15)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
        <KittenPhoto
          kitten={kitten}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 pt-16">
          <h3 className="text-xl font-bold text-white">{kitten.name}</h3>
          <p className="mt-1 text-sm text-white/85">
            {kitten.breed}{kitten.color ? ` · ${kitten.color}` : ''}
          </p>
        </div>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand shadow-sm">
          <Heart className="h-3 w-3 fill-brand text-brand" />
          Available
        </span>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
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
          {kitten.fixedStatus && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {kitten.fixedStatus}
            </span>
          )}
        </div>
        {kitten.rescueStory && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{kitten.rescueStory}</p>
        )}
        <Link
          to={`/kittens/${kitten.id}`}
          className="mt-5 inline-block w-full rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Meet Me
        </Link>
      </div>
    </article>
  );
}

export default PublicKittenCard;
