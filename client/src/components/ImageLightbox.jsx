import { useEffect } from 'react';
import { Download, X, ZoomIn } from 'lucide-react';

/**
 * Full-screen viewer for uploaded image documents.
 *
 * Documents like vaccination certificates are only useful if they can be read,
 * so previews stay large and open to full size on click.
 */
function ImageLightbox({ src, alt = 'Document', downloadName, onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 pb-3 text-white">
        <p className="truncate text-sm font-medium">{alt}</p>
        <div className="flex items-center gap-2">
          <a
            href={src}
            download={downloadName || alt}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            <Download size={14} aria-hidden="true" />
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            <X size={14} aria-hidden="true" />
            Close
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <img
          src={src}
          alt={alt}
          onClick={(event) => event.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>
  );
}

/** Clickable preview that opens the lightbox. Pair with `useImageLightbox`. */
export function ImageLightboxTrigger({ src, alt, className = '', onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.({ src, alt })}
      title="Click to view full size"
      className={`group relative block overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${className}`}
    >
      <img src={src} alt={alt} className="h-full w-full object-contain" />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900">
          <ZoomIn size={14} aria-hidden="true" />
          View full size
        </span>
      </span>
    </button>
  );
}

export default ImageLightbox;
