import { Link } from 'react-router-dom';

const WHY_FOSTER = [
  'Fostering is the bridge between a shelter list and a loving lap—your home gives a cat room to heal and show who they really are.',
  'Every foster home opens space for us to pull another cat from a euthanasia list, the street, or a community with nowhere else to turn.',
  'You are never alone: our team provides guidance, medical support, and supplies so you can focus on care and connection.',
  'Fostering fits many lifestyles—from bottle babies needing round-the-clock feeds to adult cats who simply need a quiet room to decompress.',
];

const WE_COVER = [
  'All medical care and veterinary appointments',
  'Spay/neuter when the cat is ready',
  'Food, formula, litter, and starter supplies',
  'Training, guidance, and 24/7 foster support',
  'Adoption marketing and placement support',
];

const YOU_PROVIDE = [
  'A safe, indoor home environment',
  'Daily feeding, cleaning, and compassionate care',
  'Transportation to vet appointments as needed',
  'Updates and photos so we can match them with the right adopter',
  'Communication with our foster coordinator',
];

const WHO_CAN_FOSTER = [
  'Be at least 18 years old',
  'Have a safe indoor space for a cat or kitten',
  'Obtain landlord approval if you rent',
  'Be able to transport to scheduled veterinary appointments',
  'Share our commitment to humane, no-declaw care',
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Apply', text: 'Complete our foster application and tell us about your home, experience, and availability.' },
  { step: '2', title: 'Screening', text: 'Our team reviews your application and schedules a conversation to answer questions and learn your goals.' },
  { step: '3', title: 'Home Check', text: 'We conduct a virtual home check to ensure a safe, welcoming environment for a foster cat.' },
  { step: '4', title: 'Placement', text: 'When a cat matches your home, we coordinate supplies, medical records, and a smooth handoff.' },
  { step: '5', title: 'Support', text: 'You receive ongoing support until your foster cat is adopted into a forever home.' },
];

function FosterPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-10 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand lg:text-5xl">
          Be the difference between a list and a lap.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
          Foster families are the heart of Pawsitive Transformations. When you open your home, you give an at-risk cat a chance to heal, grow, and find a forever family.
        </p>
        <Link
          to="/foster"
          className="mt-8 inline-flex rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-dark"
        >
          Start Foster Application
        </Link>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-6 pb-16 lg:px-8">
        <section>
          <h2 className="text-2xl font-bold text-slate-900">Why Foster</h2>
          <ul className="mt-6 space-y-4">
            {WHY_FOSTER.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand/20 bg-brand-muted/40 p-6">
            <h2 className="text-xl font-bold text-brand">What We Cover</h2>
            <ul className="mt-4 space-y-3">
              {WE_COVER.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-slate-700">• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">You Provide</h2>
            <ul className="mt-4 space-y-3">
              {YOU_PROVIDE.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-slate-600">• {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">Who Can Foster</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WHO_CAN_FOSTER.map((item) => (
              <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
      </div>
    </div>
  );
}

export default FosterPage;
