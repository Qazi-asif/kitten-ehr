import ApplicationForm from '../../components/ApplicationForm';

function ApplicationFormPage({ defaultType = 'Adoption' }) {
  return <ApplicationForm defaultType={defaultType} />;
}

export default ApplicationFormPage;
