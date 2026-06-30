import { getFileUrl } from '../services/api';

function FosterPhoto({ foster, alt, className = '', allowFallback = false, ...props }) {
  const src = foster?.photoUrl ? getFileUrl(foster.photoUrl) : null;

  if (!src && allowFallback) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-200 text-slate-500 ${className}`}
        {...props}
      >
        <span className="text-2xl font-bold">{foster?.name?.[0] || 'F'}</span>
      </div>
    );
  }

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt || `${foster?.name || 'Foster'} photo`}
      className={`object-cover ${className}`}
      {...props}
    />
  );
}

export default FosterPhoto;
