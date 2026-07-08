export const PUBLIC_CONTACT_DEFAULTS = {
  orgEin: '42-3678960',
  contactPhone: '(951) 830-1825',
  contactEmail: 'hello@pawsitivetransformations.org',
  contactAddress: '12523 Limonite, Suite 440412\nMira Loma, CA 91752\nRiverside County',
};

export const PUBLIC_SETTINGS_SELECT = {
  orgName: true,
  orgEin: true,
  contactPhone: true,
  contactEmail: true,
  contactAddress: true,
  missionStatement: true,
  defaultDonationAmount: true,
  amazonWishlistUrl: true,
  chewyWishlistUrl: true,
  facebookUrl: true,
  instagramUrl: true,
  donationWidgetCode: true,
  paypalLink: true,
  stripeLink: true,
  venmoQrCodeUrl: true,
  venmoHandle: true,
  fromEmail: true,
  adminNotifyEmail: true,
};

export function toPublicSettings(settings = {}) {
  return {
    orgName: settings.orgName ?? 'Pawsitive Transformations',
    orgEin: settings.orgEin?.trim() || PUBLIC_CONTACT_DEFAULTS.orgEin,
    contactPhone: settings.contactPhone?.trim() || PUBLIC_CONTACT_DEFAULTS.contactPhone,
    contactEmail: settings.contactEmail?.trim() || PUBLIC_CONTACT_DEFAULTS.contactEmail,
    contactAddress: settings.contactAddress?.trim() || PUBLIC_CONTACT_DEFAULTS.contactAddress,
    missionStatement: settings.missionStatement ?? '',
    defaultDonationAmount: settings.defaultDonationAmount ?? 50,
    amazonWishlistUrl: settings.amazonWishlistUrl ?? '',
    chewyWishlistUrl: settings.chewyWishlistUrl ?? '',
    facebookUrl: settings.facebookUrl ?? '',
    instagramUrl: settings.instagramUrl ?? '',
    donationWidgetCode: settings.donationWidgetCode ?? '',
    paypalLink: settings.paypalLink ?? '',
    stripeLink: settings.stripeLink ?? '',
    venmoQrCodeUrl: settings.venmoQrCodeUrl ?? '',
    venmoHandle: settings.venmoHandle ?? '',
    fromEmail: settings.fromEmail ?? '',
    adminNotifyEmail: settings.adminNotifyEmail ?? '',
  };
}
