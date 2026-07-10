import {
  DONATION_CONFIRMATION_MESSAGE,
  sponsorshipConfirmationMessage,
} from '../constants/donationCopy';

function DonationConfirmation({ variant = 'donation', kittenName, className = '' }) {
  const message = variant === 'sponsor' && kittenName
    ? sponsorshipConfirmationMessage(kittenName)
    : DONATION_CONFIRMATION_MESSAGE;

  return (
    <div className={`rounded-2xl border border-brand/30 bg-brand-light/20 p-8 text-center ${className}`}>
      <p className="text-base leading-relaxed text-slate-700">{message}</p>
    </div>
  );
}

export default DonationConfirmation;
