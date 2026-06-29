import { useState } from 'react';
import { getFileUrl } from '../services/api';
import ProfilePhotoUpload from './ProfilePhotoUpload';

function KittenPrimaryPhotoForm({ kitten, currentPhotoUrl, onUpload, uploading }) {
  const [file, setFile] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    onUpload(file);
    setFile(null);
  }

  const previewUrl = currentPhotoUrl ? getFileUrl(currentPhotoUrl) : null;

  return (
    <div className="space-y-4">
      <ProfilePhotoUpload
        currentPhotoUrl={previewUrl}
        onFileSelect={setFile}
        label="Profile Photo"
        hint="This photo appears on the public profile, adoption cards, and admin dashboard."
      />
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={uploading || !file}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {uploading ? 'Uploading photo...' : 'Save Profile Photo'}
        </button>
      </form>
    </div>
  );
}

export default KittenPrimaryPhotoForm;
