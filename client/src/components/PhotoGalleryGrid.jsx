import { getFileUrl } from '../services/api';

function PhotoGalleryGrid({ photos = [], primaryPhotoUrl, title = 'Photos', compact = false }) {
  if (!photos.length && !primaryPhotoUrl) return null;

  const seen = new Set();
  const gallery = [];

  if (primaryPhotoUrl) {
    gallery.push({ id: 'primary', fileUrl: primaryPhotoUrl, isPrimaryPhoto: true });
    seen.add(primaryPhotoUrl);
  }

  for (const photo of photos) {
    if (seen.has(photo.fileUrl)) continue;
    gallery.push(photo);
    seen.add(photo.fileUrl);
  }

  if (gallery.length === 0) return null;

  const [hero, ...rest] = gallery;

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {gallery.map((photo) => (
          <img
            key={photo.id}
            src={getFileUrl(photo.fileUrl)}
            alt=""
            className={`h-20 w-20 shrink-0 rounded-lg object-cover ${
              photo.isPrimaryPhoto ? 'ring-2 ring-brand' : 'border border-slate-200'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          <img
            src={getFileUrl(hero.fileUrl)}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {rest.map((photo) => (
              <img
                key={photo.id}
                src={getFileUrl(photo.fileUrl)}
                alt=""
                className="aspect-square w-full rounded-lg border border-slate-100 object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default PhotoGalleryGrid;
