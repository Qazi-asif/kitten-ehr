import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import SecureWidget from '../../components/SecureWidget';
import { getFileUrl } from '../../services/api';
import { fetchPublicSettings } from '../../services/publicApi';

function DonatePage() {
  const outlet = useOutletContext();
  const [settings, setSettings] = useState(outlet?.settings ?? {});

  useEffect(() => {
    fetchPublicSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const hasWidget = Boolean(settings.donationWidgetCode?.trim());
  const hasStripe = Boolean(settings.stripeLink);
  const hasPaypal = Boolean(settings.paypalLink);
  const hasVenmo = Boolean(settings.venmoQrCodeUrl);
  const hasAlternatePayments = hasStripe || hasPaypal || hasVenmo;
  const orgEin = settings.orgEin?.trim() || '42-3678960';

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="flex items-center gap-3 text-6xl font-extrabold tracking-tight text-brand">
          Donate
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">Your support helps transform lives.</p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="mb-8 rounded-2xl border border-brand/25 bg-brand-light/20 p-6 lg:p-8">
          <h2 className="text-xl font-extrabold text-brand">Make a Difference Today</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Your donation helps provide essential care, shelter, and love to cats in need and supports wellness programs for people.
            Pawsitive Transformations is a 501(c)(3) non-profit organization. EIN: {orgEin}.
          </p>
        </div>

        {hasWidget ? (
          <section className="mb-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">Give Securely Online</h2>
            <SecureWidget code={settings.donationWidgetCode} className="min-h-[420px] w-full" />
          </section>
        ) : (
          <section className="mb-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-base font-medium text-slate-700">Online donation options are being configured.</p>
            <p className="mt-2 text-sm text-slate-500">Please use one of the alternate payment methods below.</p>
          </section>
        )}

        {hasAlternatePayments ? (
          <section>
            <h2 className="text-center text-2xl font-bold text-slate-900">Other Ways to Give</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">
              Prefer Stripe, PayPal, or Venmo? Choose the option that works best for you.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {hasStripe ? (
                <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C6.203 22.99 9.077 24 12.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Stripe</h3>
                  <p className="mt-2 text-sm text-slate-500">Fast, secure card payments through Stripe.</p>
                  <a
                    href={settings.stripeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    Donate with Stripe
                  </a>
                </article>
              ) : null}

              {hasPaypal ? (
                <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-[#003087]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">PayPal</h3>
                  <p className="mt-2 text-sm text-slate-500">Send a gift quickly with your PayPal account.</p>
                  <a
                    href={settings.paypalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#0070BA] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005ea6]"
                  >
                    Donate with PayPal
                  </a>
                </article>
              ) : null}

              {hasVenmo ? (
                <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                      <path d="M19.4 3c.4.7.6 1.4.6 2.4 0 3-2.6 6.9-4.7 9.6H10L8.2 3.8l4.5-.4 1 7.7c.9-1.5 2-3.9 2-5.5 0-.9-.2-1.5-.4-2L19.4 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Venmo</h3>
                  <p className="mt-2 text-sm text-slate-500">Scan the QR code or send directly in Venmo.</p>
                  <img
                    src={getFileUrl(settings.venmoQrCodeUrl)}
                    alt="Venmo QR code"
                    className="mt-5 h-40 w-40 rounded-xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                  />
                  {settings.venmoHandle ? (
                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      Scan QR or send to: {settings.venmoHandle}
                    </p>
                  ) : null}
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <div className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative h-80 lg:h-96">
            <div className="absolute bottom-0 left-10 flex h-72 flex-col items-center lg:h-80">
              <img
                src="/images/3.png"
                alt="Cute rescue kitten"
                className="relative z-10 h-full w-auto object-contain object-bottom"
              />
              <div className="absolute bottom-2 -z-10 h-4 w-4/5 rounded-[100%] bg-black/20 blur-md" />
            </div>
            <div className="absolute bottom-0 right-10 hidden h-72 flex-col items-center lg:flex lg:h-80">
              <img
                src="/images/8.png"
                alt="Playing rescue kitten"
                className="relative z-10 h-full w-auto object-contain object-bottom"
              />
              <div className="absolute bottom-2 -z-10 h-4 w-4/5 rounded-[100%] bg-black/20 blur-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DonatePage;
