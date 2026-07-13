import { Link } from 'react-router-dom';
import { FileText, PawPrint } from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { getStoredPortalUser } from '../../services/portalAuthApi';

// Light hub linking to the real portal pages (placements, documents) -
// replaces the earlier "coming soon" placeholder now that those pages exist.
function PortalHomePage() {
  const user = getStoredPortalUser();

  return (
    <div className="flex min-h-screen flex-col bg-brand-muted">
      <PortalNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-2 text-sm text-slate-500">What would you like to do?</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/portal/placements"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
              <PawPrint className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">My Placements</p>
              <p className="mt-1 text-sm text-slate-500">See kittens currently and previously in your care.</p>
            </div>
          </Link>

          <Link
            to="/portal/documents"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Documents</p>
              <p className="mt-1 text-sm text-slate-500">Upload photos or records for kittens you're fostering now.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default PortalHomePage;
