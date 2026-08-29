import { useEffect, useState } from 'react';
import { GIVEBUTTER_LOADER_SRC, GIVEBUTTER_WIDGET_TAG } from '../constants/givebutterDefaults';

/** A blocked request never fires `error`, so readiness is also time-boxed. */
const READY_TIMEOUT_MS = 6000;

function widgetElementDefined() {
  return typeof window !== 'undefined'
    && typeof window.customElements !== 'undefined'
    && Boolean(window.customElements.get(GIVEBUTTER_WIDGET_TAG));
}

/**
 * Injects the Givebutter widget loader exactly once per page.
 *
 * A `<givebutter-widget>` tag renders nothing without this script, which is why
 * the donation forms previously fell back to off-site redirect links (CR-101).
 *
 * Returns 'loading' | 'ready' | 'failed'. 'ready' means the custom element is
 * actually defined, not merely that the script tag fired `load` — an ad blocker
 * or a stubbed response would otherwise leave an empty container behind.
 * Callers show a direct campaign link on 'failed'.
 */
export default function useGivebutterLoader() {
  const [status, setStatus] = useState(() => (widgetElementDefined() ? 'ready' : 'loading'));

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let cancelled = false;
    const markReady = () => { if (!cancelled) setStatus('ready'); };
    const markFailed = () => {
      if (!cancelled) setStatus((current) => (current === 'ready' ? current : 'failed'));
    };

    if (typeof window.customElements !== 'undefined') {
      window.customElements.whenDefined(GIVEBUTTER_WIDGET_TAG).then(markReady).catch(markFailed);
    }

    const existing = document.querySelector('script[data-givebutter-loader]');
    if (existing) {
      existing.addEventListener('error', markFailed);
    } else {
      const script = document.createElement('script');
      script.src = GIVEBUTTER_LOADER_SRC;
      script.async = true;
      script.dataset.givebutterLoader = 'true';
      script.addEventListener('error', markFailed);
      document.head.appendChild(script);
      // Deliberately not removed on unmount: the script is page-global, and
      // tearing it down would break any other widget still mounted.
    }

    const timer = setTimeout(() => {
      if (widgetElementDefined()) markReady();
      else markFailed();
    }, READY_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      existing?.removeEventListener('error', markFailed);
    };
  }, []);

  return status;
}
