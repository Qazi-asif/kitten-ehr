import { Link } from 'react-router-dom';

function PublicLogo({ className = '', orgName = 'Pawsitive Transformations' }) {
  const words = orgName.trim().split(/\s+/);
  const primary = words[0] || 'Pawsitive';
  const secondary = words.slice(1).join(' ');

  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Home">
      <img
        src="/images/Pawsitive-01.jpeg"
        alt="Pawsitive Transformations Logo"
        className="h-20 sm:h-24 md:h-28 w-auto object-contain"
      />
    </Link>
  );
}

export default PublicLogo;
