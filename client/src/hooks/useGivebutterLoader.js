import { useEffect, useState } from 'react';
import { GIVEBUTTER_LOADER_SRC } from '../constants/givebutterDefaults';

/**
 * Injects the Givebutter widget loader exactly once per page.
 *
 * A `<givebutter-widget>` tag renders nothing without this script, which is why
 * the donation forms previously fell back to off-site redirect links (CR-101).
 *
 * Returns 'loading' | 'ready' | 'failed'. Callers should show a redirect link
 * only on 'failed', so an ad blocker or offline visitor still has a way to give.
 */
export default function useGivebutterLoader() {
  const [status, setStatus] = useState(() => (
    typeof document !== 'undefined' && document.querySelector('script[data-givebutter-loader]')
      ? (window.Givebutter ? 'ready' : 'loading')
      : 'loading'
  ));

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const existing = document.querySelector('script[data-givebutter-loader]');
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        setStatus('ready');
        return undefined;
      }
      const onLoad = () => setStatus('ready');
      const onError = () => setStatus('failed');
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
      return () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
      };
    }

    const script = document.createElement('script');
    script.src = GIVEBUTTER_LOADER_SRC;
    script.async = true;
    script.dataset.givebutterLoader = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      setStatus('ready');
    });
    script.addEventListener('error', () => setStatus('failed'));
    document.head.appendChild(script);

    // Deliberately not removed on unmount: the script is page-global, and
    // tearing it down would break any other widget still mounted.
    return undefined;
  }, []);

  // Guard against the script being blocked without firing an error event.
  useEffect(() => {
    if (status !== 'loading') return undefined;
    const timer = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'failed' : current));
    }, 8000);
    return () => clearTimeout(timer);
  }, [status]);

  return status;
}
