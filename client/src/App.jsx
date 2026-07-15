import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PortalProtectedRoute from './components/PortalProtectedRoute';
import AdminLayout from './components/layouts/AdminLayout';
import PublicLayout from './components/layouts/PublicLayout';
import LoginPage from './pages/LoginPage';

const PortalLoginPage = lazy(() => import('./pages/portal/PortalLoginPage'));
const PortalSetPasswordPage = lazy(() => import('./pages/portal/PortalSetPasswordPage'));
const PortalHomePage = lazy(() => import('./pages/portal/PortalHomePage'));
const PortalPlacementsPage = lazy(() => import('./pages/portal/PortalPlacementsPage'));
const PortalDocumentsPage = lazy(() => import('./pages/portal/PortalDocumentsPage'));

const FosterDetailPage = lazy(() => import('./pages/FosterDetailPage'));
const FosterListPage = lazy(() => import('./pages/FosterListPage'));
const KittenDetailPage = lazy(() => import('./pages/KittenDetailPage'));
const KittenListPage = lazy(() => import('./pages/KittenListPage'));
const LitterDetailPage = lazy(() => import('./pages/LitterDetailPage'));
const LitterListPage = lazy(() => import('./pages/LitterListPage'));
const ApplicationsPage = lazy(() => import('./pages/admin/ApplicationsPage'));
const CalendarPage = lazy(() => import('./pages/admin/CalendarPage'));
const ContentManagerPage = lazy(() => import('./pages/admin/ContentManagerPage'));
const ContractsPage = lazy(() => import('./pages/admin/ContractsPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const FinancePage = lazy(() => import('./pages/admin/FinancePage'));
const OnboardingPage = lazy(() => import('./pages/admin/OnboardingPage'));
const ProtocolLibrary = lazy(() => import('./pages/admin/ProtocolLibrary'));
const MarketingPage = lazy(() => import('./pages/admin/MarketingPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const EmailTemplatesPage = lazy(() => import('./pages/admin/EmailTemplatesPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const AdoptionFormPage = lazy(() => import('./pages/public/AdoptionFormPage'));
const AdoptionProcessPage = lazy(() => import('./pages/public/AdoptionProcessPage'));
const ArticlePage = lazy(() => import('./pages/public/ArticlePage'));
const AvailableKittensPage = lazy(() => import('./pages/public/AvailableKittensPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const DonatePage = lazy(() => import('./pages/public/DonatePage'));
const EducationHubPage = lazy(() => import('./pages/public/EducationHubPage'));
const EventsPage = lazy(() => import('./pages/public/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/public/EventDetailPage'));
const FosterPage = lazy(() => import('./pages/public/FosterPage'));
const FosterFormPage = lazy(() => import('./pages/public/FosterFormPage'));
const HomePage = lazy(() => import('./pages/public/HomePage'));
const PublicKittenProfile = lazy(() => import('./pages/public/PublicKittenProfile'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
      Loading...
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/portal/login" element={<PortalLoginPage />} />
            <Route path="/portal/set-password" element={<PortalSetPasswordPage />} />
            <Route element={<PortalProtectedRoute />}>
              <Route path="/portal" element={<PortalHomePage />} />
              <Route path="/portal/placements" element={<PortalPlacementsPage />} />
              <Route path="/portal/documents" element={<PortalDocumentsPage />} />
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/kittens" element={<AvailableKittensPage />} />
              <Route path="/kittens/:id" element={<PublicKittenProfile />} />
              <Route path="/adopt" element={<AdoptionProcessPage />} />
              <Route path="/adopt/apply" element={<AdoptionFormPage />} />
              <Route path="/foster" element={<FosterFormPage />} />
              <Route path="/get-involved" element={<FosterPage />} />
              <Route path="/education" element={<EducationHubPage />} />
              <Route path="/education/:slug" element={<ArticlePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:slug" element={<EventDetailPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="kittens" element={<KittenListPage />} />
                <Route path="kittens/:id" element={<KittenDetailPage />} />
                <Route path="fosters" element={<FosterListPage />} />
                <Route path="fosters/:id" element={<FosterDetailPage />} />
                <Route path="litters" element={<LitterListPage />} />
                <Route path="litters/:id" element={<LitterDetailPage />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route element={<ProtectedRoute permission="events.view" />}>
                  <Route path="marketing" element={<MarketingPage />} />
                </Route>
                <Route element={<ProtectedRoute permission="content.view" />}>
                  <Route path="content" element={<ContentManagerPage />} />
                </Route>
                <Route element={<ProtectedRoute permission="medical.view" />}>
                  <Route path="protocols" element={<ProtocolLibrary />} />
                </Route>
                <Route element={<ProtectedRoute permission="donations.view" />}>
                  <Route path="finance" element={<FinancePage />} />
                  <Route path="donations" element={<FinancePage />} />
                </Route>
                <Route path="settings" element={<SettingsPage />} />
                <Route path="emails" element={<EmailTemplatesPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
