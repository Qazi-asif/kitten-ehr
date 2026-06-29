import { Link } from 'react-router-dom';
import PublicPageHeader from '../../components/PublicPageHeader';

function AboutPage() {
  return (
    <div>
      <PublicPageHeader title="About Us" subtitle="Our mission, our story, and the community we serve." showPaw={false} />

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Our Story</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Pawsitive Transformations is a foster-based kitten rescue dedicated to saving neonatal and special-needs kittens. Our volunteers provide round-the-clock bottle feeding, medical support, and socialization until each kitten is ready for adoption.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              Since our founding, we have rescued over 2,450 cats and touched more than 15,000 lives through adoption, fostering, education, and community outreach.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              We believe every kitten deserves a chance at a happy, healthy life — and a loving forever home.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/kittens" className="rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Meet Our Cats
              </Link>
              <Link to="/get-involved" className="rounded-md border border-brand px-6 py-2.5 text-sm font-semibold text-brand hover:bg-brand-light">
                Get Involved
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
            <img src="/images/hero.jpg" alt="Rescue kitten" className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { stat: '2,450+', label: 'Cats Rescued' },
            { stat: '15,000+', label: 'Lives Touched' },
            { stat: '100%', label: 'Foster-Based' },
          ].map(({ stat, label }) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-brand-muted p-8 text-center">
              <p className="text-3xl font-extrabold text-brand">{stat}</p>
              <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
