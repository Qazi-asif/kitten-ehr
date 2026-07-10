import { Link } from 'react-router-dom';

const WHY_FOSTER = [
  {
    title: 'You save more than one life.',
    text: 'Every foster home opens a spot for the next cat in line. One foster family can save a dozen lives a year without ever owning a dozen cats.',
  },
  {
    title: 'You are never alone.',
    text: 'Every placement comes with a care plan, training, and a team on call. Medical decisions are ours to make and ours to pay for, so you are never stuck carrying a scary moment by yourself.',
  },
  {
    title: 'It fits real life.',
    text: 'Bottle babies, weaned litters, single adult cats, short stays, longer stays. We match placements to your home, schedule, and experience, not the other way around.',
  },
];

const WHO_CAN_FOSTER = [
  'You\'re 18 or older and everyone in your home is on board.',
  'You have an indoor-only space with a separate room where new arrivals can quarantine.',
  'If you rent, your lease or landlord allows cats, and fostering keeps you within local pet limits.',
  'Your own cats are current on FVRCP and rabies; dogs on DHPP and rabies.',
  'You can complete our short online training, under 30 minutes, before your first placement. No prior rescue experience needed; we\'ll teach you everything.',
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Apply.', text: 'Tell us about your home, your schedule, and your pets.' },
  { step: '2', title: 'Train.', text: 'A short online training, under 30 minutes, matched to the kind of cats you\'ll foster.' },
  { step: '3', title: 'Welcome.', text: 'We match you with a placement that fits your setup and send the cat home with a care plan.' },
  { step: '4', title: 'Launch.', text: 'You get them healthy and confident, we find their person, and you get your room back. Until the next one.' },
];

const FOSTER_FAQ = [
  {
    q: 'Do I need experience?',
    a: 'No. Our training is a quick online course, under 30 minutes, and we match placements to your comfort level. Plenty of our best fosters started with zero rescue experience and one empty bathroom.',
  },
  {
    q: 'What does fostering cost me?',
    a: 'Vet care is always on us, full stop. Everyday supplies depend on the placement, and we go over that clearly before you say yes. Out-of-pocket foster expenses may also be tax deductible; keep your receipts.',
  },
  {
    q: 'I have my own cats or dogs. Can I still foster?',
    a: 'Yes. New arrivals quarantine in a separate room first, your pets stay current on vaccines, and introductions happen on a protocol we walk through together.',
  },
  {
    q: 'How long does a placement last?',
    a: 'It varies. Neonates need weeks of care before they\'re adoption-ready; a healthy adult might be with you a shorter time. We\'ll give you an honest estimate up front and keep you posted.',
  },
  {
    q: 'What if there\'s a medical emergency?',
    a: 'You call us, day or night, and we take it from there. Treatment decisions and costs are always ours. You are never alone in a scary moment.',
  },
  {
    q: 'What if I fall in love?',
    a: 'The famous foster fail. It happens to the best of us, and we\'re thrilled when it does. You go through the standard adoption process, and as the current foster you get priority consideration. Just tell us early.',
  },
  {
    q: 'What if life changes mid-placement?',
    a: 'Talk to us. Travel, moves, surprises: we\'ll arrange coverage or bring the cat back to us. Every foster cat always has a home with the rescue, no matter what.',
  },
];

function FosterPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-10 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand lg:text-5xl">
          Be the difference between a list and a lap.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
          Fostering is the single most important thing anyone can do for these cats. You provide a safe room and the love; we provide the training, the vet care, and the backup, every step of the way.
        </p>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-6 pb-16 lg:px-8">
        <section>
          <h2 className="text-2xl font-bold text-slate-900">Why Foster</h2>
          <div className="mt-6 space-y-6">
            {WHY_FOSTER.map(({ title, text }) => (
              <div key={title} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-brand">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand/20 bg-brand-muted/40 p-6">
            <h2 className="text-xl font-bold text-brand">We always cover</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              All veterinary and medical care, vaccines, spay or neuter, microchipping, medications, and specialized gear like incubators when a care plan calls for it. You will never be handed a vet bill.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">You provide</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              A safe indoor space, a separate room for new arrivals to settle and quarantine, and daily love and attention. Everyday supply setups vary by placement, and we will walk through exactly what yours looks like before a cat ever comes home.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">Who Can Foster</h2>
          <ul className="mt-6 space-y-3">
            {WHO_CAN_FOSTER.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">How It Works</h2>
          <ol className="mt-6 space-y-4">
            {HOW_IT_WORKS.map(({ step, title, text }) => (
              <li key={step} className="flex gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {step}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">Foster FAQ</h2>
          <div className="mt-6 space-y-4">
            {FOSTER_FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-brand/40 bg-brand-light/20 px-8 py-8 text-center">
          <p className="text-base leading-relaxed text-slate-700">
            Ready to save lives? Fill out the foster application and we&apos;ll reach out to get you started.
          </p>
          <Link
            to="/foster"
            className="mt-6 inline-flex rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-dark"
          >
            Apply to Foster
          </Link>
        </section>
      </div>
    </div>
  );
}

export default FosterPage;
