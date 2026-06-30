import { Link } from 'react-router-dom';
import { Building, Heart, Users, BookOpen, Stethoscope } from 'lucide-react';

const opportunities = [
  { icon: Heart, title: 'Adoption Application', text: 'Ready for a forever friend? Apply to adopt one of our available kittens.', link: '/adopt', cta: 'Apply to Adopt' },
  { icon: Users, title: 'Foster Application', text: 'Open your home temporarily and save lives. We provide supplies and medical care.', link: '/foster', cta: 'Apply to Foster' },
  { icon: BookOpen, title: 'Community Outreach', text: 'Spread the word about TNR, adoption, and responsible pet ownership.', link: '/education', cta: 'Learn More' },
  { icon: Building, title: 'Corporate Sponsorships', text: 'Partner with us to fund rescue efforts and community wellness programs.', link: '/contact', cta: 'Learn More' },
  { icon: Stethoscope, title: 'Wellness Partnerships', text: 'Veterinary clinics and wellness providers — join our care network.', link: '/contact', cta: 'Learn More' },
];

function GetInvolvedPage() {
  return (
    <div>
      <section className="border-b border-gray-200 bg-white px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-gray-900">Get Involved</h1>
          <p className="mt-2 text-gray-600">There are many ways to make a difference in the lives of cats and kittens in our community.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {opportunities.map(({ icon: Icon, title, text, link, cta = 'Learn More' }) => (
            <div key={title} className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-gray-900">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{text}</p>
              <Link to={link} className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700">
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <section className="relative overflow-hidden bg-gray-900">
        <img src="/images/kittens/nugget.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
          <p className="text-xl font-medium italic text-white lg:text-2xl">
            &ldquo;Alone we can do so little; together we can do so much.&rdquo;
          </p>
        </div>
      </section>
    </div>
  );
}

export default GetInvolvedPage;
