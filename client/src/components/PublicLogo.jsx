import { Link } from 'react-router-dom';

function PublicLogo({ className = '', orgName = 'Pawsitive Transformations' }) {
  const words = orgName.trim().split(/\s+/);
  const primary = words[0] || 'Pawsitive';
  const secondary = words.slice(1).join(' ');

  return (
    <Link to="/" className={`inline-block ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.35em] text-brand">{primary}</span>
      {secondary ? (
        <span className="block text-sm font-bold uppercase tracking-[0.2em] text-slate-800">{secondary}</span>
      ) : null}
    </Link>
  );
}

export default PublicLogo;
