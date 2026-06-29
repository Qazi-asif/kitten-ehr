import { Link } from 'react-router-dom';

function PublicLogo({ className = '' }) {
  return (
    <Link to="/" className={`inline-block ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.35em] text-brand">pawsitive</span>
      <span className="block text-sm font-bold uppercase tracking-[0.2em] text-slate-800">Transformations</span>
    </Link>
  );
}

export default PublicLogo;
