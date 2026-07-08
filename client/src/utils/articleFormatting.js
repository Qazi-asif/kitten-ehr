function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/)/i.test(trimmed)) return trimmed;
  return '';
}

function formatInline(text) {
  let result = text;

  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return escapeHtml(_match);
    return `<img src="${safeUrl}" alt="${escapeHtml(alt)}" class="my-6 w-full rounded-xl border border-slate-200" loading="lazy" />`;
  });

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return escapeHtml(_match);
    return `<a href="${safeUrl}" class="font-medium text-brand underline-offset-2 hover:underline">${escapeHtml(label)}</a>`;
  });

  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return result;
}

export function formatArticleBody(body = '') {
  if (!body.trim()) return '';

  const paragraphs = body.split(/\n{2,}/);

  return paragraphs
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => formatInline(escapeHtml(line)));
      return `<p class="mb-4 leading-relaxed">${lines.join('<br />')}</p>`;
    })
    .join('');
}
