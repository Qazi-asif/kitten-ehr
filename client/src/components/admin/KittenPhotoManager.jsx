import { Camera, Star, Trash2, Upload } from 'lucide-react';
import KittenPhoto from '../KittenPhoto';
import { getFileUrl } from '../../services/api';

function KittenPhotoManager({
  kitten,
  photos = [],
  editMode = false,
  uploading = false,
  onUploadFiles,
  onSetPrimary,
  onDeletePhoto,
}) {
  const galleryPhotos = photos.length > 0 ? photos : [];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <KittenPhoto kitten={kitten} allowFallback className="aspect-square w-full" />
        {editMode && (
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Add Photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length > 0) onUploadFiles?.(files);
                  event.target.value = '';
                }}
                className="sr-only"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Upload one or more photos. Choose which image is the public profile photo below.
            </p>
          </div>
        )}
      </div>

      {galleryPhotos.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Photo Gallery ({galleryPhotos.length})
            </h3>
            {!editMode && (
              <span className="text-xs text-slate-400">Shown on website and social posts</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {galleryPhotos.map((photo) => {
              const isPrimary =
                photo.isPrimaryPhoto || photo.fileUrl === kitten?.primaryPhotoUrl;
              return (
                <div
                  key={photo.id}
                  className={`group relative overflow-hidden rounded-lg border ${
                    isPrimary ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'
                  }`}
                >
                  <img
                    src={getFileUrl(photo.fileUrl)}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  {isPrimary && (
                    <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      <Star className="h-3 w-3 fill-white" />
                      Profile
                    </span>
                  )}
                  {editMode && (
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      {!isPrimary && photo.id !== 'primary' && photo.id !== 'legacy-primary' && (
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => onSetPrimary?.(photo.id)}
                          className="flex-1 rounded bg-white/90 px-1 py-1 text-[10px] font-semibold text-slate-800 hover:bg-white"
                        >
                          Set Profile
                        </button>
                      )}
                      {photo.id !== 'primary' && photo.id !== 'legacy-primary' && (
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => onDeletePhoto?.(photo.id)}
                          className="rounded bg-red-600 px-1.5 py-1 text-white hover:bg-red-700"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !editMode && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            <Camera className="h-4 w-4 shrink-0" />
            No gallery photos yet. Click Edit to add photos.
          </div>
        )
      )}
    </div>
  );
}

export default KittenPhotoManager;
