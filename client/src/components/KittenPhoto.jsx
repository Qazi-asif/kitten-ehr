import { Camera } from 'lucide-react';
import { getKittenImageUrl } from '../utils/kittenImages';

function KittenPhoto({ kitten, alt, className = '', allowFallback = false, ...props }) {
  const src = getKittenImageUrl(kitten, { allowFallback });

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
      {...props}
    />
  );
}

export default KittenPhoto;
