import { Link } from 'react-router-dom';
import { ADOPTION_FAQ_ITEMS } from '../../constants/adoptionFaq';

function AdoptionProcessPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand lg:text-5xl">
            Adoption Process
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            Every cat here lives with a foster who knows them: their quirks, their favorite spot, their whole personality. Ask us anything.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Adoption FAQ</h2>
          {ADOPTION_FAQ_ITEMS.map((item) => (
            <div key={item.q} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>

        <section className="mx-auto mt-12 max-w-4xl">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-brand/40 bg-white px-8 py-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-brand">Adoption Application</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Ready to adopt? Submit an application and our team will be in touch to help you meet your new best friend.
              </p>
            </div>
            <div className="mt-2 w-full shrink-0 sm:mt-0 sm:w-auto">
              <Link
                to="/adopt/apply"
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-brand px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark sm:w-auto"
              >
                Apply to Adopt
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdoptionProcessPage;
