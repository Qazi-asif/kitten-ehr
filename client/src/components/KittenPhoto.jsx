import { memo, useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { getKittenFallbackImageUrl, getKittenImageUrl } from '../utils/kittenImages';

function KittenPhoto({ kitten, alt, className = '', allowFallback = false, ...props }) {
  const [src, setSrc] = useState(() => getKittenImageUrl(kitten, { allowFallback }));
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    setSrc(getKittenImageUrl(kitten, { allowFallback }));
    setUsedFallback(false);
  }, [kitten?.id, kitten?.primaryPhotoUrl, kitten?.name, allowFallback]);

  function handleError() {
    if (usedFallback) {
      setSrc(null);
      return;
    }

    const fallbackSrc = getKittenFallbackImageUrl(kitten);
    if (fallbackSrc && fallbackSrc !== src) {
      setUsedFallback(true);
      setSrc(fallbackSrc);
      return;
    }

    setSrc(null);
  }

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <Camera className="h-6 w-6" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || `${kitten?.name || 'Kitten'} photo`}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={handleError}
      {...props}
    />
  );
}

export default memo(KittenPhoto);
