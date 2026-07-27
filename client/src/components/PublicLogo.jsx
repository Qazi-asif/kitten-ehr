import { Link } from 'react-router-dom';

/**
 * Brand logo (paw + wordmark lockup from Pawsitive-logo assets).
 * Do not use Pawsitive.png — that file is a photo, not the logo.
 */
function PublicLogo({ className = '', size = 'nav', orgName = 'Pawsitive Transformations' }) {
  const isHero = size === 'hero';
  const imgClass = isHero
    ? 'h-20 w-auto object-contain sm:h-24 md:h-28'
    : 'h-12 w-auto object-contain sm:h-16 md:h-20';

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label={`${orgName} Home`}
    >
      <picture>
        <source srcSet="/images/Pawsitive-logo.webp" type="image/webp" />
        <img
          src="/images/Pawsitive-logo.jpg"
          alt={`${orgName} Logo`}
          width={320}
          height={160}
          decoding="async"
          className={imgClass}
        />
      </picture>
    </Link>
  );
}

export default PublicLogo;
