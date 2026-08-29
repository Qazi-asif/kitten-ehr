import { useEffect, useMemo } from 'react';
import {
  DEFAULT_GIVEBUTTER_DONATE_URL,
  GIVEBUTTER_WIDGET_IDS,
} from '../constants/givebutterDefaults';
import { syncGivebutterUrlParams, useGivebutterCheckoutSuccess } from '../hooks/useGivebutterCheckout';
import useGivebutterLoader from '../hooks/useGivebutterLoader';

function buildCheckoutUrl(baseUrl, { amount, frequency, kittenId, kittenName, tier, sponsor }) {
  try {
    const url = new URL(baseUrl);
    if (amount) url.searchParams.set('amount', String(amount));
    if (frequency) url.searchParams.set('frequency', String(frequency));
    if (kittenId) url.searchParams.set('kitten_id', String(kittenId));
    if (kittenName) url.searchParams.set('kitten_name', String(kittenName));
    if (tier) url.searchParams.set('tier', String(tier));
    if (sponsor) url.searchParams.set('sponsor', '1');
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * CR-101: renders the Givebutter donation form inline via the widget embed, so
 * visitors complete their gift on our own page instead of being redirected to a
 * Givebutter-hosted page.
 *
 * The off-site link is kept strictly as a fallback for when the loader script
 * cannot run (ad blocker, offline, or a stale widget id) — previously it was
 * the only path, which is what the CR reported.
 */
function GivebutterDonationWidget({
  className = '',
  widgetId = GIVEBUTTER_WIDGET_IDS.donate,
  amount,
  frequency,
  kittenId,
  kittenName,
  tier,
  sponsor = false,
  fallbackUrl = DEFAULT_GIVEBUTTER_DONATE_URL,
  buttonLabel,
  onSuccess,
}) {
  useGivebutterCheckoutSuccess(onSuccess);
  const loaderStatus = useGivebutterLoader();

  useEffect(() => {
    // Several widgets can share a page; a widget with nothing to contribute
    // must not wipe the params another one just wrote.
    if (!amount && !frequency && !kittenId && !kittenName && !tier && !sponsor) return;
    syncGivebutterUrlParams({
      amount,
      frequency,
      kittenId,
      kittenName,
      tier,
      sponsor,
    });
  }, [amount, frequency, kittenId, kittenName, tier, sponsor]);

  const checkoutUrl = useMemo(
    () => buildCheckoutUrl(fallbackUrl, {
      amount,
      frequency,
      kittenId,
      kittenName,
      tier,
      sponsor,
    }),
    [fallbackUrl, amount, frequency, kittenId, kittenName, tier, sponsor],
  );

  const label = buttonLabel
    || (sponsor && kittenName ? `Sponsor ${kittenName}` : 'Donate securely');

  if (loaderStatus === 'failed' || !widgetId) {
    return (
      <div className={`flex min-h-[22rem] w-full flex-col justify-center rounded-xl border border-slate-200 bg-white px-5 py-6 text-center ${className}`}>
        <p className="text-sm leading-relaxed text-slate-600">
          Our donation form could not load in your browser. You can still give securely on
          our Givebutter page.
        </p>
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white underline-offset-4 hover:bg-brand-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto"
        >
          {label}
        </a>
        <p className="mt-3 text-xs text-slate-500">Powered by Givebutter · Tax-deductible gifts</p>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-xl border border-slate-200 bg-white p-2 ${className}`}>
      {/* Reserved height keeps the card from jumping as the widget hydrates. */}
      <div className="relative min-h-[22rem] w-full">
        {loaderStatus === 'loading' && (
          <p
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-3 text-center text-sm text-slate-500"
            role="status"
          >
            Loading donation form…
          </p>
        )}
        {/* Custom element activated by the loader script; React renders it as-is. */}
        <givebutter-widget id={widgetId} />
      </div>
      <p className="mt-2 px-3 pb-1 text-center text-xs text-slate-500">
        Powered by Givebutter · Tax-deductible gifts
      </p>
    </div>
  );
}

export default GivebutterDonationWidget;
