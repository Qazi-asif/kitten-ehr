import { useNavigate, useParams } from 'react-router-dom';
import KittenDetailPanel from '../components/admin/KittenDetailPanel';

function KittenDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const kittenId = Number.parseInt(id, 10);

  if (!Number.isInteger(kittenId) || kittenId <= 0) {
    return <p className="text-slate-500">Invalid kitten ID.</p>;
  }

  return (
    <KittenDetailPanel
      kittenId={kittenId}
      onKittenDeleted={() => navigate('/admin/kittens')}
    />
  );
}

export default KittenDetailPage;
