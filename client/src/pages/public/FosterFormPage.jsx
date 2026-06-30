import ApplicationForm from '../../components/ApplicationForm';
import PublicPageHeader from '../../components/PublicPageHeader';

function FosterFormPage() {
  return (
    <div>
      <PublicPageHeader
        title="Foster Application"
        subtitle="Open your home temporarily and help us save more kittens."
      />

      <div className="mx-auto max-w-7xl px-6 pb-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl shadow-md">
            <img src="/images/kittens/nugget.jpg" alt="Foster kitten" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Why Foster?</h2>
            <p className="mt-4 leading-relaxed text-gray-600">
              Foster homes are the heart of our rescue. We provide supplies, medical care, and support while you help kittens become adoptable companions.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>We cover medical expenses and provide supplies</li>
              <li>Flexible time commitments — short or long term</li>
              <li>Full support from our experienced foster team</li>
            </ul>
          </div>
        </div>
      </div>

      <ApplicationForm defaultType="Foster" lockType />
    </div>
  );
}

export default FosterFormPage;
