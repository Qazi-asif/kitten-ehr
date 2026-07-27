import { Link } from 'react-router-dom';

/**
 * Horizontal brand lockup: paw LEFT, wordmark RIGHT.
 * Uses Pawsitive.png (paw mark) + text; falls back gracefully if image missing.
 */
function PublicLogo({ className = '', size = 'nav', orgName = 'Pawsitive Transformations' }) {
  const isHero = size === 'hero';
  const pawClass = isHero
    ? 'h-16 w-16 object-contain sm:h-20 sm:w-20 md:h-24 md:w-24'
    : 'h-11 w-11 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14';
  const textClass = isHero
    ? 'text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl'
    : 'text-base font-bold tracking-tight text-slate-900 sm:text-lg md:text-xl';

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-3 ${className}`}
      aria-label={`${orgName} Home`}
    >
      <img
        src="/images/Pawsitive.png"
        alt=""
        width={96}
        height={96}
        decoding="async"
        className={pawClass}
      />
      <span className={textClass}>
        {orgName}
      </span>
    </Link>
  );
}

export default PublicLogo;
