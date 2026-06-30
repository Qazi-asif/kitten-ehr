import ApplicationForm from '../../components/ApplicationForm';
import PublicPageHeader from '../../components/PublicPageHeader';

function AdoptionFormPage() {
  return (
    <div>
      <PublicPageHeader
        title="Adoption Application"
        subtitle="Apply to adopt a kitten and give them a forever home."
      />
      <ApplicationForm defaultType="Adoption" lockType />
    </div>
  );
}

export default AdoptionFormPage;
