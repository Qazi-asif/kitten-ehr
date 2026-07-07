import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function PrivacyPolicyPage() {
  useEffect(() => {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: June 2026</p>

        <div className="mt-10 space-y-10 text-slate-600">
          <section>
            <h2 className="text-xl font-bold text-slate-900">Overview</h2>
            <p className="mt-3 leading-relaxed">
              Pawsitive Transformations respects your privacy. This page describes how we handle information
              collected through our website, adoption and foster applications, and donation forms. We use
              this information only to operate our rescue programs and communicate with our community.
            </p>
          </section>

          <section id="our-use-of-technology" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">Our Use of Technology</h2>
            <p className="mt-3 leading-relaxed">
              Our organization uses AI-assisted tools to help staff draft marketing copy, social media captions,
              and certain administrative materials. These tools are designed to support our team—not replace
              the judgment, care, and expertise of the people who run our rescue. AI-generated suggestions
              are always reviewed, edited, and approved by human staff before anything is published on our
              website, social channels, or shared with the public.
            </p>
            <p className="mt-4 leading-relaxed">
              We follow a human-in-the-loop approach to content governance. Private donor information,
              applicant details, foster contact data, medical records, and other sensitive personal
              information are never shared with external AI systems. Only non-sensitive, public-facing
              information—such as a kitten&apos;s name, breed, adoption status, and general rescue story—is
              used when staff choose to use AI drafting features, and administrators may disable those
              features organization-wide at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Contact</h2>
            <p className="mt-3 leading-relaxed">
              Questions about this policy or our use of technology may be directed to{' '}
              <a
                href="mailto:hello@pawsitivetransformations.org"
                className="font-semibold text-brand hover:underline"
              >
                hello@pawsitivetransformations.org
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          <Link to="/" className="font-semibold text-brand hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
