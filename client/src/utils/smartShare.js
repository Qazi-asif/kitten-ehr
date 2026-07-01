const PUBLIC_KITTEN_PATH = '/kittens';

export function getPublicKittenUrl(kittenId, origin = window.location.origin) {
  return `${origin.replace(/\/$/, '')}${PUBLIC_KITTEN_PATH}/${kittenId}`;
}

export function buildFacebookShareUrl(publicUrl, caption) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}&quote=${encodeURIComponent(caption)}`;
}

export function buildTwitterShareUrl(publicUrl, caption) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(publicUrl)}`;
}

export function openShareWindow(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function copyCaptionToClipboard(caption) {
  await navigator.clipboard.writeText(caption);
}

export function buildMockAiCaption(kittenName) {
  return `🎉 Meet ${kittenName}, available for adoption!`;
}
