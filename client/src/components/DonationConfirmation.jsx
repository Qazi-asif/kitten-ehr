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
      <h2 className="text-2xl font-extrabold text-brand">
        {variant === 'sponsor' ? 'Thank you for sponsoring' : 'Thank you'}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-slate-700">{message}</p>
    </div>
  );
}

export default DonationConfirmation;
