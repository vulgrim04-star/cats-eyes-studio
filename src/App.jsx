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
const Stock = lazy(() => import('./pages/Stock'));
const Finances = lazy(() => import('./pages/Finances'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Settings = lazy(() => import('./pages/Settings'));
const Booking = lazy(() => import('./pages/Booking'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConfirmDeleteAccount = lazy(() => import('./pages/ConfirmDeleteAccount'));

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
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/parametres" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthGate>
  );
}
