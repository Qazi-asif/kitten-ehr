import { Link } from 'react-router-dom';

/**
 * Public guidance for people who need to surrender / rehome a cat.
 * There is no automated intake form yet — this page routes them to Contact
 * with clear expectations while staff handle case-by-case placement.
 */
function RehomePage() {
  return (
    <div className="overflow-hidden bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand sm:text-5xl">
          Rehome or Surrender a Cat
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          If you can no longer keep a cat or kitten, we want to help you find a safe next step.
          We are a foster-based rescue with limited space, so every case is reviewed individually.
        </p>

        <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-700">
          <h2 className="text-xl font-bold text-slate-900">How it works</h2>
          <ol className="list-decimal space-y-3 pl-5">
            <li>Contact us with the cat&apos;s age, temperament, medical history, and why you need to rehome.</li>
            <li>Our team reviews capacity with fosters and partner networks.</li>
            <li>If we can help, we arrange a handoff into foster care or a transfer partner.</li>
            <li>If we are at capacity, we still try to point you toward safe alternatives.</li>
          </ol>
        </section>

        <section className="mt-10 rounded-2xl border border-brand/20 bg-brand-light/20 p-6">
          <h2 className="text-lg font-bold text-slate-900">Ready to start?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Use the contact form and include &quot;Rehome / Surrender&quot; in your message so we can prioritize your request.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Contact Us
            </Link>
            <Link
              to="/whyfoster"
              className="inline-flex rounded-lg border border-brand/30 bg-white px-5 py-3 text-sm font-bold text-brand hover:border-brand"
            >
              Become a Foster
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RehomePage;
