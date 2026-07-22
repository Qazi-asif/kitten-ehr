import { useCallback, useEffect, useState } from 'react';
import PortalNav from '../../components/portal/PortalNav';
import ProfilePhotoUpload from '../../components/ProfilePhotoUpload';
import { fetchMyProfile, updateMyProfile } from '../../services/portalDataApi';

const emptyForm = {
  phone: '',
  address: '',
  emergencyContact: '',
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

// Foster self-service profile: only phone/address/emergencyContact/photoUrl
// are editable here (enforced again server-side in updateMyProfile) - name,
// email, maxKittens, capabilityFlags, experienceLevel, and isActive stay
// staff-managed and are shown read-only for context.
function PortalProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyProfile();
      setProfile(data);
      setForm({
        phone: data.phone ?? '',
        address: data.address ?? '',
        emergencyContact: data.emergencyContact ?? '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const payload = { ...form };
      if (photoFile) {
        payload.photoUrl = await readFileAsDataUrl(photoFile);
      }
      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setPhotoFile(null);
      setSuccessMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Failed to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-muted">
      <PortalNav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Keep your contact info current. Other details are managed by our team.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Account Info</h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Name</dt>
                  <dd className="text-sm font-medium text-slate-900">{profile?.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="text-sm font-medium text-slate-900">{profile?.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Experience Level</dt>
                  <dd className="text-sm font-medium text-slate-900">{profile?.experienceLevel || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Max Kittens</dt>
                  <dd className="text-sm font-medium text-slate-900">{profile?.maxKittens ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="text-sm font-medium text-slate-900">{profile?.isActive ? 'Active' : 'Inactive'}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                Contact our team if any of this needs to change.
              </p>
            </div>

            <ProfilePhotoUpload
              currentPhotoUrl={profile?.photoUrl}
              onFileSelect={setPhotoFile}
              label="My Photo"
              hint="Shared with staff on your foster profile."
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Contact Info</h2>
              <div className="mt-3 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Emergency Contact</span>
                  <input
                    name="emergencyContact"
                    value={form.emergencyContact}
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default PortalProfilePage;
