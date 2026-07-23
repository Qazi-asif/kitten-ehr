import { Link } from 'react-router-dom';

function PublicLogo({ className = '' }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Home">
      <picture>
        <source srcSet="/images/Pawsitive-logo.webp" type="image/webp" />
        <img
          src="/images/Pawsitive-logo.jpg"
          alt="Pawsitive Transformations Logo"
          width={320}
          height={160}
          decoding="async"
          className="h-12 w-auto object-contain sm:h-16 md:h-20"
        />
      </picture>
    </Link>
  );
}

export default PublicLogo;
