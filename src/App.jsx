import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ThemeEffect from './components/common/ThemeEffect';
import AuthGate from './components/common/AuthGate';
import RequireAuth from './components/common/RequireAuth';
import PageLoader from './components/common/PageLoader';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const LashMapPage = lazy(() => import('./pages/LashMapPage'));
const LashMaps = lazy(() => import('./pages/LashMaps'));
const Stock = lazy(() => import('./pages/Stock'));
const Finances = lazy(() => import('./pages/Finances'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Booking = lazy(() => import('./pages/Booking'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConfirmDeleteAccount = lazy(() => import('./pages/ConfirmDeleteAccount'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const DemoEntry = lazy(() => import('./pages/DemoEntry'));
const Guide = lazy(() => import('./pages/Guide'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));

export default function App() {
  return (
    <AuthGate>
      <ThemeEffect />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/reservation" element={<Booking />} />
          <Route path="/r/:ownerId" element={<Booking />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirmer-suppression" element={<ConfirmDeleteAccount />} />
          <Route path="/confidentialite" element={<Privacy />} />
          <Route path="/conditions" element={<Terms />} />
          <Route path="/demo" element={<DemoEntry />} />
          {/* Guide de style interne : délibérément hors de toute navigation (barre latérale,
              BottomNav, page publique de réservation). On y accède par l'URL seule. */}
          <Route path="/design-system" element={<DesignSystem />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/clientes/:id/lash-map/:mapId" element={<LashMapPage />} />
              <Route path="/lash-map" element={<LashMaps />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/parametres" element={<Settings />} />
              <Route path="/guide" element={<Guide />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthGate>
  );
}
