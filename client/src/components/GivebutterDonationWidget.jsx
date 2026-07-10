import { useEffect, useMemo, useRef, useState } from 'react';
import SecureWidget from './SecureWidget';
import { ensureGivebutterEmbed } from '../constants/givebutterDefaults';
import { syncGivebutterUrlParams, useGivebutterCheckoutSuccess } from '../hooks/useGivebutterCheckout';

function widgetHasVisibleContent(container) {
  if (!container) return false;

  const widgetNode = container.querySelector(
    'givebutter-giving-form, givebutter-widget, givebutter-button, iframe',
  );
  if (!widgetNode) return false;

  if (widgetNode.tagName === 'IFRAME') {
    return widgetNode.getBoundingClientRect().height > 40;
  }

  return widgetNode.getBoundingClientRect().height > 40
    || widgetNode.childElementCount > 0
    || Boolean(widgetNode.shadowRoot?.childElementCount);
}

function GivebutterDonationWidget({
  code,
  className = '',
  amount,
  frequency,
  kittenId,
  kittenName,
  tier,
  sponsor = false,
  onSuccess,
}) {
  const shellRef = useRef(null);
  const [showFallback, setShowFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useGivebutterCheckoutSuccess(onSuccess);

  useEffect(() => {
    syncGivebutterUrlParams({
      amount,
      frequency,
      kittenId,
      kittenName,
      tier,
      sponsor,
    });
  }, [amount, frequency, kittenId, kittenName, tier, sponsor]);

  const resolvedCode = useMemo(() => ensureGivebutterEmbed(code), [code]);

  useEffect(() => {
    setLoading(true);
    setShowFallback(false);

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const container = shellRef.current?.querySelector('[aria-label="Donation widget"]');
      if (widgetHasVisibleContent(container)) {
        setLoading(false);
        setShowFallback(false);
        window.clearInterval(timer);
        return;
      }

      if (Date.now() - startedAt >= 8000) {
        setLoading(false);
        setShowFallback(true);
        window.clearInterval(timer);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [resolvedCode]);

  return (
    <div ref={shellRef} className="relative min-h-[280px]">
      {loading ? (
        <p className="mb-4 text-center text-sm text-slate-500">Loading secure donation form…</p>
      ) : null}

      <SecureWidget code={resolvedCode} className={className} />

      {showFallback ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">Donation form did not load.</p>
          <p className="mt-2 leading-relaxed">
            In Admin → Settings → Organization, paste the full Givebutter embed from
            {' '}<span className="font-medium">Dashboard → Sharing → Widgets → Form</span>.
            The snippet must include both the script tag and the
            {' '}<code className="rounded bg-amber-100 px-1 text-xs">&lt;givebutter-giving-form&gt;</code>
            {' '}or <code className="rounded bg-amber-100 px-1 text-xs">&lt;givebutter-widget&gt;</code> tag
            with your real campaign code.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default GivebutterDonationWidget;
