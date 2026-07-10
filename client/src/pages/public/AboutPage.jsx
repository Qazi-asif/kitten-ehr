import { Link } from 'react-router-dom';

const TEAM = [
  {
    name: 'Lauren',
    title: 'Chief Cat Herder (Director of Strategy)',
    bio: 'Vision, business direction, technology, and execution. Lauren is a licensed psychologist by day and a Canadian by origin who fell into cat rescue by accident in 2025 and hasn\'t looked back. She cares for a colony in Corona, jumps in on trapping missions as needed, fosters full time, and shares her home with a headcount of personal cats that is best described as \u201cever-growing.\u201d She\'s also the name on the state and IRS paperwork, which is a filing technicality, not a hierarchy.',
  },
  {
    name: 'Danielle',
    title: 'Chief of Purrs & Partnerships (Director of Development)',
    bio: 'Community partnerships, grants, fundraising, and donor relationships, plus the corporate record-keeping and people side of a growing organization. Danielle is an HR specialist and former federal employee who has spent years in animal rescue. She fosters too, and raised two kids alongside a house full of fur children.',
  },
  {
    name: 'Maggie',
    title: 'Chief of Rescue Ops (Director of Operations)',
    bio: 'The rescue engine: intake, foster development, and medical protocols, keeping cats moving safely from pull to placement. Maggie coordinates a shelter euthanasia list, connecting rescues and fosters and networking cats out of danger, and brings nearly a decade of critical-care experience as a medical and neonate foster. She and her husband Craig keep an endless revolving door of cats and kittens.',
  },
];

function AboutPage() {
  return (
    <div className="overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="flex items-center gap-3 text-6xl font-extrabold tracking-tight text-brand">
          Our Mission
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">
          The cats we save, the story behind us, and the community we serve.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <section className="mb-16 rounded-2xl border border-brand/20 bg-brand-light/20 p-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Our Mission</h2>
          <p className="mt-4 text-xl font-semibold leading-relaxed text-slate-800">
            To save the most vulnerable cats from euthanasia and hardship, and to connect them with the people who need them just as much.
          </p>
        </section>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
              <img
                src="/images/about.jpg"
                alt="Rescue cat"
                className="aspect-[4/5] h-full w-full object-cover sm:aspect-square lg:aspect-[4/5]"
              />
            </div>
          </div>

          <div>
            <h2 className="mb-6 text-4xl font-extrabold text-brand">Our Story</h2>
            <div className="space-y-5 text-lg leading-relaxed text-slate-600">
              <p>
                Pawsitive Transformations is a foster-based cat rescue in the Inland Empire. We pull at-risk cats and kittens from euthanasia lists, from the streets, and from communities that have run out of options, then get them healthy in foster homes and match them with the people who&apos;ll love them for life.
              </p>
              <p>
                We believe every cat deserves a shot at a healthy life and a home to grow old in. Through fostering, community partnerships, and education, we work to save the cats in front of us today and shrink the crisis that put them at risk in the first place.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/kittens"
                className="rounded-xl bg-brand px-8 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-brand-dark"
              >
                Meet Our Cats
              </Link>
              <Link
                to="/get-involved"
                className="rounded-xl border-2 border-brand/20 bg-white px-8 py-3.5 text-base font-bold text-brand transition-colors hover:border-brand"
              >
                Get Involved
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-20">
          <h2 className="text-3xl font-extrabold text-brand">Meet the Team</h2>
          <div className="mt-8 space-y-8">
            {TEAM.map((member) => (
              <div key={member.name} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  {member.name} · {member.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AboutPage;
