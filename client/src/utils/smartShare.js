const PUBLIC_KITTEN_PATH = '/kittens';

export function getPublicKittenUrl(kittenId, origin = window.location.origin) {
  return `${origin.replace(/\/$/, '')}${PUBLIC_KITTEN_PATH}/${kittenId}`;
}

export function buildFacebookShareUrl(publicUrl, caption) {
  const params = new URLSearchParams({
    u: publicUrl,
    quote: caption,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function buildTwitterShareUrl(publicUrl, caption) {
  const params = new URLSearchParams({
    text: caption,
    url: publicUrl,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
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
