import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Sparkles, Upload } from 'lucide-react';
import PublishingMatrix from '../PublishingMatrix';
import {
  createSocialMediaPost,
  fetchKittenUpdates,
  getFileUrl,
  updateKitten,
  uploadKittenPhoto,
} from '../../services/api';
import {
  getDeliveryStatusLabel,
  getPublishPlatformLabel,
  normalizePublishTargets,
  parseSocialDeliveryLog,
  resolvePublishTargets,
  resolveUpdateTargets,
} from '../../utils/publishTargets';
import {
  buildFacebookShareUrl,
  buildMockAiCaption,
  buildTwitterShareUrl,
  copyCaptionToClipboard,
  getPublicKittenUrl,
  openShareWindow,
} from '../../utils/smartShare';

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

function ShareButton({ label, sublabel, className, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl px-4 py-5 text-center text-white shadow-md transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className="text-base font-bold">{label}</span>
      <span className="mt-1 text-xs font-medium text-white/80">{sublabel}</span>
    </button>
  );
}

function KittenPublishingTab({ kittenId, kitten, galleryPhotos = [], setKitten }) {
  const [publishingForm, setPublishingForm] = useState({
    publishTargets: [],
    websiteFeaturedComment: '',
  });
  const [socialCaption, setSocialCaption] = useState('');
  const [selectedPhotoKey, setSelectedPhotoKey] = useState('');
  const [extraSocialPhotos, setExtraSocialPhotos] = useState([]);
  const [postHistory, setPostHistory] = useState([]);
  const [savingPublishing, setSavingPublishing] = useState(false);
  const [sharingPlatform, setSharingPlatform] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const uploadInputRef = useRef(null);

  useEffect(() => {
    if (!kitten) return;
    setPublishingForm({
      publishTargets: resolvePublishTargets(kitten),
      websiteFeaturedComment: kitten.websiteFeaturedComment || '',
    });
  }, [kitten]);

  const loadPostHistory = useCallback(async () => {
    const updates = await fetchKittenUpdates(kittenId);
    setPostHistory(updates.filter((entry) => resolveUpdateTargets(entry).length > 0));
  }, [kittenId]);

  useEffect(() => {
    loadPostHistory().catch(() => setPostHistory([]));
  }, [loadPostHistory]);

  const photoOptions = useMemo(() => {
    const seen = new Set();
    const items = [];

    if (kitten?.primaryPhotoUrl) {
      items.push({
        key: 'primary',
        label: 'Primary profile photo',
        fileUrl: kitten.primaryPhotoUrl,
      });
      seen.add(kitten.primaryPhotoUrl);
    }

    galleryPhotos.forEach((photo, index) => {
      if (seen.has(photo.fileUrl)) return;
      items.push({
        key: String(photo.id ?? `gallery-${index}`),
        label: photo.fileName || `Gallery photo ${index + 1}`,
        fileUrl: photo.fileUrl,
      });
      seen.add(photo.fileUrl);
    });

    extraSocialPhotos.forEach((photo) => {
      items.push(photo);
    });

    return items;
  }, [extraSocialPhotos, galleryPhotos, kitten?.primaryPhotoUrl]);

  useEffect(() => {
    if (photoOptions.length === 0) {
      setSelectedPhotoKey('');
      return;
    }
    if (!photoOptions.some((photo) => photo.key === selectedPhotoKey)) {
      setSelectedPhotoKey(photoOptions[0].key);
    }
  }, [photoOptions, selectedPhotoKey]);

  const selectedPhoto = photoOptions.find((photo) => photo.key === selectedPhotoKey) ?? null;
  const listedOnWebsite = publishingForm.publishTargets.includes('WEBSITE');
  const publicKittenUrl = getPublicKittenUrl(kitten?.id);

  async function handleSavePublishingSettings(event) {
    event.preventDefault();
    setSavingPublishing(true);
    setError('');
    try {
      const updated = await updateKitten(kittenId, {
        publishTargets: publishingForm.publishTargets,
        websiteFeaturedComment: publishingForm.websiteFeaturedComment,
      });
      setKitten(updated);
      setPublishingForm({
        publishTargets: resolvePublishTargets(updated),
        websiteFeaturedComment: updated.websiteFeaturedComment || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPublishing(false);
    }
  }

  function handleGenerateCaption() {
    const mockLine = buildMockAiCaption(kitten.name || 'this kitten');
    setSocialCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n${mockLine}` : mockLine));
  }

  async function handleSocialPhotoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingPhoto(true);
    setError('');
    try {
      const uploaded = await uploadKittenPhoto(kittenId, file, { setAsPrimary: false });
      const photoKey = `social-${uploaded.photo?.id ?? Date.now()}`;
      setExtraSocialPhotos((prev) => [
        ...prev,
        {
          key: photoKey,
          label: uploaded.photo?.fileName || 'New social photo',
          fileUrl: uploaded.photo?.fileUrl,
        },
      ]);
      setSelectedPhotoKey(photoKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function logSmartShare(platform) {
    await createSocialMediaPost(kittenId, {
      content: socialCaption.trim(),
      publishTargets: [platform],
    });
    await loadPostHistory();
  }

  async function handleSmartShare(platform) {
    setError('');
    setSuccessMessage('');

    if (!socialCaption.trim()) {
      setError('Write a caption before sharing.');
      return;
    }

    const caption = socialCaption.trim();
    setSharingPlatform(platform);

    try {
      if (platform === 'FACEBOOK') {
        openShareWindow(buildFacebookShareUrl(publicKittenUrl, caption));
      } else if (platform === 'X') {
        openShareWindow(buildTwitterShareUrl(publicKittenUrl, caption));
      } else if (platform === 'INSTAGRAM') {
        await copyCaptionToClipboard(caption);
        setSuccessMessage(
          'Caption copied! Please paste this into the Instagram app and attach your photo.',
        );
      }

      await logSmartShare(platform);
    } catch (err) {
      setError(err.message || 'Could not log this share. Try again.');
    } finally {
      setSharingPlatform('');
    }
  }

  const platformSummary = useMemo(
    () => postHistory.reduce((count, entry) => count + resolveUpdateTargets(entry).length, 0),
    [postHistory],
  );

  if (!kitten) return null;

  return (
    <div className="space-y-8">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {successMessage && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSavePublishingSettings} className="space-y-6">
        <PublishingMatrix
          currentTargets={publishingForm.publishTargets}
          onChange={(targets) =>
            setPublishingForm((prev) => ({ ...prev, publishTargets: normalizePublishTargets(targets) }))
          }
          title="Publishing Matrix"
          description="Choose exactly where this kitten should be published. Website controls the public adoption profile."
        />

        <section className="rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Website Details</h3>
          <p className="mt-1 text-sm text-gray-500">
            Extra content shown on the public profile when Website is checked above.
          </p>

          <label className="mt-5 block">
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

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingPublishing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingPublishing ? 'Saving...' : 'Save Publishing Settings'}
            </button>
            {listedOnWebsite && (
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
        </section>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Social Media Manager</p>
          <h3 className="mt-1 text-xl font-bold">Smart Share Hub</h3>
          <p className="mt-1 text-sm text-white/75">
            Opens the real Facebook and X share windows with your caption and public kitten link pre-filled.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Caption</label>
              <button
                type="button"
                onClick={handleGenerateCaption}
                className="inline-flex items-center gap-2 rounded-lg border border-brand/20 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate AI Caption
              </button>
            </div>
            <textarea
              rows={5}
              value={socialCaption}
              onChange={(e) => setSocialCaption(e.target.value)}
              placeholder="Write a catchy caption for your social post..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Photo for social post</label>
              <select
                value={selectedPhotoKey}
                onChange={(e) => setSelectedPhotoKey(e.target.value)}
                disabled={photoOptions.length === 0}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
              >
                {photoOptions.length === 0 ? (
                  <option value="">No photos available</option>
                ) : (
                  photoOptions.map((photo) => (
                    <option key={photo.key} value={photo.key}>
                      {photo.label}
                    </option>
                  ))
                )}
              </select>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSocialPhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingPhoto ? 'Uploading...' : 'Upload photo for social'}
                </button>
                <span className="text-xs text-slate-500">
                  Public link:{' '}
                  <a href={publicKittenUrl} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                    {publicKittenUrl}
                  </a>
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {selectedPhoto ? (
                <img
                  src={getFileUrl(selectedPhoto.fileUrl)}
                  alt=""
                  className="aspect-square h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center px-4 text-center text-sm text-slate-500">
                  Upload or add a kitten photo to preview it here.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ShareButton
              label="Share to Facebook"
              sublabel="Opens Facebook share dialog"
              className="bg-[#1877F2] hover:bg-[#166FE5]"
              disabled={sharingPlatform === 'FACEBOOK'}
              onClick={() => handleSmartShare('FACEBOOK')}
            />
            <ShareButton
              label="Share to Instagram"
              sublabel="Copies caption to clipboard"
              className="bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] hover:opacity-95"
              disabled={sharingPlatform === 'INSTAGRAM'}
              onClick={() => handleSmartShare('INSTAGRAM')}
            />
            <ShareButton
              label="Share to X"
              sublabel="Opens X compose window"
              className="bg-black hover:bg-slate-900"
              disabled={sharingPlatform === 'X'}
              onClick={() => handleSmartShare('X')}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Post History Log</h3>
            <p className="mt-1 text-sm text-gray-500">
              {postHistory.length} social post{postHistory.length === 1 ? '' : 's'} · {platformSummary} shares logged
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Caption Preview</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {postHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No social posts logged yet. Use a share button above to get started.
                  </td>
                </tr>
              ) : (
                postHistory.map((entry) => {
                  const delivery = parseSocialDeliveryLog(entry.socialDeliveryLog);
                  const platforms = resolveUpdateTargets(entry);

                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(entry.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {entry.content.length > 120 ? `${entry.content.slice(0, 120)}…` : entry.content}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {platforms.map((platform) => (
                            <span
                              key={`${entry.id}-${platform}`}
                              className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                            >
                              {getPublishPlatformLabel(platform)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {delivery.length > 0 ? (
                          <div className="space-y-1">
                            {delivery.map((item) => (
                              <div key={`${entry.id}-${item.platform}-status`}>
                                {getDeliveryStatusLabel(item.status)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          'Posted'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default KittenPublishingTab;
