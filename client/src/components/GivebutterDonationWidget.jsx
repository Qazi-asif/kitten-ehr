import { useEffect, useMemo } from 'react';
import {
  DEFAULT_GIVEBUTTER_DONATE_URL,
} from '../constants/givebutterDefaults';
import { syncGivebutterUrlParams, useGivebutterCheckoutSuccess } from '../hooks/useGivebutterCheckout';

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
 * Givebutter's JS widgets are unreliable on many hosts (script blocked / wrong
 * campaign codes). Use a direct checkout CTA that always works.
 */
function GivebutterDonationWidget({
  className = '',
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

  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-5 py-6 text-center ${className}`}>
      <p className="text-sm leading-relaxed text-slate-600">
        {sponsor
          ? 'Complete your gift on our secure Givebutter checkout. It opens in a new tab and takes about a minute.'
          : 'Complete your donation on our secure Givebutter checkout. It opens in a new tab and takes about a minute.'}
      </p>
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark sm:w-auto"
      >
        {label}
      </a>
      <p className="mt-3 text-xs text-slate-500">
        Powered by Givebutter · Tax-deductible gifts
      </p>
    </div>
  );
}

export default GivebutterDonationWidget;
