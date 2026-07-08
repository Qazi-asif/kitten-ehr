import { useEffect, useRef } from 'react';

const ALLOWED_HOSTS = ['givebutter.com', 'widgets.givebutter.com'];

function isAllowedUrl(urlString) {
  if (!urlString) return false;
  try {
    const url = new URL(urlString, window.location.origin);
    return ALLOWED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function SecureWidget({ code, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    if (!code?.trim()) return;

    const template = document.createElement('template');
    template.innerHTML = code.trim();

    Array.from(template.content.childNodes).forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      if (node.nodeName === 'SCRIPT') {
        const src = node.getAttribute('src');
        if (!src || !isAllowedUrl(src)) return;

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        Array.from(node.attributes).forEach((attr) => {
          if (attr.name !== 'src') script.setAttribute(attr.name, attr.value);
        });
        container.appendChild(script);
        return;
      }

      if (node.nodeName === 'GIVEBUTTER-WIDGET') {
        container.appendChild(node.cloneNode(true));
        return;
      }

      if (node.nodeName === 'IFRAME') {
        const src = node.getAttribute('src');
        if (!src || !isAllowedUrl(src)) return;
        container.appendChild(node.cloneNode(true));
      }
    });
  }, [code]);

  if (!code?.trim()) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="GiveButter donation widget"
    />
  );
}

export default SecureWidget;
