import { useEffect, useMemo, useRef } from 'react';

const ALLOWED_HOSTS = [
  'givebutter.com',
  'widgets.givebutter.com',
  'js.givebutter.com',
  'api.givebutter.com',
  'givebutter.s3.amazonaws.com',
  'paypal.com',
  'www.paypal.com',
  'paypalobjects.com',
  'www.paypalobjects.com',
  'stripe.com',
  'js.stripe.com',
  'hooks.stripe.com',
  'donorbox.org',
  'donorbox.co',
];

const ALLOWED_TAGS = new Set(['SCRIPT', 'IFRAME', 'DIV', 'FORM']);

function isGivebutterTag(tagName) {
  return tagName?.startsWith('GIVEBUTTER-');
}

function isAllowedTag(tagName) {
  return ALLOWED_TAGS.has(tagName) || isGivebutterTag(tagName);
}

function isAllowedUrl(urlString) {
  if (!urlString) return false;
  if (/^\s*javascript:/i.test(urlString) || /^\s*data:/i.test(urlString)) return false;

  try {
    const url = new URL(urlString, window.location.origin);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function sanitizeElementAttributes(element) {
  Array.from(element.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      element.removeAttribute(attr.name);
      return;
    }

    if ((name === 'src' || name === 'href') && !isAllowedUrl(attr.value)) {
      element.removeAttribute(attr.name);
    }
  });
}

function sanitizeWidgetCode(code) {
  if (!code?.trim()) return '';

  const template = document.createElement('template');
  template.innerHTML = code.trim();

  Array.from(template.content.childNodes).forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    if (!isAllowedTag(node.nodeName)) {
      node.remove();
      return;
    }

    sanitizeElementAttributes(node);

    if (node.nodeName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (!src || !isAllowedUrl(src)) {
        node.remove();
      }
      return;
    }

    if (node.nodeName === 'IFRAME') {
      const src = node.getAttribute('src');
      if (!src || !isAllowedUrl(src)) {
        node.remove();
      }
    }
  });

  return template.innerHTML;
}

function ensureScriptLoaded(node) {
  const src = node.getAttribute('src');
  if (!src || !isAllowedUrl(src)) return;

  const selector = `script[data-secure-widget-src="${CSS.escape(src)}"]`;
  if (document.querySelector(selector)) return;

  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.dataset.secureWidgetSrc = src;
  Array.from(node.attributes).forEach((attr) => {
    if (attr.name !== 'src') script.setAttribute(attr.name, attr.value);
  });
  document.head.appendChild(script);
}

function mountWidgetNodes(container, sanitizedCode) {
  container.innerHTML = '';
  if (!sanitizedCode) return;

  const template = document.createElement('template');
  template.innerHTML = sanitizedCode;

  const nodes = Array.from(template.content.childNodes).filter(
    (node) => node.nodeType === Node.ELEMENT_NODE,
  );

  nodes
    .filter((node) => node.nodeName === 'SCRIPT')
    .forEach((node) => ensureScriptLoaded(node));

  nodes.forEach((node) => {
    if (node.nodeName === 'SCRIPT') return;

    if (isGivebutterTag(node.nodeName) || node.nodeName === 'DIV' || node.nodeName === 'FORM') {
      container.appendChild(node.cloneNode(true));
      return;
    }

    if (node.nodeName === 'IFRAME') {
      const src = node.getAttribute('src');
      if (!src || !isAllowedUrl(src)) return;

      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      Array.from(node.attributes).forEach((attr) => {
        if (!['src', 'sandbox', 'loading', 'referrerpolicy'].includes(attr.name.toLowerCase())) {
          iframe.setAttribute(attr.name, attr.value);
        }
      });
      container.appendChild(iframe);
    }
  });
}

function SecureWidget({ code, className = '' }) {
  const containerRef = useRef(null);
  const sanitizedCode = useMemo(() => sanitizeWidgetCode(code), [code]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    mountWidgetNodes(container, sanitizedCode);
  }, [sanitizedCode]);

  if (!sanitizedCode) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="Donation widget"
    />
  );
}

export default SecureWidget;
