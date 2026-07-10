import GivebutterDonationWidget from './GivebutterDonationWidget';
import { sponsorshipOverflowDisclosure } from '../constants/donationCopy';

function DonationCheckoutPanel({
  widgetCode,
  amount,
  kittenId,
  kittenName,
  tier,
  onSuccess,
  className = '',
}) {
  return (
    <div className={`rounded-2xl border border-brand/25 bg-white p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-bold text-slate-900">Complete your sponsorship</h3>
      <p className="mt-2 text-sm text-slate-600">
        Secure checkout is powered by Givebutter. Choose your payment method below to sponsor {kittenName}.
      </p>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {sponsorshipOverflowDisclosure(kittenName)}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4">
        <GivebutterDonationWidget
          code={widgetCode}
          amount={amount}
          kittenId={kittenId}
          kittenName={kittenName}
          tier={tier}
          sponsor
          onSuccess={onSuccess}
          className="min-h-[420px] w-full"
        />
      </div>
    </div>
  );
}

export default DonationCheckoutPanel;
