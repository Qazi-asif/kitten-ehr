import GivebutterDonationWidget from './GivebutterDonationWidget';
import { sponsorshipOverflowDisclosure } from '../constants/donationCopy';
import { DEFAULT_GIVEBUTTER_SPONSOR_URL } from '../constants/givebutterDefaults';

function DonationCheckoutPanel({
  amount,
  kittenId,
  kittenName,
  tier,
  onSuccess,
  className = '',
}) {
  return (
    <div className={`rounded-2xl border border-brand/25 bg-white p-6 shadow-sm ${className}`}>
      <p className="text-xs leading-relaxed text-slate-500">
        {sponsorshipOverflowDisclosure(kittenName)}
      </p>

      <div className="mt-6">
        <GivebutterDonationWidget
          amount={amount}
          kittenId={kittenId}
          kittenName={kittenName}
          tier={tier}
          sponsor
          fallbackUrl={DEFAULT_GIVEBUTTER_SPONSOR_URL}
          buttonLabel={kittenName ? `Sponsor ${kittenName}` : 'Sponsor a kitten'}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

export default DonationCheckoutPanel;
