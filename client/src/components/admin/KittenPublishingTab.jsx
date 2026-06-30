import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import KittenPrimaryPhotoForm from '../KittenPrimaryPhotoForm';
import {
  createSocialMediaPost,
  fetchKittenUpdates,
  updateKitten,
} from '../../services/api';

const SOCIAL_PLATFORMS = [
  { id: 'Facebook', label: 'Facebook' },
  { id: 'Instagram', label: 'Instagram' },
  { id: 'X (Twitter)', label: 'X (Twitter)' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parsePlatforms(platformList) {
  if (!platformList) return [];
  return platformList.split(',').map((p) => p.trim()).filter(Boolean);
}

function KittenPublishingTab({
  kittenId,
  kitten,
  setKitten,
  onPrimaryPhotoUpload,
  photoUploading,
}) {
  const [publishingForm, setPublishingForm] = useState({
    isListedOnWebsite: false,
    websiteFeaturedComment: '',
  });
  const [socialCaption, setSocialCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [postHistory, setPostHistory] = useState([]);
  const [savingPublishing, setSavingPublishing] = useState(false);
  const [postingSocial, setPostingSocial] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kitten) return;
    setPublishingForm({
      isListedOnWebsite: Boolean(kitten.isListedOnWebsite),
      websiteFeaturedComment: kitten.websiteFeaturedComment || '',
    });
  }, [kitten]);

  const loadPostHistory = useCallback(async () => {
    const updates = await fetchKittenUpdates(kittenId);
    setPostHistory(updates.filter((entry) => entry.platformList));
  }, [kittenId]);

  useEffect(() => {
    loadPostHistory().catch(() => setPostHistory([]));
  }, [loadPostHistory]);

  async function handleToggleWebsiteListing() {
    const nextValue = !publishingForm.isListedOnWebsite;
    setSavingPublishing(true);
    setError('');
    try {
      const updated = await updateKitten(kittenId, { isListedOnWebsite: nextValue });
      setKitten(updated);
      setPublishingForm((prev) => ({ ...prev, isListedOnWebsite: nextValue }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPublishing(false);
    }
  }

  async function handleSaveWebsiteDetails(event) {
    event.preventDefault();
    setSavingPublishing(true);
    setError('');
    try {
      const updated = await updateKitten(kittenId, {
        websiteFeaturedComment: publishingForm.websiteFeaturedComment,
      });
      setKitten(updated);
      setPublishingForm((prev) => ({
        ...prev,
        websiteFeaturedComment: updated.websiteFeaturedComment || '',
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPublishing(false);
    }
  }

  function togglePlatform(platformId) {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId],
    );
  }

  async function handleSocialPost(event) {
    event.preventDefault();
    if (!socialCaption.trim()) {
      setError('Write a social media caption before posting.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Select at least one platform.');
      return;
    }

    setPostingSocial(true);
    setError('');
    try {
      await createSocialMediaPost(kittenId, {
        content: socialCaption.trim(),
        platforms: selectedPlatforms,
      });

      const platformLabels = selectedPlatforms.join(' & ');
      window.alert(`Posted to ${platformLabels}!`);

      setSocialCaption('');
      setSelectedPlatforms([]);
      await loadPostHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setPostingSocial(false);
    }
  }

  const platformSummary = useMemo(
    () => postHistory.reduce((count, entry) => count + parsePlatforms(entry.platformList).length, 0),
    [postHistory],
  );

  if (!kitten) return null;

  return (
    <div className="space-y-8">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Website Visibility</h3>
        <p className="mt-1 text-sm text-gray-500">
          Control whether this kitten appears on the public adoption site.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div>
            <p className="text-base font-semibold text-gray-900">List on Website</p>
            <p className="text-sm text-gray-500">
              {publishingForm.isListedOnWebsite
                ? 'This kitten is visible on the public site.'
                : 'Hidden from the public site.'}
            </p>
          </div>
          <button
            type="button"
            disabled={savingPublishing}
            onClick={handleToggleWebsiteListing}
            className={`relative h-8 w-14 rounded-full transition-colors ${
              publishingForm.isListedOnWebsite ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
            aria-label="Toggle website listing"
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                publishingForm.isListedOnWebsite ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <form onSubmit={handleSaveWebsiteDetails} className="mt-5 space-y-5">
          <KittenPrimaryPhotoForm
            kitten={kitten}
            currentPhotoUrl={kitten.primaryPhotoUrl}
            onUpload={onPrimaryPhotoUpload}
            uploading={photoUploading}
          />

          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Website Featured Comment</span>
            <textarea
              rows={3}
              value={publishingForm.websiteFeaturedComment}
              onChange={(e) =>
                setPublishingForm((prev) => ({ ...prev, websiteFeaturedComment: e.target.value }))
              }
              placeholder="A short, cute description for the public profile..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingPublishing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingPublishing ? 'Saving...' : 'Save Website Details'}
            </button>
            {publishingForm.isListedOnWebsite && (
              <Link
                to={`/kittens/${kitten.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
              >
                Preview Public Profile
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Social Media Composer</h3>
        <p className="mt-1 text-sm text-gray-500">
          Compose a caption and log simulated posts. Real platform APIs will be connected later.
        </p>

        <form onSubmit={handleSocialPost} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Social Media Caption</span>
            <textarea
              rows={5}
              value={socialCaption}
              onChange={(e) => setSocialCaption(e.target.value)}
              placeholder="Write a catchy caption for Facebook, Instagram, or X..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <fieldset>
            <legend className="text-xs font-semibold uppercase text-gray-500">Platforms</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <label key={platform.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                    className="rounded border-gray-300"
                  />
                  {platform.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={postingSocial}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {postingSocial ? 'Posting...' : 'Post to Selected Platforms'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Post History Log</h3>
            <p className="mt-1 text-sm text-gray-500">
              {postHistory.length} social post{postHistory.length === 1 ? '' : 's'} · {platformSummary} platform pushes logged
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Caption Preview</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Platforms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {postHistory.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    No social posts logged yet.
                  </td>
                </tr>
              ) : (
                postHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {entry.content.length > 120 ? `${entry.content.slice(0, 120)}…` : entry.content}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {parsePlatforms(entry.platformList).map((platform) => (
                          <span
                            key={`${entry.id}-${platform}`}
                            className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default KittenPublishingTab;
