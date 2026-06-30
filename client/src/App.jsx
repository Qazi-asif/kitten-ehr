import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layouts/AdminLayout';
import PublicLayout from './components/layouts/PublicLayout';
import FosterDetailPage from './pages/FosterDetailPage';
import FosterListPage from './pages/FosterListPage';
import KittenDetailPage from './pages/KittenDetailPage';
import KittensPage from './pages/KittenListPage';
import LitterDetailPage from './pages/LitterDetailPage';
import LitterListPage from './pages/LitterListPage';
import LoginPage from './pages/LoginPage';
import ApplicationsPage from './pages/admin/ApplicationsPage';
import CalendarPage from './pages/admin/CalendarPage';
import DashboardPage from './pages/admin/DashboardPage';
import FinancePage from './pages/admin/FinancePage';
import SettingsPage from './pages/admin/SettingsPage';
import AboutPage from './pages/public/AboutPage';
import AdoptionFormPage from './pages/public/AdoptionFormPage';
import ArticlePage from './pages/public/ArticlePage';
import AvailableKittensPage from './pages/public/AvailableKittensPage';
import ContactPage from './pages/public/ContactPage';
import DonatePage from './pages/public/DonatePage';
import EducationHubPage from './pages/public/EducationHubPage';
import EventsPage from './pages/public/EventsPage';
import FosterFormPage from './pages/public/FosterFormPage';
import GetInvolvedPage from './pages/public/GetInvolvedPage';
import HomePage from './pages/public/HomePage';
import PublicKittenProfile from './pages/public/PublicKittenProfile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/kittens" element={<AvailableKittensPage />} />
            <Route path="/kittens/:id" element={<PublicKittenProfile />} />
            <Route path="/adopt" element={<AdoptionFormPage />} />
            <Route path="/foster" element={<FosterFormPage />} />
            <Route path="/get-involved" element={<GetInvolvedPage />} />
            <Route path="/education" element={<EducationHubPage />} />
            <Route path="/education/:slug" element={<ArticlePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="kittens" element={<KittensPage />} />
              <Route path="kittens/:id" element={<KittenDetailPage />} />
              <Route path="fosters" element={<FosterListPage />} />
              <Route path="fosters/:id" element={<FosterDetailPage />} />
              <Route path="litters" element={<LitterListPage />} />
              <Route path="litters/:id" element={<LitterDetailPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route element={<ProtectedRoute permission="donations.view" />}>
                <Route path="finance" element={<FinancePage />} />
                <Route path="donations" element={<FinancePage />} />
              </Route>
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
