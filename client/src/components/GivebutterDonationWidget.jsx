import { useEffect } from 'react';
import SecureWidget from './SecureWidget';
import { syncGivebutterUrlParams, useGivebutterCheckoutSuccess } from '../hooks/useGivebutterCheckout';

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

  if (!code?.trim()) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
        Online donation form is being configured in Givebutter.
      </p>
    );
  }

  return <SecureWidget code={code} className={className} />;
}

export default GivebutterDonationWidget;
