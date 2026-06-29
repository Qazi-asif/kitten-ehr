import { useEffect, useState } from 'react';
import { Camera, Upload } from 'lucide-react';

function ProfilePhotoUpload({
  currentPhotoUrl,
  onFileSelect,
  label = 'Profile Photo',
  hint = 'Upload a photo for the public profile and adoption cards. JPG or PNG recommended.',
  required = false,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPreviewUrl(currentPhotoUrl || null);
    return undefined;
  }, [file, currentPhotoUrl]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    onFileSelect?.(selected);
  }

  const displayUrl = previewUrl;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="mx-auto shrink-0 sm:mx-0">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile preview"
              className="h-40 w-40 rounded-2xl border border-slate-200 object-cover shadow-sm sm:h-44 sm:w-44"
            />
          ) : (
            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-400 sm:h-44 sm:w-44">
              <Camera className="h-8 w-8" />
              <span className="mt-2 text-xs font-medium">No photo yet</span>
            </div>
          )}
        </div>

        <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/40 bg-brand-light/40 px-6 py-8 text-center transition-colors hover:border-brand hover:bg-brand-light">
          <Upload className="h-7 w-7 text-brand" />
          <span className="mt-3 text-sm font-semibold text-brand">Choose profile photo</span>
          <span className="mt-1 text-xs text-slate-500">Click to browse your files</span>
          <input
            type="file"
            accept="image/*"
            required={required && !displayUrl}
            onChange={handleFileChange}
            className="sr-only"
          />
          {file && (
            <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              {file.name}
            </span>
          )}
        </label>
      </div>
    </div>
  );
}

export default ProfilePhotoUpload;
